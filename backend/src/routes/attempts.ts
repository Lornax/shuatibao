import { Hono } from 'hono';
import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import type { AuthVars } from '../middleware/auth.js';
import { getStudyStats } from '../lib/study-stats.js';

const router = new Hono<{ Variables: AuthVars }>();

// 答对多少次后从错题本自动移除。
const STREAK_MASTER = 3;

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

  // 多选题 chosen="A,C" 需要排序后比对 (避免 "C,A" 跟 "A,C" 不匹配的 bug)
  const norm = (s: string): string =>
    s.includes(',') ? s.split(',').map((x) => x.trim()).filter(Boolean).sort().join(',') : s;
  const isCorrect = norm(parsed.data.chosen) === norm(q.q.answer);

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

  // 错题本 streak 维护：
  //   答错 → upsert entry (auto, streak=0) — 已存在的也重置 streak
  //   答对 → 如果 entry 存在，streak++；达到 STREAK_MASTER 则移除
  if (!isCorrect) {
    await db
      .insert(schema.wrongbookEntries)
      .values({ questionId: qid, userId, source: 'auto', correctStreak: 0 })
      .onConflictDoUpdate({
        target: [schema.wrongbookEntries.questionId, schema.wrongbookEntries.userId],
        set: { correctStreak: 0 },
      });
  } else {
    const [existing] = await db
      .select()
      .from(schema.wrongbookEntries)
      .where(
        and(
          eq(schema.wrongbookEntries.questionId, qid),
          eq(schema.wrongbookEntries.userId, userId),
        ),
      )
      .limit(1);
    if (existing) {
      const next = existing.correctStreak + 1;
      if (next >= STREAK_MASTER) {
        await db
          .delete(schema.wrongbookEntries)
          .where(eq(schema.wrongbookEntries.id, existing.id));
      } else {
        await db
          .update(schema.wrongbookEntries)
          .set({ correctStreak: next })
          .where(eq(schema.wrongbookEntries.id, existing.id));
      }
    }
  }

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

  // 错题本 = wrongbook_entries 表中该 user + 该 profile 的题
  // 附带最近一次 attempt 的 chosen / attempted_at（可能没有，比如手动加入但还没答过）
  const result = await db.execute<{
    id: string;
    stem: string;
    options: { key: string; text: string }[];
    answer: string;
    explanation: string | null;
    source: 'auto' | 'manual';
    correct_streak: number;
    added_at: Date;
    last_chosen: string | null;
    last_attempted_at: Date | null;
    wrong_count: number;
  }>(sql`
    SELECT
      q.id, q.stem, q.options, q.answer, q.explanation,
      we.source, we.correct_streak, we.added_at,
      latest.chosen as last_chosen,
      latest.attempted_at as last_attempted_at,
      COALESCE(cnt.wrong_count, 0) as wrong_count
    FROM wrongbook_entries we
    JOIN questions q ON q.id = we.question_id
    LEFT JOIN LATERAL (
      SELECT chosen, attempted_at
      FROM attempts
      WHERE question_id = q.id AND user_id = ${userId}
      ORDER BY attempted_at DESC
      LIMIT 1
    ) latest ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int as wrong_count
      FROM attempts
      WHERE question_id = q.id AND user_id = ${userId} AND is_correct = false
    ) cnt ON TRUE
    WHERE q.profile_id = ${pid} AND we.user_id = ${userId}
    ORDER BY we.added_at DESC
  `);

  const rows = Array.isArray(result) ? result : (result as any).rows ?? [];
  return c.json(rows);
});

// 手动加入错题本（蒙对的、印象深的题）
router.post('/questions/:qid/wrongbook', async (c) => {
  const userId = c.get('userId');
  const qid = c.req.param('qid');
  const [q] = await db
    .select({ q: schema.questions, p: schema.profiles })
    .from(schema.questions)
    .innerJoin(schema.profiles, eq(schema.questions.profileId, schema.profiles.id))
    .where(eq(schema.questions.id, qid))
    .limit(1);
  if (!q || q.p.userId !== userId) return c.json({ error: 'not_found' }, 404);

  const [row] = await db
    .insert(schema.wrongbookEntries)
    .values({ questionId: qid, userId, source: 'manual', correctStreak: 0 })
    .onConflictDoNothing({
      target: [schema.wrongbookEntries.questionId, schema.wrongbookEntries.userId],
    })
    .returning();

  // 已经在错题本里：返回现有 entry
  if (!row) {
    const [existing] = await db
      .select()
      .from(schema.wrongbookEntries)
      .where(
        and(
          eq(schema.wrongbookEntries.questionId, qid),
          eq(schema.wrongbookEntries.userId, userId),
        ),
      )
      .limit(1);
    return c.json({ entry: existing, alreadyIn: true });
  }
  return c.json({ entry: row, alreadyIn: false });
});

// 手动移除错题本
router.delete('/questions/:qid/wrongbook', async (c) => {
  const userId = c.get('userId');
  const qid = c.req.param('qid');
  const [q] = await db
    .select({ q: schema.questions, p: schema.profiles })
    .from(schema.questions)
    .innerJoin(schema.profiles, eq(schema.questions.profileId, schema.profiles.id))
    .where(eq(schema.questions.id, qid))
    .limit(1);
  if (!q || q.p.userId !== userId) return c.json({ error: 'not_found' }, 404);

  await db
    .delete(schema.wrongbookEntries)
    .where(
      and(
        eq(schema.wrongbookEntries.questionId, qid),
        eq(schema.wrongbookEntries.userId, userId),
      ),
    );
  return c.json({ ok: true });
});

// 查这道题是不是在错题本里（前端 Quiz revealed 用，决定按钮文案）
router.get('/questions/:qid/wrongbook', async (c) => {
  const userId = c.get('userId');
  const qid = c.req.param('qid');
  const [q] = await db
    .select({ q: schema.questions, p: schema.profiles })
    .from(schema.questions)
    .innerJoin(schema.profiles, eq(schema.questions.profileId, schema.profiles.id))
    .where(eq(schema.questions.id, qid))
    .limit(1);
  if (!q || q.p.userId !== userId) return c.json({ error: 'not_found' }, 404);

  const [entry] = await db
    .select()
    .from(schema.wrongbookEntries)
    .where(
      and(
        eq(schema.wrongbookEntries.questionId, qid),
        eq(schema.wrongbookEntries.userId, userId),
      ),
    )
    .limit(1);
  return c.json({ entry: entry ?? null });
});

router.get('/profiles/:pid/quiz/next', async (c) => {
  const userId = c.get('userId');
  const pid = c.req.param('pid');
  const wrongOnly = c.req.query('wrong_only') === 'true';

  const [profile] = await db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.id, pid))
    .limit(1);
  if (!profile || profile.userId !== userId) return c.json({ error: 'not_found' }, 404);

  // Default mode (mixed): 抽一道 未答过 OR 上次答错 的题
  // wrong_only mode: 只抽 上次答错 的题（排除未答过）—— 错题本「再练一遍」用
  const whereClause = wrongOnly
    ? sql`latest.is_correct = false`
    : sql`(latest.is_correct IS NULL OR latest.is_correct = false)`;

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
      AND ${whereClause}
    ORDER BY RANDOM()
    LIMIT 1
  `);

  const rows = Array.isArray(result) ? result : (result as any).rows ?? [];
  if (rows.length === 0) return c.json({ done: true });
  return c.json(rows[0]);
});

router.get('/profiles/:pid/stats', async (c) => {
  const userId = c.get('userId');
  const pid = c.req.param('pid');
  const [profile] = await db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.id, pid))
    .limit(1);
  if (!profile || profile.userId !== userId) return c.json({ error: 'not_found' }, 404);
  const stats = await getStudyStats(pid, userId, profile.examDate);
  return c.json(stats);
});

export { router as attemptsRouter };
