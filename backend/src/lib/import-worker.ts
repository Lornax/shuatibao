import { eq, sql } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import { structureQuestionsFromPdfText } from '../ai/client.js';
import type { CandidateQuestion } from '../ai/parser.js';

// 进程内 aborters: cancelJob 用. 进程重启会清空, 重启后 worker 会注册新的
const abortersByJobId = new Map<string, AbortController>();

export function cancelJob(jobId: string) {
  abortersByJobId.get(jobId)?.abort();
}

/**
 * 跑一个 PDF 导入任务. 状态 / chunks / candidates 全在 db, 不依赖内存,
 * 进程重启后通过 selfHealOnBoot 重新调用即可从 doneChunks 续传.
 */
export async function processPdfImportJob(jobId: string): Promise<void> {
  const [job] = await db
    .select()
    .from(schema.importJobs)
    .where(eq(schema.importJobs.id, jobId));
  if (!job) return;
  if (job.status !== 'pending' && job.status !== 'running') return;

  const chunks = job.chunks as string[];
  if (!chunks || chunks.length === 0) {
    await markFailed(jobId, 'chunks_missing');
    return;
  }

  const startIndex = job.doneChunks ?? 0;
  const candidates: CandidateQuestion[] = ((job.candidates ?? []) as CandidateQuestion[]).slice();

  await db
    .update(schema.importJobs)
    .set({ status: 'running', startedAt: job.startedAt ?? new Date() })
    .where(eq(schema.importJobs.id, jobId));

  const abortCtl = new AbortController();
  abortersByJobId.set(jobId, abortCtl);

  if (startIndex > 0) {
    console.log(
      `[import-jobs ${jobId.slice(0, 8)}] resume from chunk ${startIndex + 1}/${chunks.length} (${candidates.length} candidates so far)`,
    );
  }

  try {
    for (let i = startIndex; i < chunks.length; i++) {
      const chunk = chunks[i];
      const t0 = Date.now();
      const part = await structureQuestionsFromPdfText(chunk, { signal: abortCtl.signal });
      const dt = Date.now() - t0;
      console.log(
        `[import-jobs ${jobId.slice(0, 8)}] chunk ${i + 1}/${chunks.length}: ${chunk.length} chars → ${part.length} items (${dt}ms)`,
      );
      candidates.push(...part);
      await db
        .update(schema.importJobs)
        .set({
          doneChunks: i + 1,
          candidates: candidates as unknown[],
        })
        .where(eq(schema.importJobs.id, jobId));
    }
    await db
      .update(schema.importJobs)
      .set({ status: 'completed', finishedAt: new Date() })
      .where(eq(schema.importJobs.id, jobId));
  } catch (e) {
    const isAbort = abortCtl.signal.aborted;
    await db
      .update(schema.importJobs)
      .set({
        status: 'failed',
        error: isAbort ? 'cancelled' : String(e),
        finishedAt: new Date(),
        candidates: candidates as unknown[],
      })
      .where(eq(schema.importJobs.id, jobId));
  } finally {
    abortersByJobId.delete(jobId);
  }
}

async function markFailed(jobId: string, reason: string) {
  await db
    .update(schema.importJobs)
    .set({ status: 'failed', error: reason, finishedAt: new Date() })
    .where(eq(schema.importJobs.id, jobId));
}

/**
 * 启动时把所有 pending/running 的 jobs 重新调度 (断点续传).
 * 取消旧的 "标 failed" 策略 — worker 全部读 db, 重启天然安全.
 */
export async function selfHealOnBoot(): Promise<number> {
  const stale = await db
    .select({ id: schema.importJobs.id, doneChunks: schema.importJobs.doneChunks, totalChunks: schema.importJobs.totalChunks })
    .from(schema.importJobs)
    .where(sql`${schema.importJobs.status} in ('pending', 'running')`);
  for (const row of stale) {
    console.log(
      `[import-jobs ${row.id.slice(0, 8)}] self-heal resume @ ${row.doneChunks}/${row.totalChunks}`,
    );
    setImmediate(() => {
      processPdfImportJob(row.id).catch((e) =>
        console.error('[import-jobs] resumed worker crashed', row.id, e),
      );
    });
  }
  return stale.length;
}
