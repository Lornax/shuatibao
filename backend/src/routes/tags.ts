import { Hono } from 'hono';
import { eq, sql } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import type { AuthVars } from '../middleware/auth.js';

const router = new Hono<{ Variables: AuthVars }>();

router.get('/profiles/:pid/tags', async (c) => {
  const userId = c.get('userId');
  const pid = c.req.param('pid');
  const [profile] = await db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.id, pid))
    .limit(1);
  if (!profile || profile.userId !== userId) return c.json({ error: 'not_found' }, 404);

  const result = await db.execute<{ tag: string; cnt: number }>(sql`
    SELECT tag, COUNT(*)::int as cnt
    FROM questions q, jsonb_array_elements_text(q.tags) tag
    WHERE q.profile_id = ${pid}
    GROUP BY tag
    ORDER BY cnt DESC
    LIMIT 30
  `);
  const rows = Array.isArray(result) ? result : (result as any).rows ?? [];
  return c.json(rows);
});

export { router as tagsRouter };
