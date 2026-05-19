import { eq } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import { generateQuestionFromPrompt, embed, cosineSimilarity } from '../ai/client.js';
import type { CandidateQuestion } from '../ai/parser.js';

// 单道 candidate 入库 (跟 routes/questions.ts createQuestion 路径一致)
// 这里直接写 questions 表 + embedding, 不走 HTTP, 减少耗时
async function persistOne(
  profileId: string,
  _userId: string,
  candidate: CandidateQuestion,
  chapter?: string,
): Promise<string> {
  const CHAPTER_PREFIX = '章节:';
  const tags = chapter && chapter.trim()
    ? [...(candidate.tags || []), CHAPTER_PREFIX + chapter.trim()]
    : candidate.tags || [];

  // embedding (查重用), 失败容错 (不阻塞入库)
  let embeddingVec: number[] | null = null;
  try {
    const [vec] = await embed([candidate.stem]);
    if (vec) embeddingVec = vec;
  } catch (e) {
    console.warn('[ai-gen] embedding failed (continuing):', e);
  }

  const [row] = await db
    .insert(schema.questions)
    .values({
      profileId,
      stem: candidate.stem,
      options: candidate.options,
      answer: candidate.answer,
      explanation: candidate.explanation ?? null,
      tags,
      difficulty: candidate.difficulty,
      source: 'ai_gen',
      embedding: embeddingVec,
    })
    .returning({ id: schema.questions.id });
  return row.id;
}

export type AiGenParams = {
  knowledge: string;
  chapter?: string;
  topics?: string;
  difficulty: number;
};

/**
 * AI 批量出题 worker: 串行调 count 次 generateQuestionFromPrompt,
 * 每出一道立刻入库 + update job.candidates, 实时可见进度.
 * 单道失败不中断, 整批继续.
 */
export async function processAiGenJob(jobId: string): Promise<void> {
  const [job] = await db
    .select()
    .from(schema.importJobs)
    .where(eq(schema.importJobs.id, jobId));
  if (!job) return;
  if (job.kind !== 'ai_gen') return;
  if (job.status !== 'pending' && job.status !== 'running') return;

  const params = job.params as AiGenParams | null;
  if (!params || !params.knowledge) {
    await db
      .update(schema.importJobs)
      .set({ status: 'failed', error: 'missing_params', finishedAt: new Date() })
      .where(eq(schema.importJobs.id, jobId));
    return;
  }

  const total = job.totalChunks; // 复用为 count
  const startIndex = job.doneChunks ?? 0;
  const candidates: CandidateQuestion[] = ((job.candidates ?? []) as CandidateQuestion[]).slice();
  const generatedStems: string[] = candidates.map((c) => c.stem);

  await db
    .update(schema.importJobs)
    .set({ status: 'running', startedAt: job.startedAt ?? new Date() })
    .where(eq(schema.importJobs.id, jobId));

  let failed = 0;
  try {
    for (let i = startIndex; i < total; i++) {
      // 每轮重读 job 看是否被取消 (DELETE 端点会改 status 或者 cancelJob 触发)
      const [cur] = await db
        .select({ status: schema.importJobs.status })
        .from(schema.importJobs)
        .where(eq(schema.importJobs.id, jobId));
      if (!cur || (cur.status !== 'running' && cur.status !== 'pending')) {
        console.log(`[ai-gen ${jobId.slice(0, 8)}] aborted by external (status=${cur?.status})`);
        return;
      }

      const t0 = Date.now();
      try {
        const candidate = await generateQuestionFromPrompt(
          params.knowledge,
          params.difficulty,
          params.chapter,
          params.topics,
          undefined, // textbookReference 暂不传 (worker 内不查 RAG, 避免额外开销)
          generatedStems.length > 0 ? generatedStems : undefined,
        );
        await persistOne(job.profileId, job.userId, candidate, params.chapter);
        candidates.push(candidate);
        generatedStems.push(candidate.stem);
        console.log(
          `[ai-gen ${jobId.slice(0, 8)}] ${i + 1}/${total}: ${(Date.now() - t0)}ms · "${candidate.stem.slice(0, 30)}..."`,
        );
      } catch (e) {
        failed++;
        console.warn(`[ai-gen ${jobId.slice(0, 8)}] ${i + 1}/${total} failed:`, String(e).slice(0, 200));
      }
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
      .set({
        status: 'completed',
        finishedAt: new Date(),
        error: failed > 0 ? `${failed} 道生成失败` : null,
      })
      .where(eq(schema.importJobs.id, jobId));
  } catch (e) {
    console.error(`[ai-gen ${jobId.slice(0, 8)}] crashed:`, e);
    await db
      .update(schema.importJobs)
      .set({
        status: 'failed',
        error: String(e).slice(0, 500),
        finishedAt: new Date(),
        candidates: candidates as unknown[],
      })
      .where(eq(schema.importJobs.id, jobId));
  }
}
// embed/cosineSimilarity 引入是为了将来扩展查重 (现在 worker 跳过查重提升速度)
void cosineSimilarity;
