import { Hono } from 'hono';
import { z } from 'zod';
import { and, asc, eq, isNotNull, lt, sql } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import type { AuthVars } from '../middleware/auth.js';
import {
  chatStudy,
  generateStudyWelcome,
  type ChatHistoryMessage,
} from '../ai/client.js';
import { getStudyStats } from '../lib/study-stats.js';
import { formatChunksForPrompt, retrieveRelevantChunks } from '../lib/textbook-rag.js';

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
      imageData: schema.studyChatMessages.imageData,
      linkedQuestionId: schema.studyChatMessages.linkedQuestionId,
      isNote: schema.studyChatMessages.isNote,
      createdAt: schema.studyChatMessages.createdAt,
    })
    .from(schema.studyChatMessages)
    .where(eq(schema.studyChatMessages.profileId, pid))
    .orderBy(asc(schema.studyChatMessages.createdAt));

  return c.json({ messages });
});

const postSchema = z.object({
  content: z.string().min(1).max(2000),
  // 可选: 用户附带的图片 (data URL, base64 编码). 含图片时切到 qwen-vl-max
  // 上限约 4MB base64 (3MB 原图)
  imageDataUrl: z.string().startsWith('data:image/').max(6_000_000).optional(),
});

const welcomeSchema = z.object({
  language: z.enum(['zh', 'en']).default('zh'),
});

router.post('/profiles/:pid/study-chat', async (c) => {
  const userId = c.get('userId');
  const pid = c.req.param('pid');
  const profile = await loadOwnedProfile(pid, userId);
  if (!profile) return c.json({ error: 'not_found' }, 404);

  const body = await c.req.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    console.error('[study-chat] invalid_body:', {
      hasBody: !!body,
      keys: body ? Object.keys(body) : [],
      contentLen: body?.content?.length,
      hasImage: !!body?.imageDataUrl,
      imagePrefix: body?.imageDataUrl?.slice(0, 30),
      imageLen: body?.imageDataUrl?.length,
      zodError: parsed.error?.issues,
    });
    return c.json({ error: 'invalid_body' }, 400);
  }
  console.log('[study-chat] POST', {
    hasImage: !!parsed.data.imageDataUrl,
    imagePrefix: parsed.data.imageDataUrl?.slice(0, 40),
    imageLen: parsed.data.imageDataUrl?.length,
    contentLen: parsed.data.content.length,
  });

  const rawHistory = await db
    .select({
      role: schema.studyChatMessages.role,
      content: schema.studyChatMessages.content,
      imageData: schema.studyChatMessages.imageData,
    })
    .from(schema.studyChatMessages)
    .where(eq(schema.studyChatMessages.profileId, pid))
    .orderBy(asc(schema.studyChatMessages.createdAt));

  // history 喂给 LLM 前: 图片本身不再可见 (chat 分支无视觉), 但若某条用户消息曾带图,
  // content 末尾加注「[图片已不可见, 用户问的可能是图里的内容]」, 让 AI 至少知道有图,
  // 不会装作没发生过. 这样 AI 回 "我刚才看不到图了, 能再发一次吗?" 而不是瞎答.
  const history = rawHistory.map((m) => ({
    role: m.role,
    content: m.imageData ? `${m.content}\n[当时附了一张图, 现在看不到了]` : m.content,
  }));

  // 用户消息存 db. 图片持久化到 image_data, content 不再带 [附图片] 占位
  // (前端有 image_data 时自然渲染缩略图, 不需要文本提示).
  // 启动 self-heal 会清掉 5 天前的 image_data 控制体积.
  const userContent = parsed.data.content.trim();
  const [userMsg] = await db
    .insert(schema.studyChatMessages)
    .values({
      profileId: pid,
      userId,
      role: 'user',
      content: userContent,
      imageData: parsed.data.imageDataUrl ?? null,
    })
    .returning();

  const stats = await getStudyStats(pid, userId, profile.examDate);
  // RAG: pull relevant textbook chunks for this query (best-effort)
  let textbookReference: string | undefined;
  try {
    const chunks = await retrieveRelevantChunks(pid, parsed.data.content, 3);
    if (chunks.length > 0) textbookReference = formatChunksForPrompt(chunks);
  } catch (e) {
    console.error('[study-chat] RAG retrieval failed (continuing):', e);
  }
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
      textbookReference,
      parsed.data.imageDataUrl,
    );
  } catch (e) {
    console.error('[study-chat] chatStudy threw:', e);
    return c.json({ error: 'ai_failed', detail: String(e), userMessage: userMsg }, 502);
  }
  console.log('[study-chat] AI replied, len:', aiReply.length);

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

  const body = await c.req.json().catch(() => ({}));
  const parsed = welcomeSchema.safeParse(body ?? {});
  if (!parsed.success) return c.json({ error: 'invalid_body' }, 400);

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
      parsed.data.language,
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

// 把 chat 消息关联到一道已入库的题. 用于「从陪学加入题库」流程的回写.
// 关联后, 该消息气泡的入库 CTA 会变成「✓ 已入题库 · 查看」.
// 关联后还会清掉 image_data, 因为题库版本是更完整的载体, 缩略图不再有用.
const linkSchema = z.object({
  questionId: z.string().uuid(),
});
router.post('/profiles/:pid/study-chat/messages/:mid/link-question', async (c) => {
  const userId = c.get('userId');
  const pid = c.req.param('pid');
  const mid = c.req.param('mid');
  const profile = await loadOwnedProfile(pid, userId);
  if (!profile) return c.json({ error: 'not_found' }, 404);

  const body = await c.req.json().catch(() => null);
  const parsed = linkSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'invalid_body' }, 400);

  // 校验 question 存在且属于该 profile
  const [q] = await db
    .select({ id: schema.questions.id, profileId: schema.questions.profileId })
    .from(schema.questions)
    .where(eq(schema.questions.id, parsed.data.questionId))
    .limit(1);
  if (!q || q.profileId !== pid) return c.json({ error: 'question_not_in_profile' }, 400);

  const [updated] = await db
    .update(schema.studyChatMessages)
    .set({ linkedQuestionId: parsed.data.questionId, imageData: null })
    .where(and(
      eq(schema.studyChatMessages.id, mid),
      eq(schema.studyChatMessages.profileId, pid),
    ))
    .returning({ id: schema.studyChatMessages.id });
  if (!updated) return c.json({ error: 'message_not_found' }, 404);
  // 插入 marker: 给用户完成感闭环, 同时给前端 conversationContext / 后续
  // history 压缩用作"这道题结束了"的天然分隔点.
  const [marker] = await db
    .insert(schema.studyChatMessages)
    .values({
      profileId: pid,
      userId,
      role: 'assistant',
      content: '✓ 上述题目已加入题库',
      isNote: true,
    })
    .returning();
  return c.json({ ok: true, marker });
});

router.delete('/profiles/:pid/study-chat', async (c) => {
  const userId = c.get('userId');
  const pid = c.req.param('pid');
  const profile = await loadOwnedProfile(pid, userId);
  if (!profile) return c.json({ error: 'not_found' }, 404);
  await db.delete(schema.studyChatMessages).where(eq(schema.studyChatMessages.profileId, pid));
  return c.json({ ok: true });
});

/**
 * 启动时清理 5 天前的图片 base64 (image_data 占行体积大, 历史回看用户不需要).
 * 返回清理的行数.
 */
export async function selfHealStudyChatImages(): Promise<number> {
  const r = await db
    .update(schema.studyChatMessages)
    .set({ imageData: null })
    .where(
      and(
        isNotNull(schema.studyChatMessages.imageData),
        lt(schema.studyChatMessages.createdAt, sql`now() - interval '5 days'`),
      ),
    )
    .returning({ id: schema.studyChatMessages.id });
  return r.length;
}

export { router as studyChatRouter };
