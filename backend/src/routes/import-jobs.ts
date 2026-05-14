import { Hono } from 'hono';
import { z } from 'zod';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import type { AuthVars } from '../middleware/auth.js';
import { chunkPdfText } from '../lib/pdf-chunker.js';
import {
  processPdfImportJob,
  registerJobChunks,
  cancelJob,
} from '../lib/import-worker.js';
import { candidateArraySchema } from '../ai/parser.js';
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
  console.log(
    `[import-jobs] new pdf: ${file.name} · ${(file.size / 1024 / 1024).toFixed(1)}MB · ${text.length} chars → ${chunks.length} chunks`,
  );

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

  // exclude the candidates jsonb — it can be megabytes for a fully
  // recognized PDF, and list views only need metadata + count
  const rows = await db
    .select({
      id: schema.importJobs.id,
      status: schema.importJobs.status,
      kind: schema.importJobs.kind,
      filename: schema.importJobs.filename,
      totalChunks: schema.importJobs.totalChunks,
      doneChunks: schema.importJobs.doneChunks,
      candidatesCount: sql<number>`coalesce(jsonb_array_length(${schema.importJobs.candidates}), 0)::int`,
      error: schema.importJobs.error,
      createdAt: schema.importJobs.createdAt,
      startedAt: schema.importJobs.startedAt,
      finishedAt: schema.importJobs.finishedAt,
    })
    .from(schema.importJobs)
    .where(
      and(
        eq(schema.importJobs.profileId, pid),
        inArray(schema.importJobs.status, filter as S[]),
      ),
    )
    .orderBy(desc(schema.importJobs.createdAt));

  return c.json({ jobs: rows });
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

router.patch('/profiles/:pid/import-jobs/:jid', async (c) => {
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
  // only allow editing candidates for terminal jobs (avoid races with worker)
  if (row.status !== 'completed' && row.status !== 'failed') {
    return c.json({ error: 'job_not_terminal', status: row.status }, 409);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = z.object({ candidates: candidateArraySchema }).safeParse(body);
  if (!parsed.success) return c.json({ error: 'invalid_body' }, 400);

  const [updated] = await db
    .update(schema.importJobs)
    .set({ candidates: parsed.data.candidates as unknown[] })
    .where(eq(schema.importJobs.id, jid))
    .returning();

  // empty queue: drop the row so it stops cluttering profile detail
  if (parsed.data.candidates.length === 0) {
    await db.delete(schema.importJobs).where(eq(schema.importJobs.id, jid));
    return c.json({ ...serializeJob(updated), deleted: true });
  }

  return c.json(serializeJob(updated));
});

router.delete('/profiles/:pid/import-jobs/:jid', async (c) => {
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

  if (row.status === 'pending' || row.status === 'running') {
    // signal worker; worker will flip status to failed('cancelled') on its
    // next chunk boundary. Don't flip status here to avoid races.
    cancelJob(jid);
    return c.json({ ok: true, signaled: true });
  }
  // already terminal: just delete the row
  await db.delete(schema.importJobs).where(eq(schema.importJobs.id, jid));
  return c.json({ ok: true, deleted: true });
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
