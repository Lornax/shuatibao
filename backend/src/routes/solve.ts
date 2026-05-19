import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import type { AuthVars } from '../middleware/auth.js';
import { solveQuestion } from '../ai/client.js';

const router = new Hono<{ Variables: AuthVars }>();

const candidateBodySchema = z.object({
  stem: z.string().min(1).max(2000),
  options: z.array(z.object({ key: z.string().min(1).max(4), text: z.string().min(1).max(500) })).min(2).max(8),
});

router.post('/solve-candidate', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = candidateBodySchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'invalid_body', details: parsed.error.flatten() }, 400);

  try {
    const r = await solveQuestion(parsed.data.stem, parsed.data.options);
    return c.json(r);
  } catch (e) {
    return c.json({ error: 'ai_failed', detail: String(e) }, 502);
  }
});

router.post('/questions/:qid/solve', async (c) => {
  const userId = c.get('userId');
  const qid = c.req.param('qid');
  const [row] = await db
    .select({ q: schema.questions, p: schema.profiles })
    .from(schema.questions)
    .innerJoin(schema.profiles, eq(schema.questions.profileId, schema.profiles.id))
    .where(eq(schema.questions.id, qid))
    .limit(1);
  if (!row || row.p.userId !== userId) return c.json({ error: 'not_found' }, 404);

  try {
    const r = await solveQuestion(row.q.stem, row.q.options, row.p.examName);
    return c.json(r);
  } catch (e) {
    return c.json({ error: 'ai_failed', detail: String(e) }, 502);
  }
});

export { router as solveRouter };
