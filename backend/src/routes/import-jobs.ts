import { Hono } from 'hono';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import type { AuthVars } from '../middleware/auth.js';
import { chunkPdfText } from '../lib/pdf-chunker.js';
import {
  processPdfImportJob,
  registerJobChunks,
} from '../lib/import-worker.js';
// pdf-parse has no types; runtime import OK
// @ts-expect-error pdf-parse has no types
import pdfParse from 'pdf-parse';

const router = new Hono<{ Variables: AuthVars }>();

async function ownProfile(profileId: string, userId: string) {
  const [row] = await db
    .select({ id: schema.profiles.id, userId: schema.profiles.userId })
    .from(schema.profiles)
    .where(eq(schema.profiles.id, profileId))
    .limit(1);
  return row && row.userId === userId;
}

router.post('/profiles/:pid/import-jobs', async (c) => {
  const userId = c.get('userId');
  const pid = c.req.param('pid');
  if (!(await ownProfile(pid, userId))) return c.json({ error: 'not_found' }, 404);

  // reject if a job for this profile is already pending/running
  const inflight = await db
    .select({ id: schema.importJobs.id })
    .from(schema.importJobs)
    .where(
      and(
        eq(schema.importJobs.profileId, pid),
        inArray(schema.importJobs.status, ['pending', 'running'] as const),
      ),
    )
    .limit(1);
  if (inflight.length > 0) {
    return c.json({ error: 'job_in_progress', jobId: inflight[0].id }, 409);
  }

  const form = await c.req.formData().catch(() => null);
  const file = form?.get('pdf');
  if (!file || !(file instanceof File)) return c.json({ error: 'pdf_missing' }, 400);
  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    return c.json({ error: 'not_a_pdf' }, 400);
  }
  if (file.size > 20 * 1024 * 1024) return c.json({ error: 'pdf_too_large' }, 400);

  const buf = Buffer.from(await file.arrayBuffer());

  let text = '';
  try {
    const result = await pdfParse(buf);
    text = (result.text ?? '').trim();
  } catch (e) {
    return c.json({ error: 'pdf_parse_failed', detail: String(e) }, 400);
  }
  if (text.length < 10) return c.json({ error: 'pdf_no_text' }, 400);

  const chunks = chunkPdfText(text);
  if (chunks.length === 0) return c.json({ error: 'pdf_no_text' }, 400);

  const [job] = await db
    .insert(schema.importJobs)
    .values({
      profileId: pid,
      userId,
      kind: 'pdf',
      status: 'pending',
      filename: file.name,
      totalChunks: chunks.length,
      doneChunks: 0,
      candidates: [],
    })
    .returning({ id: schema.importJobs.id, totalChunks: schema.importJobs.totalChunks });

  registerJobChunks(job.id, chunks);
  setImmediate(() => {
    processPdfImportJob(job.id).catch((e) => {
      // best-effort: worker already writes failed status on caught errors;
      // this catches truly uncaught issues so the process doesn't crash
      console.error('[import-jobs] uncaught worker error', job.id, e);
    });
  });

  return c.json({ jobId: job.id, totalChunks: job.totalChunks }, 201);
});

router.get('/profiles/:pid/import-jobs', async (c) => {
  const userId = c.get('userId');
  const pid = c.req.param('pid');
  if (!(await ownProfile(pid, userId))) return c.json({ error: 'not_found' }, 404);

  const statusParam = c.req.query('status');
  const allowed = ['pending', 'running', 'completed', 'failed'] as const;
  type S = (typeof allowed)[number];
  const filter = statusParam
    ? (statusParam.split(',').filter((s) => (allowed as readonly string[]).includes(s)) as S[])
    : (allowed as readonly S[]).slice();

  const rows = await db
    .select()
    .from(schema.importJobs)
    .where(
      and(
        eq(schema.importJobs.profileId, pid),
        inArray(schema.importJobs.status, filter as S[]),
      ),
    )
    .orderBy(desc(schema.importJobs.createdAt));

  return c.json({ jobs: rows.map(serializeJob) });
});

router.get('/profiles/:pid/import-jobs/:jid', async (c) => {
  const userId = c.get('userId');
  const pid = c.req.param('pid');
  const jid = c.req.param('jid');
  if (!(await ownProfile(pid, userId))) return c.json({ error: 'not_found' }, 404);

  const [row] = await db
    .select()
    .from(schema.importJobs)
    .where(eq(schema.importJobs.id, jid))
    .limit(1);
  if (!row || row.profileId !== pid) return c.json({ error: 'not_found' }, 404);

  return c.json(serializeJob(row));
});

function serializeJob(row: typeof schema.importJobs.$inferSelect) {
  return {
    id: row.id,
    status: row.status,
    kind: row.kind,
    filename: row.filename,
    totalChunks: row.totalChunks,
    doneChunks: row.doneChunks,
    candidates: row.candidates,
    error: row.error,
    createdAt: row.createdAt,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
  };
}

export { router as importJobsRouter };
