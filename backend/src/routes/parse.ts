import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import type { AuthVars } from '../middleware/auth.js';
import { recognizeQuestionFromImage } from '../ai/client.js';

const router = new Hono<{ Variables: AuthVars }>();

async function ownProfile(profileId: string, userId: string) {
  const [row] = await db
    .select({ id: schema.profiles.id, userId: schema.profiles.userId })
    .from(schema.profiles)
    .where(eq(schema.profiles.id, profileId))
    .limit(1);
  return row && row.userId === userId;
}

// POST /api/profiles/:pid/parse/image
// multipart/form-data with field "image" (File)
router.post('/profiles/:pid/parse/image', async (c) => {
  const userId = c.get('userId');
  const pid = c.req.param('pid');
  if (!(await ownProfile(pid, userId))) return c.json({ error: 'not_found' }, 404);

  const form = await c.req.formData().catch(() => null);
  const file = form?.get('image');
  if (!file || !(file instanceof File)) return c.json({ error: 'image_missing' }, 400);
  if (!file.type.startsWith('image/')) return c.json({ error: 'not_an_image' }, 400);
  if (file.size > 8 * 1024 * 1024) return c.json({ error: 'image_too_large' }, 400);

  const buf = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${buf.toString('base64')}`;

  try {
    const candidate = await recognizeQuestionFromImage(dataUrl);
    return c.json({ candidate, source: 'photo' });
  } catch (e) {
    return c.json({ error: 'ai_failed', detail: String(e) }, 502);
  }
});

export { router as parseRouter };
