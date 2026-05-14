import { eq, sql } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import { structureQuestionsFromPdfText } from '../ai/client.js';
import type { CandidateQuestion } from '../ai/parser.js';

/**
 * Holds the chunk array for each in-flight job. Not persisted —
 * worker only runs in the process that created the job. On restart,
 * pending/running rows are flipped to failed by self-heal in index.ts.
 */
const chunksByJobId = new Map<string, string[]>();
const cancelledJobs = new Set<string>();

export function registerJobChunks(jobId: string, chunks: string[]) {
  chunksByJobId.set(jobId, chunks);
}

export function cancelJob(jobId: string) {
  cancelledJobs.add(jobId);
}

/**
 * Run a PDF import job: iterate chunks, call qwen-max per chunk,
 * accumulate candidates, mark completed/failed. Already-recognized
 * candidates are preserved even on failure (UX: user can use partial).
 */
export async function processPdfImportJob(jobId: string): Promise<void> {
  const chunks = chunksByJobId.get(jobId);
  if (!chunks) {
    await markFailed(jobId, 'chunks_missing');
    return;
  }

  await db
    .update(schema.importJobs)
    .set({ status: 'running', startedAt: new Date() })
    .where(eq(schema.importJobs.id, jobId));

  const candidates: CandidateQuestion[] = [];
  try {
    for (let i = 0; i < chunks.length; i++) {
      if (cancelledJobs.has(jobId)) {
        await db
          .update(schema.importJobs)
          .set({
            status: 'failed',
            error: 'cancelled',
            finishedAt: new Date(),
            candidates: candidates as unknown[],
          })
          .where(eq(schema.importJobs.id, jobId));
        return;
      }
      const chunk = chunks[i];
      const part = await structureQuestionsFromPdfText(chunk);
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
    await db
      .update(schema.importJobs)
      .set({
        status: 'failed',
        error: String(e),
        finishedAt: new Date(),
        candidates: candidates as unknown[],
      })
      .where(eq(schema.importJobs.id, jobId));
  } finally {
    chunksByJobId.delete(jobId);
    cancelledJobs.delete(jobId);
  }
}

async function markFailed(jobId: string, reason: string) {
  await db
    .update(schema.importJobs)
    .set({ status: 'failed', error: reason, finishedAt: new Date() })
    .where(eq(schema.importJobs.id, jobId));
}

/**
 * On boot, flip any pending/running rows to failed — the process that
 * owned them is gone. Called from index.ts.
 */
export async function selfHealOnBoot(): Promise<number> {
  const r = await db
    .update(schema.importJobs)
    .set({ status: 'failed', error: 'server_restart', finishedAt: new Date() })
    .where(sql`${schema.importJobs.status} in ('pending', 'running')`)
    .returning({ id: schema.importJobs.id });
  return r.length;
}
