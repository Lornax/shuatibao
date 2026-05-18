import { createHash } from 'node:crypto';
import { Hono } from 'hono';
import { z } from 'zod';
import { and, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import type { AuthVars } from '../middleware/auth.js';
import { chunkPdfText } from '../lib/pdf-chunker.js';
import { processPdfImportJob, cancelJob } from '../lib/import-worker.js';
import { candidateArraySchema } from '../ai/parser.js';
import { getSignedUrl, isCosEnabled, uploadPdfToCOS } from '../lib/cos.js';
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

  // 内容 hash: 同 userId + 同 hash + 有 candidates 的旧 job 直接复用, 不调 LLM
  // 不再限 status='completed', 因为很多 job 是 cancelled (用户审完取消) 仍含全部 candidates
  // 排序: candidates 数最多优先 (拿最完整的), 同等数量按时间倒序
  const contentHash = createHash('sha256').update(buf).digest('hex');
  const [cached] = await db
    .select()
    .from(schema.importJobs)
    .where(
      and(
        eq(schema.importJobs.userId, userId),
        eq(schema.importJobs.contentHash, contentHash),
        isNotNull(schema.importJobs.contentHash),
        sql`jsonb_array_length(${schema.importJobs.candidates}) > 0`,
      ),
    )
    .orderBy(
      sql`jsonb_array_length(${schema.importJobs.candidates}) DESC`,
      desc(schema.importJobs.createdAt),
    )
    .limit(1);
  if (cached && Array.isArray(cached.candidates) && cached.candidates.length > 0) {
    // 命中: 复制 candidates 到本档案的新 job, 状态直接 completed
    let cosUrl: string | null = null;
    if (isCosEnabled()) {
      try {
        cosUrl = await uploadPdfToCOS(buf, file.name);
      } catch (e) {
        console.error('[import-jobs] COS upload failed (continuing):', e);
      }
    }
    const now = new Date();
    const [job] = await db
      .insert(schema.importJobs)
      .values({
        profileId: pid,
        userId,
        kind: 'pdf',
        status: 'completed',
        filename: file.name,
        totalChunks: cached.totalChunks,
        doneChunks: cached.totalChunks,
        fileSize: file.size,
        contentHash,
        chunks: [] as string[], // 不需要重新跑, 不存 chunks 省空间
        candidates: cached.candidates,
        cosUrl,
        startedAt: now,
        finishedAt: now,
      })
      .returning({ id: schema.importJobs.id });
    console.log(
      `[import-jobs ${job.id.slice(0, 8)}] cache hit: hash=${contentHash.slice(0, 8)} reused ${cached.candidates.length} candidates from ${cached.id.slice(0, 8)}`,
    );
    return c.json(
      {
        jobId: job.id,
        totalChunks: cached.totalChunks,
        fromCache: true,
        candidatesCount: cached.candidates.length,
      },
      201,
    );
  }

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
    `[import-jobs] new pdf: ${file.name} · ${(file.size / 1024 / 1024).toFixed(1)}MB · hash=${contentHash.slice(0, 8)} · ${text.length} chars → ${chunks.length} chunks`,
  );

  // upload original PDF to COS so the user can download/preview later.
  // Best-effort: if COS isn't configured or upload fails, we still proceed
  // — the import-job functionality doesn't depend on having an archive.
  let cosUrl: string | null = null;
  if (isCosEnabled()) {
    try {
      cosUrl = await uploadPdfToCOS(buf, file.name);
      console.log(`[import-jobs] uploaded original PDF to COS: ${cosUrl}`);
    } catch (e) {
      console.error('[import-jobs] COS upload failed (continuing):', e);
    }
  }

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
      fileSize: file.size,
      contentHash,
      chunks,
      candidates: [],
      cosUrl,
    })
    .returning({ id: schema.importJobs.id, totalChunks: schema.importJobs.totalChunks });

  setImmediate(() => {
    processPdfImportJob(job.id).catch((e) => {
      // best-effort: worker already writes failed status on caught errors;
      // this catches truly uncaught issues so the process doesn't crash
      console.error('[import-jobs] uncaught worker error', job.id, e);
    });
  });

  return c.json({ jobId: job.id, totalChunks: job.totalChunks }, 201);
});

// 上传前查重: 同档案 + 同 filename + 同 size 是否有已结束的 job
// 返回最近一条; 用于客户端决策"复用现有 / 继续识别 / 重新识别"
router.get('/profiles/:pid/import-jobs/match', async (c) => {
  const userId = c.get('userId');
  const pid = c.req.param('pid');
  if (!(await ownProfile(pid, userId))) return c.json({ error: 'not_found' }, 404);

  const filename = c.req.query('filename') || '';
  const sizeStr = c.req.query('size') || '0';
  const size = Number(sizeStr);
  if (!filename || !Number.isFinite(size) || size <= 0) {
    return c.json({ match: null });
  }

  const [row] = await db
    .select({
      id: schema.importJobs.id,
      status: schema.importJobs.status,
      filename: schema.importJobs.filename,
      fileSize: schema.importJobs.fileSize,
      totalChunks: schema.importJobs.totalChunks,
      doneChunks: schema.importJobs.doneChunks,
      error: schema.importJobs.error,
      createdAt: schema.importJobs.createdAt,
      candidates: schema.importJobs.candidates,
    })
    .from(schema.importJobs)
    .where(
      and(
        eq(schema.importJobs.profileId, pid),
        eq(schema.importJobs.filename, filename),
        eq(schema.importJobs.fileSize, size),
        inArray(schema.importJobs.status, ['completed', 'failed'] as const),
      ),
    )
    .orderBy(desc(schema.importJobs.createdAt))
    .limit(1);

  if (!row) return c.json({ match: null });

  return c.json({
    match: {
      jobId: row.id,
      status: row.status,
      filename: row.filename,
      fileSize: row.fileSize,
      totalChunks: row.totalChunks,
      doneChunks: row.doneChunks,
      error: row.error,
      createdAt: row.createdAt,
      candidatesCount: Array.isArray(row.candidates) ? row.candidates.length : 0,
      // 是否可续传: failed 且有 chunks 未跑完
      canResume: row.status === 'failed' && row.doneChunks < row.totalChunks,
    },
  });
});

// 续传已 cancelled/failed 的 job: 状态改回 pending + 重新调度
router.post('/profiles/:pid/import-jobs/:jid/resume', async (c) => {
  const userId = c.get('userId');
  const pid = c.req.param('pid');
  const jid = c.req.param('jid');
  if (!(await ownProfile(pid, userId))) return c.json({ error: 'not_found' }, 404);

  // 守护: 同档案下不能同时有两个 in-flight job
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

  const [job] = await db
    .select()
    .from(schema.importJobs)
    .where(eq(schema.importJobs.id, jid))
    .limit(1);
  if (!job || job.profileId !== pid) return c.json({ error: 'not_found' }, 404);
  if (job.status !== 'failed') {
    return c.json({ error: 'not_resumable', status: job.status }, 400);
  }
  if (!Array.isArray(job.chunks) || job.chunks.length === 0) {
    return c.json({ error: 'no_chunks_to_resume' }, 400);
  }
  if (job.doneChunks >= job.totalChunks) {
    return c.json({ error: 'already_complete' }, 400);
  }

  await db
    .update(schema.importJobs)
    .set({ status: 'pending', error: null, finishedAt: null })
    .where(eq(schema.importJobs.id, jid));

  setImmediate(() => {
    processPdfImportJob(jid).catch((e) =>
      console.error('[import-jobs] resume worker crashed', jid, e),
    );
  });

  console.log(
    `[import-jobs ${jid.slice(0, 8)}] resumed @ ${job.doneChunks}/${job.totalChunks}`,
  );
  return c.json({ jobId: jid, resumedFrom: job.doneChunks, totalChunks: job.totalChunks });
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
      cosUrl: schema.importJobs.cosUrl,
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

  return c.json({
    jobs: rows.map(({ cosUrl, ...rest }) => ({
      ...rest,
      cosDownloadUrl: cosUrl ? getSignedUrl(cosUrl) : null,
    })),
  });
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
    cosDownloadUrl: row.cosUrl ? getSignedUrl(row.cosUrl) : null,
    createdAt: row.createdAt,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
  };
}

export { router as importJobsRouter };
