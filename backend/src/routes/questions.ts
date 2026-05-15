import { Hono } from 'hono';
import { z } from 'zod';
import { eq, desc, and, ne, sql, inArray } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import type { AuthVars } from '../middleware/auth.js';
import { embed, cosineSimilarity } from '../ai/client.js';

const router = new Hono<{ Variables: AuthVars }>();

const optionSchema = z.object({
  key: z.string().min(1).max(4),
  text: z.string().min(1).max(500),
});

const createSchema = z.object({
  stem: z.string().min(1).max(2000),
  options: z.array(optionSchema).min(2).max(8),
  answer: z.string().min(1).max(20),
  explanation: z.string().max(2000).optional(),
  tags: z.array(z.string().max(30)).max(10).default([]),
  difficulty: z.number().int().min(1).max(5).default(2),
  source: z.enum(['photo', 'manual', 'pdf', 'ai_gen']).default('manual'),
  sourceMeta: z.record(z.string(), z.unknown()).optional(),
});

const patchSchema = z.object({
  stem: z.string().min(1).max(2000).optional(),
  options: z.array(optionSchema).min(2).max(8).optional(),
  answer: z.string().max(20).optional(),
  explanation: z.string().max(2000).nullable().optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
});

const SIMILARITY_THRESHOLD = 0.85;

async function ownProfile(profileId: string, userId: string) {
  const [row] = await db
    .select({ id: schema.profiles.id, userId: schema.profiles.userId })
    .from(schema.profiles)
    .where(eq(schema.profiles.id, profileId))
    .limit(1);
  return row && row.userId === userId;
}

router.post('/profiles/:pid/questions', async (c) => {
  const userId = c.get('userId');
  const pid = c.req.param('pid');
  if (!(await ownProfile(pid, userId))) return c.json({ error: 'not_found' }, 404);

  const body = await c.req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'invalid_body', details: parsed.error.flatten() }, 400);

  const answerKeys = parsed.data.options.map((o) => o.key);
  if (!answerKeys.includes(parsed.data.answer)) {
    return c.json({ error: 'answer_not_in_options' }, 400);
  }

  let embedding: number[] | null = null;
  try {
    const [vec] = await embed([parsed.data.stem]);
    embedding = vec ?? null;
  } catch (e) {
    console.error('embed failed for question, saving without embedding:', e);
  }

  const [row] = await db
    .insert(schema.questions)
    .values({
      profileId: pid,
      stem: parsed.data.stem,
      options: parsed.data.options,
      answer: parsed.data.answer,
      explanation: parsed.data.explanation,
      tags: parsed.data.tags,
      difficulty: parsed.data.difficulty,
      source: parsed.data.source,
      sourceMeta: parsed.data.sourceMeta,
      embedding,
    })
    .returning();

  type Sim = {
    id: string;
    stem: string;
    options: { key: string; text: string }[];
    answer: string;
    explanation: string | null;
    similarity: number;
  };
  const similar: Sim[] = [];
  if (embedding) {
    const others = await db
      .select({
        id: schema.questions.id,
        stem: schema.questions.stem,
        options: schema.questions.options,
        answer: schema.questions.answer,
        explanation: schema.questions.explanation,
        embedding: schema.questions.embedding,
      })
      .from(schema.questions)
      .where(and(eq(schema.questions.profileId, pid), ne(schema.questions.id, row.id)));
    for (const o of others) {
      if (!o.embedding) continue;
      const sim = cosineSimilarity(embedding, o.embedding);
      if (sim >= SIMILARITY_THRESHOLD) {
        similar.push({
          id: o.id,
          stem: o.stem,
          options: o.options,
          answer: o.answer,
          explanation: o.explanation,
          similarity: Number(sim.toFixed(4)),
        });
      }
    }
    similar.sort((a, b) => b.similarity - a.similarity);
  }

  return c.json({ question: row, similar }, 201);
});

router.get('/profiles/:pid/questions', async (c) => {
  const userId = c.get('userId');
  const pid = c.req.param('pid');
  if (!(await ownProfile(pid, userId))) return c.json({ error: 'not_found' }, 404);

  const limitParam = c.req.query('limit');
  const offsetParam = c.req.query('offset');
  const paginate = limitParam !== undefined;
  const limit = paginate ? Math.min(Math.max(parseInt(limitParam!) || 20, 1), 200) : undefined;
  const offset = paginate ? Math.max(parseInt(offsetParam ?? '0') || 0, 0) : 0;

  const baseQuery = db
    .select({
      question: schema.questions,
      attemptTotal: sql<number>`COALESCE(COUNT(${schema.attempts.id}), 0)::int`,
      attemptCorrect: sql<number>`COALESCE(SUM(CASE WHEN ${schema.attempts.isCorrect} THEN 1 ELSE 0 END), 0)::int`,
    })
    .from(schema.questions)
    .leftJoin(
      schema.attempts,
      and(eq(schema.attempts.questionId, schema.questions.id), eq(schema.attempts.userId, userId)),
    )
    .where(eq(schema.questions.profileId, pid))
    .groupBy(schema.questions.id)
    .orderBy(desc(schema.questions.createdAt));

  const rows = paginate
    ? await baseQuery.limit(limit!).offset(offset)
    : await baseQuery;

  const result = rows.map((r) => ({
    ...r.question,
    attemptTotal: r.attemptTotal,
    attemptCorrect: r.attemptCorrect,
    accuracy: r.attemptTotal > 0 ? r.attemptCorrect / r.attemptTotal : null,
  }));

  if (paginate) {
    const [{ total }] = await db
      .select({ total: sql<number>`COUNT(*)::int` })
      .from(schema.questions)
      .where(eq(schema.questions.profileId, pid));
    return c.json({ rows: result, total });
  }
  return c.json(result);
});

router.get('/questions/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const [q] = await db
    .select({ q: schema.questions, p: schema.profiles })
    .from(schema.questions)
    .innerJoin(schema.profiles, eq(schema.questions.profileId, schema.profiles.id))
    .where(eq(schema.questions.id, id))
    .limit(1);
  if (!q || q.p.userId !== userId) return c.json({ error: 'not_found' }, 404);
  return c.json(q.q);
});

router.delete('/questions/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const [row] = await db
    .select({ q: schema.questions, p: schema.profiles })
    .from(schema.questions)
    .innerJoin(schema.profiles, eq(schema.questions.profileId, schema.profiles.id))
    .where(eq(schema.questions.id, id))
    .limit(1);
  if (!row || row.p.userId !== userId) return c.json({ error: 'not_found' }, 404);
  await db.delete(schema.questions).where(eq(schema.questions.id, id));
  return c.json({ ok: true });
});

router.patch('/questions/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const [row] = await db
    .select({ q: schema.questions, p: schema.profiles })
    .from(schema.questions)
    .innerJoin(schema.profiles, eq(schema.questions.profileId, schema.profiles.id))
    .where(eq(schema.questions.id, id))
    .limit(1);
  if (!row || row.p.userId !== userId) return c.json({ error: 'not_found' }, 404);

  const body = await c.req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'invalid_body', details: parsed.error.flatten() }, 400);

  const finalOptions = parsed.data.options ?? row.q.options;
  if (parsed.data.answer && !finalOptions.map((o) => o.key).includes(parsed.data.answer)) {
    return c.json({ error: 'answer_not_in_options' }, 400);
  }

  const updates: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.stem && parsed.data.stem !== row.q.stem) {
    try {
      const [vec] = await embed([parsed.data.stem]);
      updates.embedding = vec ?? null;
    } catch (e) {
      console.error('embed failed during patch:', e);
    }
  }

  const [updated] = await db
    .update(schema.questions)
    .set(updates)
    .where(eq(schema.questions.id, id))
    .returning();
  return c.json(updated);
});

const batchDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(2000),
});

router.post('/profiles/:pid/questions/batch-delete', async (c) => {
  const userId = c.get('userId');
  const pid = c.req.param('pid');
  if (!(await ownProfile(pid, userId))) return c.json({ error: 'not_found' }, 404);

  const body = await c.req.json().catch(() => null);
  const parsed = batchDeleteSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'invalid_body' }, 400);

  // 只删属于这个 profile 的题，防止跨 profile 越权
  const r = await db
    .delete(schema.questions)
    .where(
      and(
        eq(schema.questions.profileId, pid),
        inArray(schema.questions.id, parsed.data.ids),
      ),
    )
    .returning({ id: schema.questions.id });

  return c.json({ deleted: r.length });
});

export { router as questionsRouter };
