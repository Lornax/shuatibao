import { Hono } from 'hono';
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import type { AuthVars } from '../middleware/auth.js';

const router = new Hono<{ Variables: AuthVars }>();

const submitSchema = z.object({
  chosen: z.string().min(1).max(20),
  timeSpentMs: z.number().int().min(0).max(60 * 60 * 1000).default(0),
});

router.post('/questions/:qid/attempts', async (c) => {
  const userId = c.get('userId');
  const qid = c.req.param('qid');

  const [q] = await db
    .select({
      q: schema.questions,
      p: schema.profiles,
    })
    .from(schema.questions)
    .innerJoin(schema.profiles, eq(schema.questions.profileId, schema.profiles.id))
    .where(eq(schema.questions.id, qid))
    .limit(1);
  if (!q || q.p.userId !== userId) return c.json({ error: 'not_found' }, 404);

  const body = await c.req.json().catch(() => null);
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'invalid_body' }, 400);

  const isCorrect = parsed.data.chosen === q.q.answer;

  const [row] = await db
    .insert(schema.attempts)
    .values({
      questionId: qid,
      userId,
      chosen: parsed.data.chosen,
      isCorrect,
      timeSpentMs: parsed.data.timeSpentMs,
    })
    .returning();

  return c.json({
    attempt: row,
    correctAnswer: q.q.answer,
    explanation: q.q.explanation,
  });
});

router.get('/profiles/:pid/wrongbook', async (c) => {
  const userId = c.get('userId');
  const pid = c.req.param('pid');

  const [profile] = await db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.id, pid))
    .limit(1);
  if (!profile || profile.userId !== userId) return c.json({ error: 'not_found' }, 404);

  // 拿这个档案下、当前用户最近一次作答错误的题
  const result = await db.execute<{
    id: string;
    stem: string;
    options: { key: string; text: string }[];
    answer: string;
    explanation: string | null;
    last_chosen: string;
    last_attempted_at: Date;
    wrong_count: number;
  }>(sql`
    SELECT
      q.id, q.stem, q.options, q.answer, q.explanation,
      latest.chosen as last_chosen,
      latest.attempted_at as last_attempted_at,
      cnt.wrong_count
    FROM questions q
    JOIN LATERAL (
      SELECT chosen, is_correct, attempted_at
      FROM attempts
      WHERE question_id = q.id AND user_id = ${userId}
      ORDER BY attempted_at DESC
      LIMIT 1
    ) latest ON TRUE
    JOIN LATERAL (
      SELECT COUNT(*)::int as wrong_count
      FROM attempts
      WHERE question_id = q.id AND user_id = ${userId} AND is_correct = false
    ) cnt ON TRUE
    WHERE q.profile_id = ${pid}
      AND latest.is_correct = false
    ORDER BY latest.attempted_at DESC
  `);

  // postgres-js driver returns RowList directly (extends Array). Drizzle 0.36+ wraps it.
  // We rely on the result being array-like; if Drizzle wraps in {rows: [...]}, normalize.
  const rows = Array.isArray(result) ? result : (result as any).rows ?? [];
  return c.json(rows);
});

router.get('/profiles/:pid/quiz/next', async (c) => {
  const userId = c.get('userId');
  const pid = c.req.param('pid');

  const [profile] = await db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.id, pid))
    .limit(1);
  if (!profile || profile.userId !== userId) return c.json({ error: 'not_found' }, 404);

  // v0.0.1 简化策略：随机抽一道未答过 OR 上次答错的题
  const result = await db.execute<{
    id: string;
    stem: string;
    options: { key: string; text: string }[];
    difficulty: number;
  }>(sql`
    SELECT q.id, q.stem, q.options, q.difficulty
    FROM questions q
    LEFT JOIN LATERAL (
      SELECT is_correct
      FROM attempts
      WHERE question_id = q.id AND user_id = ${userId}
      ORDER BY attempted_at DESC
      LIMIT 1
    ) latest ON TRUE
    WHERE q.profile_id = ${pid}
      AND (latest.is_correct IS NULL OR latest.is_correct = false)
    ORDER BY RANDOM()
    LIMIT 1
  `);

  const rows = Array.isArray(result) ? result : (result as any).rows ?? [];
  if (rows.length === 0) return c.json({ done: true });
  return c.json(rows[0]);
});

export { router as attemptsRouter };
