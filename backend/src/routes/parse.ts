import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import type { AuthVars } from '../middleware/auth.js';
import {
  recognizeQuestionFromImage,
  generateQuestionFromPrompt,
  structureQuestionsFromPdfText,
} from '../ai/client.js';
// pdf-parse has no types; runtime import OK
// @ts-expect-error pdf-parse has no types
import pdfParse from 'pdf-parse';

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

const promptSchema = z.object({
  knowledge: z.string().min(2).max(500),
  difficulty: z.number().int().min(1).max(5).default(2),
  chapter: z.string().max(100).optional(),
  topics: z.string().max(200).optional(),
});

router.post('/profiles/:pid/parse/prompt', async (c) => {
  const userId = c.get('userId');
  const pid = c.req.param('pid');
  if (!(await ownProfile(pid, userId))) return c.json({ error: 'not_found' }, 404);

  const body = await c.req.json().catch(() => null);
  const parsed = promptSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'invalid_body' }, 400);

  try {
    const candidate = await generateQuestionFromPrompt(
      parsed.data.knowledge,
      parsed.data.difficulty,
      parsed.data.chapter,
      parsed.data.topics,
    );
    return c.json({ candidate, source: 'ai_gen' });
  } catch (e) {
    return c.json({ error: 'ai_failed', detail: String(e) }, 502);
  }
});

router.post('/profiles/:pid/parse/pdf', async (c) => {
  const userId = c.get('userId');
  const pid = c.req.param('pid');
  if (!(await ownProfile(pid, userId))) return c.json({ error: 'not_found' }, 404);

  const form = await c.req.formData().catch(() => null);
  const file = form?.get('pdf');
  if (!file || !(file instanceof File)) return c.json({ error: 'pdf_missing' }, 400);
  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    return c.json({ error: 'not_a_pdf' }, 400);
  }
  if (file.size > 20 * 1024 * 1024) return c.json({ error: 'pdf_too_large' }, 400);

  const buf = Buffer.from(await file.arrayBuffer());

  let text = '';
  try {
    const result = await pdfParse(buf);
    text = (result.text ?? '').trim();
  } catch (e) {
    return c.json({ error: 'pdf_parse_failed', detail: String(e) }, 400);
  }
  if (text.length < 10) return c.json({ error: 'pdf_no_text' }, 400);

  // 截断防止超长（qwen-max 上下文有限）
  const MAX = 30000;
  if (text.length > MAX) text = text.slice(0, MAX);

  try {
    const candidates = await structureQuestionsFromPdfText(text);
    return c.json({ candidates, source: 'pdf', count: candidates.length });
  } catch (e) {
    return c.json({ error: 'ai_failed', detail: String(e) }, 502);
  }
});

export { router as parseRouter };
