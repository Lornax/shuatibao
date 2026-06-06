import { Hono } from 'hono';
import { z } from 'zod';
import { desc, eq } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import type { AuthVars } from '../middleware/auth.js';

const router = new Hono<{ Variables: AuthVars }>();

// 我的反馈列表. 不返 resolved (避免用户看到「待处理」焦虑).
// 返 context.imageDataUrls 让列表能直接渲染缩略图.
router.get('/feedback', async (c) => {
  const userId = c.get('userId');
  const rows = await db
    .select({
      id: schema.feedbacks.id,
      kind: schema.feedbacks.kind,
      content: schema.feedbacks.content,
      context: schema.feedbacks.context,
      createdAt: schema.feedbacks.createdAt,
    })
    .from(schema.feedbacks)
    .where(eq(schema.feedbacks.userId, userId))
    .orderBy(desc(schema.feedbacks.createdAt))
    .limit(20);
  return c.json({ feedbacks: rows });
});

const feedbackSchema = z.object({
  kind: z.enum(['user_text', 'auto_error']).default('user_text'),
  content: z.string().min(1).max(5000),
  context: z.record(z.unknown()).optional(),
});

// 用户反馈 + 自动错误上报. context 装 {url, userAgent, viewport} 等 debug 元信息.
// 收到时 [FEEDBACK] 进 journalctl 便于实时监控; 详细数据进 db.
router.post('/feedback', async (c) => {
  const userId = c.get('userId') ?? null;
  const body = await c.req.json().catch(() => null);
  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'invalid_body' }, 400);

  const [row] = await db
    .insert(schema.feedbacks)
    .values({
      userId,
      kind: parsed.data.kind,
      content: parsed.data.content,
      context: parsed.data.context ?? null,
    })
    .returning({ id: schema.feedbacks.id });

  console.log(
    `[FEEDBACK] kind=${parsed.data.kind} user=${userId ?? 'anon'} preview="${parsed.data.content.slice(0, 80).replace(/\n/g, ' ')}"`,
  );
  return c.json({ ok: true, id: row.id });
});

export { router as feedbackRouter };
