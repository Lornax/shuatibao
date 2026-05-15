import { Hono } from 'hono';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import type { AuthVars } from '../middleware/auth.js';
import { processTextbook, registerTextbookBuffer } from '../lib/textbook-worker.js';
import { getSignedUrl, isCosEnabled, uploadToCOS } from '../lib/cos.js';

const router = new Hono<{ Variables: AuthVars }>();

const MAX_BYTES = 50 * 1024 * 1024;

async function ownProfile(pid: string, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: schema.profiles.id, userId: schema.profiles.userId })
    .from(schema.profiles)
    .where(eq(schema.profiles.id, pid))
    .limit(1);
  return !!row && row.userId === userId;
}

router.post('/profiles/:pid/textbooks', async (c) => {
  const userId = c.get('userId');
  const pid = c.req.param('pid');
  if (!(await ownProfile(pid, userId))) return c.json({ error: 'not_found' }, 404);

  const form = await c.req.formData().catch(() => null);
  const file = form?.get('pdf');
  if (!file || !(file instanceof File)) return c.json({ error: 'pdf_missing' }, 400);
  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    return c.json({ error: 'not_a_pdf' }, 400);
  }
  if (file.size > MAX_BYTES) {
    return c.json({ error: 'pdf_too_large', limit: MAX_BYTES }, 400);
  }

  const buf = Buffer.from(await file.arrayBuffer());

  // upload to COS first (best-effort, doesn't block on failure)
  let cosUrl: string | null = null;
  if (isCosEnabled()) {
    try {
      const date = new Date().toISOString().slice(0, 10);
      const id = Math.random().toString(36).slice(2, 8);
      const safe = file.name.replace(/[^\w.-]+/g, '_').slice(-60);
      const key = `learn-or-die-lite/textbook/${date}/${Date.now()}_${id}_${safe}`;
      cosUrl = await uploadToCOS(buf, key, 'application/pdf');
    } catch (e) {
      console.error('[textbooks] COS upload failed (continuing):', e);
    }
  }

  const [tb] = await db
    .insert(schema.textbooks)
    .values({
      profileId: pid,
      userId,
      filename: file.name,
      fileSize: file.size,
      cosUrl,
      status: 'processing',
    })
    .returning({ id: schema.textbooks.id });

  registerTextbookBuffer(tb.id, buf);
  setImmediate(() => {
    processTextbook(tb.id).catch((e) =>
      console.error('[textbooks] uncaught worker error', tb.id, e),
    );
  });

  return c.json({ id: tb.id }, 201);
});

router.get('/profiles/:pid/textbooks', async (c) => {
  const userId = c.get('userId');
  const pid = c.req.param('pid');
  if (!(await ownProfile(pid, userId))) return c.json({ error: 'not_found' }, 404);

  const rows = await db
    .select()
    .from(schema.textbooks)
    .where(eq(schema.textbooks.profileId, pid))
    .orderBy(desc(schema.textbooks.createdAt));

  return c.json({
    textbooks: rows.map((r) => ({
      id: r.id,
      filename: r.filename,
      fileSize: r.fileSize,
      totalPages: r.totalPages,
      status: r.status,
      chunkCount: r.chunkCount,
      chapterCount: r.chapterCount,
      error: r.error,
      cosDownloadUrl: r.cosUrl ? getSignedUrl(r.cosUrl) : null,
      createdAt: r.createdAt,
      finishedAt: r.finishedAt,
    })),
  });
});

router.get('/profiles/:pid/textbooks/:tid', async (c) => {
  const userId = c.get('userId');
  const pid = c.req.param('pid');
  const tid = c.req.param('tid');
  if (!(await ownProfile(pid, userId))) return c.json({ error: 'not_found' }, 404);

  const [row] = await db
    .select()
    .from(schema.textbooks)
    .where(and(eq(schema.textbooks.id, tid), eq(schema.textbooks.profileId, pid)))
    .limit(1);
  if (!row) return c.json({ error: 'not_found' }, 404);

  return c.json({
    id: row.id,
    filename: row.filename,
    fileSize: row.fileSize,
    totalPages: row.totalPages,
    status: row.status,
    chunkCount: row.chunkCount,
    chapterCount: row.chapterCount,
    error: row.error,
    cosDownloadUrl: row.cosUrl ? getSignedUrl(row.cosUrl) : null,
    createdAt: row.createdAt,
    finishedAt: row.finishedAt,
  });
});

router.get('/profiles/:pid/textbooks/:tid/chapters', async (c) => {
  const userId = c.get('userId');
  const pid = c.req.param('pid');
  const tid = c.req.param('tid');
  if (!(await ownProfile(pid, userId))) return c.json({ error: 'not_found' }, 404);

  // verify textbook belongs to profile
  const [tb] = await db
    .select({ id: schema.textbooks.id })
    .from(schema.textbooks)
    .where(and(eq(schema.textbooks.id, tid), eq(schema.textbooks.profileId, pid)))
    .limit(1);
  if (!tb) return c.json({ error: 'not_found' }, 404);

  // chapter | chunkCount | pageStart | pageEnd, ordered by pageStart
  const rows = await db
    .select({
      chapter: schema.textbookChunks.chapter,
      chunkCount: sql<number>`count(*)::int`,
      pageStart: sql<number>`min(${schema.textbookChunks.pageStart})::int`,
      pageEnd: sql<number>`max(${schema.textbookChunks.pageEnd})::int`,
    })
    .from(schema.textbookChunks)
    .where(eq(schema.textbookChunks.textbookId, tid))
    .groupBy(schema.textbookChunks.chapter)
    .orderBy(sql`min(${schema.textbookChunks.pageStart}) NULLS LAST`);

  return c.json({ chapters: rows });
});

// 该 profile 下所有教材合并的章节集合（dedupe），AI 出题表单用作 datalist
router.get('/profiles/:pid/chapters', async (c) => {
  const userId = c.get('userId');
  const pid = c.req.param('pid');
  if (!(await ownProfile(pid, userId))) return c.json({ error: 'not_found' }, 404);

  const rows = await db
    .selectDistinct({ chapter: schema.textbookChunks.chapter })
    .from(schema.textbookChunks)
    .where(and(eq(schema.textbookChunks.profileId, pid), sql`${schema.textbookChunks.chapter} is not null`));

  return c.json({ chapters: rows.map((r) => r.chapter).filter(Boolean) });
});

// 从 COS 拉回原 PDF 用最新 parser 重新切片+嵌入. 用户改了 parser 逻辑后
// 不用重传 50MB 文件即可让旧教材应用最新切片.
router.post('/profiles/:pid/textbooks/:tid/reprocess', async (c) => {
  const userId = c.get('userId');
  const pid = c.req.param('pid');
  const tid = c.req.param('tid');
  if (!(await ownProfile(pid, userId))) return c.json({ error: 'not_found' }, 404);

  const [row] = await db
    .select()
    .from(schema.textbooks)
    .where(and(eq(schema.textbooks.id, tid), eq(schema.textbooks.profileId, pid)))
    .limit(1);
  if (!row) return c.json({ error: 'not_found' }, 404);
  if (!row.cosUrl) return c.json({ error: 'no_cos_backup' }, 400);
  if (row.status === 'processing') return c.json({ error: 'already_processing' }, 409);

  // pull PDF back from COS (using signed URL)
  let buf: Buffer;
  try {
    const signedUrl = getSignedUrl(row.cosUrl);
    const res = await fetch(signedUrl);
    if (!res.ok) throw new Error(`cos fetch ${res.status}`);
    buf = Buffer.from(await res.arrayBuffer());
  } catch (e) {
    return c.json({ error: 'cos_fetch_failed', detail: String(e) }, 502);
  }

  // wipe old chunks and reset textbook row
  await db.delete(schema.textbookChunks).where(eq(schema.textbookChunks.textbookId, tid));
  await db
    .update(schema.textbooks)
    .set({
      status: 'processing',
      chunkCount: 0,
      chapterCount: 0,
      error: null,
      finishedAt: null,
    })
    .where(eq(schema.textbooks.id, tid));

  registerTextbookBuffer(tid, buf);
  setImmediate(() => {
    processTextbook(tid).catch((e) =>
      console.error('[textbooks] uncaught reprocess error', tid, e),
    );
  });

  return c.json({ ok: true });
});

router.delete('/profiles/:pid/textbooks/:tid', async (c) => {
  const userId = c.get('userId');
  const pid = c.req.param('pid');
  const tid = c.req.param('tid');
  if (!(await ownProfile(pid, userId))) return c.json({ error: 'not_found' }, 404);

  const [row] = await db
    .select({ id: schema.textbooks.id })
    .from(schema.textbooks)
    .where(and(eq(schema.textbooks.id, tid), eq(schema.textbooks.profileId, pid)))
    .limit(1);
  if (!row) return c.json({ error: 'not_found' }, 404);

  await db.delete(schema.textbooks).where(eq(schema.textbooks.id, tid));
  return c.json({ ok: true });
});

export { router as textbooksRouter };
