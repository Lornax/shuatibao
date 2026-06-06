import { eq, sql } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import { structureQuestionsFromPdfText, friendlyAIError } from '../ai/client.js';
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

  // 拉档案的 examName, 注入 prompt 让 LLM 按这个考试角度解题/写解析
  const [profileRow] = await db
    .select({ examName: schema.profiles.examName })
    .from(schema.profiles)
    .where(eq(schema.profiles.id, job.profileId))
    .limit(1);
  const examName = profileRow?.examName;

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

  // 早停: 跑完前 N 个 chunk 后, 如果 0 candidates, 判定不是题目 PDF, 立刻 abort
  // 节省 token + 给用户清晰反馈
  const EARLY_ABORT_AFTER_CHUNKS = 3;

  try {
    for (let i = startIndex; i < chunks.length; i++) {
      if (abortCtl.signal.aborted) throw new Error('cancelled');
      const chunk = chunks[i];
      const t0 = Date.now();
      const part = await structureQuestionsFromPdfText(chunk, { signal: abortCtl.signal, examName });
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

      if (abortCtl.signal.aborted) throw new Error('cancelled');

      // 仅首次跑时检查 (resume 时 startIndex > 0, 已知前面有 candidates 或用户已确认继续)
      if (startIndex === 0 && i + 1 >= EARLY_ABORT_AFTER_CHUNKS && candidates.length === 0) {
        console.log(
          `[import-jobs ${jobId.slice(0, 8)}] early abort: ${i + 1} chunks 0 candidates, not_a_quiz_pdf`,
        );
        await db
          .update(schema.importJobs)
          .set({
            status: 'failed',
            error: 'not_a_quiz_pdf',
            finishedAt: new Date(),
          })
          .where(eq(schema.importJobs.id, jobId));
        return;
      }
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
        error: isAbort ? 'cancelled' : friendlyAIError(e),
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
 * 按 kind 分发到对应 worker: pdf 走 processPdfImportJob, ai_gen 走 processAiGenJob.
 */
export async function selfHealOnBoot(): Promise<number> {
  // 动态 import 避免循环依赖 (ai-gen-worker 也可能 import 此文件)
  const { processAiGenJob } = await import('./ai-gen-worker.js');
  const stale = await db
    .select({
      id: schema.importJobs.id,
      kind: schema.importJobs.kind,
      doneChunks: schema.importJobs.doneChunks,
      totalChunks: schema.importJobs.totalChunks,
    })
    .from(schema.importJobs)
    .where(sql`${schema.importJobs.status} in ('pending', 'running')`);
  for (const row of stale) {
    console.log(
      `[${row.kind} ${row.id.slice(0, 8)}] self-heal resume @ ${row.doneChunks}/${row.totalChunks}`,
    );
    if (row.kind === 'ai_gen') {
      setImmediate(() => {
        processAiGenJob(row.id).catch((e) =>
          console.error('[ai-gen] resumed worker crashed', row.id, e),
        );
      });
    } else {
      // 默认 pdf (或其他 kind 暂时也走 pdf worker, 兼容老数据)
      setImmediate(() => {
        processPdfImportJob(row.id).catch((e) =>
          console.error('[import-jobs] resumed worker crashed', row.id, e),
        );
      });
    }
  }
  return stale.length;
}
