import { Hono } from 'hono';
import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import type { AuthVars } from '../middleware/auth.js';

const router = new Hono<{ Variables: AuthVars }>();

const createSchema = z.object({
  examName: z.string().min(1).max(100),
  target: z.string().max(200).optional(),
  examDate: z.string().datetime().optional(),
  dailyMinutes: z.number().int().min(5).max(720).default(60),
});

router.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', details: parsed.error.flatten() }, 400);
  }
  const userId = c.get('userId');
  const [row] = await db
    .insert(schema.profiles)
    .values({
      userId,
      examName: parsed.data.examName,
      target: parsed.data.target,
      examDate: parsed.data.examDate ? new Date(parsed.data.examDate) : null,
      dailyMinutes: parsed.data.dailyMinutes,
    })
    .returning();
  return c.json(row, 201);
});

router.get('/', async (c) => {
  const userId = c.get('userId');
  const rows = await db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.userId, userId))
    .orderBy(desc(schema.profiles.createdAt));
  return c.json(rows);
});

router.get('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const [row] = await db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.id, id))
    .limit(1);
  if (!row || row.userId !== userId) return c.json({ error: 'not_found' }, 404);
  return c.json(row);
});

export { router as profilesRouter };
