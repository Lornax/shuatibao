import { eq, sql } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import { embed } from '../ai/client.js';
import { parseTextbook } from './textbook-parser.js';

const bufsByJobId = new Map<string, Buffer>();
// dashscope text-embedding-v3 单次 input 数组上限是 10
const EMBED_BATCH = 10;

export function registerTextbookBuffer(textbookId: string, buf: Buffer) {
  bufsByJobId.set(textbookId, buf);
}

/**
 * Async worker for a textbook upload:
 *   1. parse PDF → chunks
 *   2. batch-embed chunks via text-embedding-v3
 *   3. insert chunks rows
 *   4. update textbook row with final counts + status='ready'
 *
 * Failures are caught and recorded as status='failed' + error string.
 */
export async function processTextbook(textbookId: string): Promise<void> {
  const buf = bufsByJobId.get(textbookId);
  if (!buf) {
    await markFailed(textbookId, 'buffer_missing');
    return;
  }

  try {
    const { totalPages, chunks } = await parseTextbook(buf);
    console.log(
      `[textbook ${textbookId.slice(0, 8)}] parsed: ${totalPages} pages, ${chunks.length} chunks`,
    );

    if (chunks.length === 0) {
      await markFailed(textbookId, 'no_text_extracted');
      return;
    }

    // fetch profile_id for chunk inserts
    const [tb] = await db
      .select({ profileId: schema.textbooks.profileId })
      .from(schema.textbooks)
      .where(eq(schema.textbooks.id, textbookId))
      .limit(1);
    if (!tb) {
      await markFailed(textbookId, 'textbook_row_missing');
      return;
    }

    await db
      .update(schema.textbooks)
      .set({ totalPages })
      .where(eq(schema.textbooks.id, textbookId));

    // batch embeddings
    const embeddings: number[][] = new Array(chunks.length);
    for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
      const batch = chunks.slice(i, i + EMBED_BATCH);
      const t0 = Date.now();
      const vecs = await embed(batch.map((c) => c.content));
      const dt = Date.now() - t0;
      console.log(
        `[textbook ${textbookId.slice(0, 8)}] embedded ${i + batch.length}/${chunks.length} (${dt}ms)`,
      );
      for (let j = 0; j < vecs.length; j++) {
        embeddings[i + j] = vecs[j];
      }
    }

    // insert chunks in batches (avoid one giant INSERT)
    const INSERT_BATCH = 100;
    for (let i = 0; i < chunks.length; i += INSERT_BATCH) {
      const slice = chunks.slice(i, i + INSERT_BATCH);
      await db.insert(schema.textbookChunks).values(
        slice.map((c, j) => ({
          textbookId,
          profileId: tb.profileId,
          chapter: c.chapter,
          pageStart: c.pageStart,
          pageEnd: c.pageEnd,
          content: c.content,
          embedding: embeddings[i + j],
        })),
      );
    }

    const chapterCount = new Set(chunks.map((c) => c.chapter).filter(Boolean)).size;

    await db
      .update(schema.textbooks)
      .set({
        status: 'ready',
        chunkCount: chunks.length,
        chapterCount,
        finishedAt: new Date(),
      })
      .where(eq(schema.textbooks.id, textbookId));
    console.log(
      `[textbook ${textbookId.slice(0, 8)}] ready · ${chunks.length} chunks · ${chapterCount} chapters`,
    );
  } catch (e) {
    console.error(`[textbook ${textbookId.slice(0, 8)}] worker error`, e);
    await markFailed(textbookId, String(e));
  } finally {
    bufsByJobId.delete(textbookId);
  }
}

async function markFailed(textbookId: string, reason: string) {
  await db
    .update(schema.textbooks)
    .set({ status: 'failed', error: reason, finishedAt: new Date() })
    .where(eq(schema.textbooks.id, textbookId));
}

/**
 * On boot: any textbook stuck in 'processing' belonged to the previous
 * process; flip to failed so the user can re-upload.
 */
export async function selfHealTextbooksOnBoot(): Promise<number> {
  const r = await db
    .update(schema.textbooks)
    .set({ status: 'failed', error: 'server_restart', finishedAt: new Date() })
    .where(sql`${schema.textbooks.status} = 'processing'`)
    .returning({ id: schema.textbooks.id });
  return r.length;
}
