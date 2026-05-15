import { Hono } from 'hono';
import { z } from 'zod';
import { asc, eq } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import type { AuthVars } from '../middleware/auth.js';
import {
  chatStudy,
  generateStudyWelcome,
  type ChatHistoryMessage,
} from '../ai/client.js';
import { getStudyStats } from '../lib/study-stats.js';

const router = new Hono<{ Variables: AuthVars }>();

async function loadOwnedProfile(pid: string, userId: string) {
  const [row] = await db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.id, pid))
    .limit(1);
  return row && row.userId === userId ? row : null;
}

router.get('/profiles/:pid/study-chat', async (c) => {
  const userId = c.get('userId');
  const pid = c.req.param('pid');
  const profile = await loadOwnedProfile(pid, userId);
  if (!profile) return c.json({ error: 'not_found' }, 404);

  const messages = await db
    .select({
      id: schema.studyChatMessages.id,
      role: schema.studyChatMessages.role,
      content: schema.studyChatMessages.content,
      createdAt: schema.studyChatMessages.createdAt,
    })
    .from(schema.studyChatMessages)
    .where(eq(schema.studyChatMessages.profileId, pid))
    .orderBy(asc(schema.studyChatMessages.createdAt));

  return c.json({ messages });
});

const postSchema = z.object({ content: z.string().min(1).max(2000) });

router.post('/profiles/:pid/study-chat', async (c) => {
  const userId = c.get('userId');
  const pid = c.req.param('pid');
  const profile = await loadOwnedProfile(pid, userId);
  if (!profile) return c.json({ error: 'not_found' }, 404);

  const body = await c.req.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'invalid_body' }, 400);

  const history = await db
    .select({
      role: schema.studyChatMessages.role,
      content: schema.studyChatMessages.content,
    })
    .from(schema.studyChatMessages)
    .where(eq(schema.studyChatMessages.profileId, pid))
    .orderBy(asc(schema.studyChatMessages.createdAt));

  const [userMsg] = await db
    .insert(schema.studyChatMessages)
    .values({
      profileId: pid,
      userId,
      role: 'user',
      content: parsed.data.content.trim(),
    })
    .returning();

  const stats = await getStudyStats(pid, userId, profile.examDate);
  let aiReply: string;
  try {
    aiReply = await chatStudy(
      {
        examName: profile.examName,
        target: profile.target,
        dailyMinutes: profile.dailyMinutes,
      },
      stats,
      history as ChatHistoryMessage[],
      parsed.data.content.trim(),
    );
  } catch (e) {
    return c.json({ error: 'ai_failed', detail: String(e), userMessage: userMsg }, 502);
  }

  const [assistantMsg] = await db
    .insert(schema.studyChatMessages)
    .values({
      profileId: pid,
      userId,
      role: 'assistant',
      content: aiReply,
    })
    .returning();

  return c.json({ userMessage: userMsg, assistantMessage: assistantMsg });
});

// Generate an opening message (only if history is empty). Client calls this
// once on first mount.
router.post('/profiles/:pid/study-chat/welcome', async (c) => {
  const userId = c.get('userId');
  const pid = c.req.param('pid');
  const profile = await loadOwnedProfile(pid, userId);
  if (!profile) return c.json({ error: 'not_found' }, 404);

  const [{ value: existing }] = await db
    .select({ value: schema.studyChatMessages.id })
    .from(schema.studyChatMessages)
    .where(eq(schema.studyChatMessages.profileId, pid))
    .limit(1)
    .then((rows) => (rows.length ? [{ value: rows[0].value }] : [{ value: null as string | null }]));

  if (existing) {
    return c.json({ skipped: true, reason: 'history_not_empty' });
  }

  const stats = await getStudyStats(pid, userId, profile.examDate);
  let welcome: string;
  try {
    welcome = await generateStudyWelcome(
      {
        examName: profile.examName,
        target: profile.target,
        dailyMinutes: profile.dailyMinutes,
      },
      stats,
    );
  } catch (e) {
    return c.json({ error: 'ai_failed', detail: String(e) }, 502);
  }

  const [msg] = await db
    .insert(schema.studyChatMessages)
    .values({ profileId: pid, userId, role: 'assistant', content: welcome })
    .returning();
  return c.json({ message: msg, skipped: false });
});

router.delete('/profiles/:pid/study-chat', async (c) => {
  const userId = c.get('userId');
  const pid = c.req.param('pid');
  const profile = await loadOwnedProfile(pid, userId);
  if (!profile) return c.json({ error: 'not_found' }, 404);
  await db.delete(schema.studyChatMessages).where(eq(schema.studyChatMessages.profileId, pid));
  return c.json({ ok: true });
});

export { router as studyChatRouter };
