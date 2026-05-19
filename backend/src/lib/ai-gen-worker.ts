import { and, eq } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import { generateQuestionFromPrompt, embed, cosineSimilarity } from '../ai/client.js';
import type { CandidateQuestion } from '../ai/parser.js';

const SIMILARITY_THRESHOLD = 0.85;

// 入库前查重: embed 新题 → 跟同 profile 已存题做余弦相似度
// 相似度 ≥ 0.85 视为重复, 跳过入库, 返回 null
async function persistOne(
  profileId: string,
  candidate: CandidateQuestion,
  chapter?: string,
): Promise<{ id: string; skipped?: never } | { id?: never; skipped: 'duplicate' | 'error' }> {
  const CHAPTER_PREFIX = '章节:';
  const tags = chapter && chapter.trim()
    ? [...(candidate.tags || []), CHAPTER_PREFIX + chapter.trim()]
    : candidate.tags || [];

  // 算 embedding
  let embeddingVec: number[] | null = null;
  try {
    const [vec] = await embed([candidate.stem]);
    if (vec) embeddingVec = vec;
  } catch (e) {
    console.warn('[ai-gen] embedding failed:', e);
  }

  // 查重: 跟同 profile 已存题比对
  if (embeddingVec) {
    const others = await db
      .select({ stem: schema.questions.stem, embedding: schema.questions.embedding })
      .from(schema.questions)
      .where(eq(schema.questions.profileId, profileId));
    for (const o of others) {
      if (!o.embedding) continue;
      const sim = cosineSimilarity(embeddingVec, o.embedding);
      if (sim >= SIMILARITY_THRESHOLD) {
        console.log(
          `[ai-gen] dup detected sim=${sim.toFixed(3)}: "${candidate.stem.slice(0, 30)}..." ≈ "${o.stem.slice(0, 30)}..."`,
        );
        return { skipped: 'duplicate' };
      }
    }
  }

  try {
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
    return { id: row.id };
  } catch (e) {
    console.error('[ai-gen] insert failed:', e);
    return { skipped: 'error' };
  }
}
void and; // 保留以便扩展更复杂查询

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
  const candidates: CandidateQuestion[] = ((job.candidates ?? []) as CandidateQuestion[]).slice();
  const generatedStems: string[] = candidates.map((c) => c.stem);

  await db
    .update(schema.importJobs)
    .set({ status: 'running', startedAt: job.startedAt ?? new Date() })
    .where(eq(schema.importJobs.id, jobId));

  let failed = 0;
  let duplicates = 0;
  // 重试上限: 防止 LLM 一直出重复浪费 token. count 3 倍是软上限.
  const MAX_ATTEMPTS = Math.max(total * 3, 10);
  let attempts = 0;
  try {
    while (candidates.length < total && attempts < MAX_ATTEMPTS) {
      attempts++;
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
          undefined,
          generatedStems.length > 0 ? generatedStems : undefined,
        );
        const result = await persistOne(job.profileId, candidate, params.chapter);
        if ('id' in result) {
          candidates.push(candidate);
          generatedStems.push(candidate.stem);
          console.log(
            `[ai-gen ${jobId.slice(0, 8)}] ${candidates.length}/${total}: ${(Date.now() - t0)}ms · "${candidate.stem.slice(0, 30)}..."`,
          );
        } else if (result.skipped === 'duplicate') {
          duplicates++;
          generatedStems.push(candidate.stem); // 加进去防止下次又出同一道
          console.log(
            `[ai-gen ${jobId.slice(0, 8)}] dup #${duplicates} (题库已有相似题), retry`,
          );
        } else {
          failed++;
        }
      } catch (e) {
        failed++;
        console.warn(`[ai-gen ${jobId.slice(0, 8)}] LLM call failed:`, String(e).slice(0, 200));
      }
      await db
        .update(schema.importJobs)
        .set({
          doneChunks: candidates.length,
          candidates: candidates as unknown[],
        })
        .where(eq(schema.importJobs.id, jobId));
    }
    const reachedTarget = candidates.length >= total;
    const errorNote = !reachedTarget
      ? `LLM 重复率高, 实际生成 ${candidates.length}/${total} 道 (重复跳过 ${duplicates}, 失败 ${failed})`
      : duplicates + failed > 0
        ? `生成 ${candidates.length} 道 (跳过重复 ${duplicates}, 失败 ${failed})`
        : null;
    await db
      .update(schema.importJobs)
      .set({
        status: 'completed',
        finishedAt: new Date(),
        error: errorNote,
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
