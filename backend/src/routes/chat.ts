import { Hono } from 'hono';
import { z } from 'zod';
import { asc, eq } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import type { AuthVars } from '../middleware/auth.js';
import { chatAboutQuestion, type ChatHistoryMessage, type QuestionContext } from '../ai/client.js';

const router = new Hono<{ Variables: AuthVars }>();

async function loadOwnedQuestion(qid: string, userId: string) {
  const [row] = await db
    .select({ q: schema.questions, p: schema.profiles })
    .from(schema.questions)
    .innerJoin(schema.profiles, eq(schema.questions.profileId, schema.profiles.id))
    .where(eq(schema.questions.id, qid))
    .limit(1);
  if (!row || row.p.userId !== userId) return null;
  return row.q;
}

router.get('/questions/:qid/chat', async (c) => {
  const userId = c.get('userId');
  const qid = c.req.param('qid');
  const q = await loadOwnedQuestion(qid, userId);
  if (!q) return c.json({ error: 'not_found' }, 404);

  const messages = await db
    .select({
      id: schema.chatMessages.id,
      role: schema.chatMessages.role,
      content: schema.chatMessages.content,
      createdAt: schema.chatMessages.createdAt,
    })
    .from(schema.chatMessages)
    .where(eq(schema.chatMessages.questionId, qid))
    .orderBy(asc(schema.chatMessages.createdAt));

  return c.json({ messages });
});

const postSchema = z.object({
  content: z.string().min(1).max(2000),
});

router.post('/questions/:qid/chat', async (c) => {
  const userId = c.get('userId');
  const qid = c.req.param('qid');
  const q = await loadOwnedQuestion(qid, userId);
  if (!q) return c.json({ error: 'not_found' }, 404);

  const body = await c.req.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'invalid_body' }, 400);

  // load prior history (asc) to pass to model
  const history = await db
    .select({
      role: schema.chatMessages.role,
      content: schema.chatMessages.content,
    })
    .from(schema.chatMessages)
    .where(eq(schema.chatMessages.questionId, qid))
    .orderBy(asc(schema.chatMessages.createdAt));

  // 1) persist the user message immediately
  const [userMsg] = await db
    .insert(schema.chatMessages)
    .values({
      questionId: qid,
      userId,
      role: 'user',
      content: parsed.data.content.trim(),
    })
    .returning();

  // 2) call AI with full context
  const ctx: QuestionContext = {
    stem: q.stem,
    options: q.options,
    answer: q.answer,
    explanation: q.explanation,
  };
  let aiReply: string;
  try {
    aiReply = await chatAboutQuestion(
      ctx,
      history as ChatHistoryMessage[],
      parsed.data.content.trim(),
    );
  } catch (e) {
    return c.json({ error: 'ai_failed', detail: String(e), userMessage: userMsg }, 502);
  }

  // 3) persist assistant message
  const [assistantMsg] = await db
    .insert(schema.chatMessages)
    .values({
      questionId: qid,
      userId,
      role: 'assistant',
      content: aiReply,
    })
    .returning();

  return c.json({ userMessage: userMsg, assistantMessage: assistantMsg });
});

router.delete('/questions/:qid/chat', async (c) => {
  const userId = c.get('userId');
  const qid = c.req.param('qid');
  const q = await loadOwnedQuestion(qid, userId);
  if (!q) return c.json({ error: 'not_found' }, 404);

  await db.delete(schema.chatMessages).where(eq(schema.chatMessages.questionId, qid));
  return c.json({ ok: true });
});

export { router as chatRouter };
