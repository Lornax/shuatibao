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

const patchSchema = z.object({
  examName: z.string().min(1).max(100).optional(),
  target: z.string().max(200).nullable().optional(),
  examDate: z.string().datetime().nullable().optional(),
  dailyMinutes: z.number().int().min(5).max(720).optional(),
});

router.patch('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const [existing] = await db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.id, id))
    .limit(1);
  if (!existing || existing.userId !== userId) return c.json({ error: 'not_found' }, 404);

  const body = await c.req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', details: parsed.error.flatten() }, 400);
  }
  const patch: Record<string, unknown> = {};
  if (parsed.data.examName !== undefined) patch.examName = parsed.data.examName;
  if (parsed.data.target !== undefined) patch.target = parsed.data.target;
  if (parsed.data.examDate !== undefined) {
    patch.examDate = parsed.data.examDate ? new Date(parsed.data.examDate) : null;
  }
  if (parsed.data.dailyMinutes !== undefined) patch.dailyMinutes = parsed.data.dailyMinutes;

  if (Object.keys(patch).length === 0) {
    return c.json(existing);
  }

  const [updated] = await db
    .update(schema.profiles)
    .set(patch)
    .where(eq(schema.profiles.id, id))
    .returning();
  return c.json(updated);
});

router.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const [existing] = await db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.id, id))
    .limit(1);
  if (!existing || existing.userId !== userId) return c.json({ error: 'not_found' }, 404);
  // cascade in schema deletes questions/attempts/import_jobs
  await db.delete(schema.profiles).where(eq(schema.profiles.id, id));
  return c.json({ ok: true });
});

export { router as profilesRouter };
