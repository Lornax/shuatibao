import { Hono } from 'hono';
import { z } from 'zod';
import { eq, desc, and, ne } from 'drizzle-orm';
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
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', details: parsed.error.flatten() }, 400);
  }

  const answerKeys = parsed.data.options.map((o) => o.key);
  if (!answerKeys.includes(parsed.data.answer)) {
    return c.json({ error: 'answer_not_in_options' }, 400);
  }

  // 算 embedding（失败不阻塞保存）
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

  // 算相似题（同 profile 下，排除自己）
  const similar: { id: string; stem: string; similarity: number }[] = [];
  if (embedding) {
    const others = await db
      .select({ id: schema.questions.id, stem: schema.questions.stem, embedding: schema.questions.embedding })
      .from(schema.questions)
      .where(and(eq(schema.questions.profileId, pid), ne(schema.questions.id, row.id)));
    for (const o of others) {
      if (!o.embedding) continue;
      const sim = cosineSimilarity(embedding, o.embedding);
      if (sim >= SIMILARITY_THRESHOLD) {
        similar.push({ id: o.id, stem: o.stem, similarity: Number(sim.toFixed(4)) });
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

  const rows = await db
    .select()
    .from(schema.questions)
    .where(eq(schema.questions.profileId, pid))
    .orderBy(desc(schema.questions.createdAt));
  return c.json(rows);
});

router.get('/questions/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const [q] = await db
    .select({
      q: schema.questions,
      p: schema.profiles,
    })
    .from(schema.questions)
    .innerJoin(schema.profiles, eq(schema.questions.profileId, schema.profiles.id))
    .where(eq(schema.questions.id, id))
    .limit(1);
  if (!q || q.p.userId !== userId) return c.json({ error: 'not_found' }, 404);
  return c.json(q.q);
});

export { router as questionsRouter };
