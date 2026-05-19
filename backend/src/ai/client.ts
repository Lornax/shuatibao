import OpenAI from 'openai';
import { config } from '../config.js';
import {
  buildVisionRecognizePrompt,
  buildPromptGenPrompt,
  buildPdfStructurePrompt,
  buildSolvePrompt,
} from './prompts.js';
import {
  parseCandidateOrThrow,
  parseCandidateArrayOrThrow,
  type CandidateQuestion,
} from './parser.js';

// 主 client: 百炼普通套餐 (qwen-max / qwen-vl-max / text-embedding-v3 / deepseek-v3)
const client = new OpenAI({
  apiKey: config.DASHSCOPE_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

// Fallback client: 百炼 coding plan (qwen3.6-plus 含视觉 / glm-5 / qwen3-max-2026-01-23)
// 没配 key 时为 null, fallback 行为退化成"直接 throw 原错误"
const codingClient = config.DASHSCOPE_CODING_API_KEY
  ? new OpenAI({
      apiKey: config.DASHSCOPE_CODING_API_KEY,
      baseURL: config.DASHSCOPE_CODING_BASE_URL,
    })
  : null;

// 主模型
const MODEL_VISION = 'qwen-vl-max';
const MODEL_TEXT = 'qwen-max';
const MODEL_EMBEDDING = 'text-embedding-v3';
const MODEL_CHAT = 'deepseek-v3';
// Coding plan 替换模型 (用户配置)
const FB_VISION = 'qwen3.6-plus'; // 文本+视觉, 替换 qwen-vl-max
const FB_TEXT = 'qwen3-max-2026-01-23'; // 替换 qwen-max
const FB_CHAT = 'glm-5'; // 替换 deepseek-v3 (chat 长文本对话)
// Embedding 没有 coding plan, 用同 client 的 v2 兜底
const FB_EMBEDDING = 'text-embedding-v2';

function isQuotaError(e: unknown): boolean {
  const msg = String((e as { message?: unknown })?.message ?? e ?? '').toLowerCase();
  const status = (e as { status?: number })?.status;
  return (
    status === 429 ||
    msg.includes('insufficient') ||
    msg.includes('quota') ||
    msg.includes('arrearage') ||
    msg.includes('余额') ||
    msg.includes('rate limit') ||
    msg.includes('model_not_found')
  );
}

// 主模型/主 client 挂了 → 切 fallback (可能换 client + 换 model)
async function withFallback<T>(
  primaryClient: OpenAI,
  primaryModel: string,
  fallbackClient: OpenAI | null,
  fallbackModel: string,
  label: string,
  run: (c: OpenAI, m: string) => Promise<T>,
): Promise<T> {
  try {
    return await run(primaryClient, primaryModel);
  } catch (e) {
    if (!isQuotaError(e)) throw e;
    if (!fallbackClient) {
      console.warn(`[ai:${label}] primary "${primaryModel}" quota, no fallback client configured`);
      throw e;
    }
    console.warn(`[ai:${label}] primary "${primaryModel}" hit quota, fallback to "${fallbackModel}"`);
    return await run(fallbackClient, fallbackModel);
  }
}

export async function recognizeQuestionFromImage(
  imageBase64DataUrl: string,
  examName?: string,
): Promise<CandidateQuestion> {
  const r = await withFallback(client, MODEL_VISION, codingClient, FB_VISION, 'vision', (c, m) =>
    c.chat.completions.create({
      model: m,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: buildVisionRecognizePrompt(examName) },
            { type: 'image_url', image_url: { url: imageBase64DataUrl } },
          ],
        },
      ],
      temperature: 0.1,
    }),
  );
  const raw = r.choices[0]?.message?.content ?? '';
  return parseCandidateOrThrow(typeof raw === 'string' ? raw : '');
}

export async function generateQuestionFromPrompt(
  knowledge: string,
  difficulty = 2,
  chapter?: string,
  topics?: string,
  textbookReference?: string,
  excludeStems?: string[],
  examName?: string,
): Promise<CandidateQuestion> {
  const userMsgParts = [
    `知识点：${knowledge}`,
    chapter ? `教材章节：${chapter}` : '',
    topics ? `考点关键词：${topics}` : '',
    `难度：${difficulty}`,
  ].filter(Boolean);
  // 批量出题去重: 把已出的题干列出来, 要求 LLM 出新题角度/考点不重复
  if (excludeStems && excludeStems.length > 0) {
    userMsgParts.push(
      '',
      '⚠️ 本次是批量出题, 下面这些题已经出过了, 请换不同角度/考点出新题, 不要重复 (题干/选项不要类似):',
      ...excludeStems.map((s, i) => `${i + 1}. ${s.slice(0, 200)}`),
      '',
      '请挑一个不同的子知识点出题, 题干和选项跟上面任何一道都不一样。',
    );
  }
  const userMsg = userMsgParts.join('\n');
  const basePrompt = buildPromptGenPrompt(examName);
  const systemPrompt = textbookReference
    ? `${basePrompt}\n\n${textbookReference}`
    : basePrompt;
  const r = await withFallback(client, MODEL_TEXT, codingClient, FB_TEXT, 'genPrompt', (c, model) =>
    c.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMsg },
      ],
      temperature: excludeStems && excludeStems.length > 0 ? 0.9 : 0.7,
    }),
  );
  const raw = r.choices[0]?.message?.content ?? '';
  return parseCandidateOrThrow(raw);
}

export async function structureQuestionsFromPdfText(
  pdfText: string,
  opts: { signal?: AbortSignal; examName?: string } = {},
): Promise<CandidateQuestion[]> {
  const r = await withFallback(client, MODEL_TEXT, codingClient, FB_TEXT, 'pdfStruct', (c, model) =>
    c.chat.completions.create(
      {
        model,
        messages: [
          { role: 'system', content: buildPdfStructurePrompt(opts.examName) },
          { role: 'user', content: pdfText },
        ],
        temperature: 0.1,
      },
      { signal: opts.signal },
    ),
  );
  const raw = r.choices[0]?.message?.content ?? '';
  return parseCandidateArrayOrThrow(raw);
}

export async function solveQuestion(
  stem: string,
  options: { key: string; text: string }[],
  examName?: string,
): Promise<{ answer: string; explanation: string }> {
  const optionsStr = options.map((o) => `${o.key}. ${o.text}`).join('\n');
  const r = await withFallback(client, MODEL_TEXT, codingClient, FB_TEXT, 'solve', (c, model) =>
    c.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: buildSolvePrompt(stem, optionsStr, examName),
        },
      ],
      temperature: 0.3,
    }),
  );
  const raw = (r.choices[0]?.message?.content ?? '').trim();
  const json = raw.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```$/, '');
  let obj: any;
  try {
    obj = JSON.parse(json);
  } catch (e) {
    throw new Error(`solveQuestion bad JSON: ${raw.slice(0, 200)}`);
  }
  if (typeof obj.answer !== 'string' || typeof obj.explanation !== 'string') {
    throw new Error(`solveQuestion bad shape: ${raw.slice(0, 200)}`);
  }
  if (!options.find((o) => o.key === obj.answer)) {
    throw new Error(`solveQuestion answer "${obj.answer}" not in options`);
  }
  return obj;
}

export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const r = await withFallback(client, MODEL_EMBEDDING, client, FB_EMBEDDING, 'embed', (c, model) =>
    c.embeddings.create({
      model,
      input: texts,
    }),
  );
  return r.data.map((d) => d.embedding);
}

export type ChatHistoryMessage = { role: 'user' | 'assistant'; content: string };

export type QuestionContext = {
  stem: string;
  options: { key: string; text: string }[];
  answer: string;
  explanation: string | null;
};

const CHAT_SYSTEM_PROMPT_TEMPLATE = `你是 NPDP 备考的陪学助手。下面是用户正在学习的一道题：

题干：{stem}
选项：
{options}
正确答案：{answer}
官方解析：{explanation}

请围绕这道题的考点回答用户的问题（"为什么选 A"、"还有哪些相关考点"、"这个概念跟 X 有什么区别"等）。
- 用中文，移动端阅读，**控制 200 字以内**
- 不要重复整道题，直接回答用户的问题
- 引用具体选项时用「A 选项 / B 选项」格式`;

export async function chatAboutQuestion(
  question: QuestionContext,
  history: ChatHistoryMessage[],
  newUserMessage: string,
  textbookReference?: string,
): Promise<string> {
  const optionsStr = question.options.map((o) => `${o.key}. ${o.text}`).join('\n');
  const cnDate = new Date().toLocaleDateString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
  let systemPrompt = CHAT_SYSTEM_PROMPT_TEMPLATE
    .replace('{stem}', question.stem)
    .replace('{options}', optionsStr)
    .replace('{answer}', question.answer || '（未标注）')
    .replace('{explanation}', question.explanation || '（无）');
  systemPrompt = `今天是 ${cnDate}（Asia/Shanghai）。\n\n${systemPrompt}`;
  if (textbookReference) systemPrompt += `\n\n${textbookReference}`;

  const r = await withFallback(client, MODEL_CHAT, codingClient, FB_CHAT, 'chat', (c, model) =>
    c.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: newUserMessage },
      ],
      temperature: 0.5,
    }),
  );
  const reply = r.choices[0]?.message?.content?.trim() ?? '';
  if (!reply) throw new Error('AI 返回了空回复');
  return reply;
}

export type ProfileContext = {
  examName: string;
  target: string | null;
  dailyMinutes: number;
};

export type StudyStatsContext = {
  totalQuestions: number;
  wrongbookCount: number;
  attemptsLast7Days: number;
  recentAttemptDates: string[];
  daysSinceLastAttempt: number | null;
  daysUntilExam: number | null;
};

function buildStudySystemPrompt(profile: ProfileContext, stats: StudyStatsContext): string {
  const now = new Date();
  const cnDate = now.toLocaleDateString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
  const lines = [
    `你是 ${profile.examName} 备考的 AI 陪学助手。`,
    `今天是 ${cnDate}。`,
    '',
    '下面是用户最新的学习状态：',
    `- 考试：${profile.examName}${profile.target ? `（目标：${profile.target}）` : ''}`,
    `- 每天计划：${profile.dailyMinutes} 分钟`,
    stats.daysUntilExam != null
      ? `- 距离考试：${stats.daysUntilExam >= 0 ? `还剩 ${stats.daysUntilExam} 天` : `已过期 ${-stats.daysUntilExam} 天`}`
      : '- 考试日期：未设',
    `- 题库总数：${stats.totalQuestions} 道`,
    `- 错题本：${stats.wrongbookCount} 道未掌握`,
    `- 近 7 天答题：${stats.attemptsLast7Days} 次`,
    stats.daysSinceLastAttempt != null
      ? `- 上次答题：${stats.daysSinceLastAttempt} 天前`
      : '- 还没开始答题',
    '',
    '原则：',
    '- 中文，移动端阅读，**控制 200 字内**',
    '- 给具体可执行建议（"今天先刷错题本 10 道"），不要泛泛而谈',
    '- 如果用户连续 2 天没答题，温柔催促但不说教',
    '- 如果错题本 > 20 道，建议优先清积压',
    '- 如果距考试 < 30 天，重点强调冲刺策略；> 60 天 重在节奏稳定',
    '',
    '严格度（初期默认 "严格教练"，后期支持用户自选风格）：',
    '- 如果用户问与本次备考**无关**的话题（八卦、新闻、闲聊、其他考试、生活琐事），第一句话明确指出"我们先聚焦 ' + profile.examName + ' 备考"，然后用当前学习状态把他拉回正题（推荐下一步动作）。不要陪聊。',
    '- 如果用户找借口拖延（"今天太累了"、"明天再说"），不顺着说"那休息一下"，温和但坚定地给一个最小可执行步骤（"那今天先来 3 道错题，5 分钟就好"）。',
    '- 不主动给"加油"、"你可以的"、"相信自己"这种空话。',
    '',
    '什么时候表扬（不吝啬，但要具体）：',
    '- 连续打卡 ≥ 3 天 → 表扬"节奏"具体到天数',
    '- 近 7 天答题 ≥ 50 次 → 表扬"投入度"',
    '- 错题本从 >20 道清到 ≤10 道 → 表扬"啃硬骨头"',
    '- 表扬要具体提到他做了什么（"连续 5 天每天都来，错题从 28 清到 9，节奏稳"），不是"真棒"。',
  ];
  return lines.join('\n');
}

export async function generateStudyWelcome(
  profile: ProfileContext,
  stats: StudyStatsContext,
): Promise<string> {
  const systemPrompt = buildStudySystemPrompt(profile, stats);
  const r = await withFallback(client, MODEL_CHAT, codingClient, FB_CHAT, 'chat', (c, model) =>
    c.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content:
            '请用 2-3 句话开场，根据当前数据给出**一个**最具体的行动建议。不要复述上面的数据，直接给建议。',
        },
      ],
      temperature: 0.5,
    }),
  );
  const reply = r.choices[0]?.message?.content?.trim() ?? '';
  if (!reply) throw new Error('AI 返回空 welcome');
  return reply;
}

export async function chatStudy(
  profile: ProfileContext,
  stats: StudyStatsContext,
  history: ChatHistoryMessage[],
  newUserMessage: string,
  textbookReference?: string,
): Promise<string> {
  let systemPrompt = buildStudySystemPrompt(profile, stats);
  if (textbookReference) systemPrompt += `\n\n${textbookReference}`;
  const r = await withFallback(client, MODEL_CHAT, codingClient, FB_CHAT, 'chat', (c, model) =>
    c.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: newUserMessage },
      ],
      temperature: 0.5,
    }),
  );
  const reply = r.choices[0]?.message?.content?.trim() ?? '';
  if (!reply) throw new Error('AI 返回空回复');
  return reply;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error('vector length mismatch');
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}
