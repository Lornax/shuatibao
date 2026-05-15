import { eq } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import { cosineSimilarity, embed } from '../ai/client.js';

export type RetrievedChunk = {
  chapter: string | null;
  pageStart: number | null;
  pageEnd: number | null;
  content: string;
  similarity: number;
};

const SIM_THRESHOLD = 0.4;

/**
 * Retrieve top-K textbook chunks most relevant to `query`, scoped to a
 * profile. Returns empty array if no textbooks ready or similarity below
 * threshold. Caller is responsible for formatting these into a prompt.
 *
 * Implementation: full-scan cosine on the profile's chunks. With a few
 * hundred chunks × 1024 dims this runs in tens of ms — no need for
 * pg_vector or a separate index.
 */
export async function retrieveRelevantChunks(
  profileId: string,
  query: string,
  topK = 3,
): Promise<RetrievedChunk[]> {
  if (!query.trim()) return [];

  const rows = await db
    .select({
      chapter: schema.textbookChunks.chapter,
      pageStart: schema.textbookChunks.pageStart,
      pageEnd: schema.textbookChunks.pageEnd,
      content: schema.textbookChunks.content,
      embedding: schema.textbookChunks.embedding,
    })
    .from(schema.textbookChunks)
    .where(eq(schema.textbookChunks.profileId, profileId));
  if (rows.length === 0) return [];

  const [queryVec] = await embed([query]);
  if (!queryVec) return [];

  const scored = rows
    .map((r) => ({
      chapter: r.chapter,
      pageStart: r.pageStart,
      pageEnd: r.pageEnd,
      content: r.content,
      similarity: cosineSimilarity(queryVec, r.embedding),
    }))
    .filter((r) => r.similarity >= SIM_THRESHOLD)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  return scored;
}

/**
 * Format chunks as a system-prompt-friendly reference block. Callers append
 * this to their existing system prompt. Tells the LLM how to cite when it
 * uses any of these snippets.
 */
export function formatChunksForPrompt(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return '';
  const blocks = chunks
    .map((c, i) => {
      const cite = c.chapter
        ? `[${c.chapter}${c.pageStart ? `·第${c.pageStart}${c.pageEnd && c.pageEnd !== c.pageStart ? `-${c.pageEnd}` : ''}页` : ''}]`
        : c.pageStart
          ? `[第${c.pageStart}${c.pageEnd && c.pageEnd !== c.pageStart ? `-${c.pageEnd}` : ''}页]`
          : '[教材]';
      return `# 教材片段 ${i + 1}  ${cite}\n${c.content}`;
    })
    .join('\n\n');
  return [
    '---',
    '下面是用户上传的官方教材里跟当前问题最相关的片段。**如果你的回答用到了下面的内容，请用方括号标注引用**，例如「这道题考的是产品生命周期管理 [第3章·第87页]」。',
    '',
    blocks,
    '---',
  ].join('\n');
}
