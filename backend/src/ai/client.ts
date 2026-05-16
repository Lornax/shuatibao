import OpenAI from 'openai';
import { config } from '../config.js';
import {
  VISION_RECOGNIZE_PROMPT,
  PROMPT_GEN_PROMPT,
  PDF_STRUCTURE_PROMPT,
  SOLVE_PROMPT,
} from './prompts.js';
import {
  parseCandidateOrThrow,
  parseCandidateArrayOrThrow,
  type CandidateQuestion,
} from './parser.js';

const client = new OpenAI({
  apiKey: config.DASHSCOPE_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

const MODEL_VISION = 'qwen-vl-max';
const MODEL_TEXT = 'qwen-max';
const MODEL_EMBEDDING = 'text-embedding-v3';
const MODEL_CHAT = 'deepseek-v3';

export async function recognizeQuestionFromImage(imageBase64DataUrl: string): Promise<CandidateQuestion> {
  const r = await client.chat.completions.create({
    model: MODEL_VISION,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: VISION_RECOGNIZE_PROMPT },
          { type: 'image_url', image_url: { url: imageBase64DataUrl } },
        ],
      },
    ],
    temperature: 0.1,
  });
  const raw = r.choices[0]?.message?.content ?? '';
  return parseCandidateOrThrow(typeof raw === 'string' ? raw : '');
}

export async function generateQuestionFromPrompt(
  knowledge: string,
  difficulty = 2,
  chapter?: string,
  topics?: string,
  textbookReference?: string,
): Promise<CandidateQuestion> {
  const userMsg = [
    `知识点：${knowledge}`,
    chapter ? `教材章节：${chapter}` : '',
    topics ? `考点关键词：${topics}` : '',
    `难度：${difficulty}`,
  ].filter(Boolean).join('\n');
  const systemPrompt = textbookReference
    ? `${PROMPT_GEN_PROMPT}\n\n${textbookReference}`
    : PROMPT_GEN_PROMPT;
  const r = await client.chat.completions.create({
    model: MODEL_TEXT,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMsg },
    ],
    temperature: 0.7,
  });
  const raw = r.choices[0]?.message?.content ?? '';
  return parseCandidateOrThrow(raw);
}

export async function structureQuestionsFromPdfText(
  pdfText: string,
  opts: { signal?: AbortSignal } = {},
): Promise<CandidateQuestion[]> {
  const r = await client.chat.completions.create(
    {
      model: MODEL_TEXT,
      messages: [
        { role: 'system', content: PDF_STRUCTURE_PROMPT },
        { role: 'user', content: pdfText },
      ],
      temperature: 0.1,
    },
    { signal: opts.signal },
  );
  const raw = r.choices[0]?.message?.content ?? '';
  return parseCandidateArrayOrThrow(raw);
}

export async function solveQuestion(
  stem: string,
  options: { key: string; text: string }[],
): Promise<{ answer: string; explanation: string }> {
  const optionsStr = options.map((o) => `${o.key}. ${o.text}`).join('\n');
  const r = await client.chat.completions.create({
    model: MODEL_TEXT,
    messages: [
      {
        role: 'system',
        content: SOLVE_PROMPT.replace('{stem}', stem).replace('{options}', optionsStr),
      },
    ],
    temperature: 0.3,
  });
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
  const r = await client.embeddings.create({
    model: MODEL_EMBEDDING,
    input: texts,
  });
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

  const r = await client.chat.completions.create({
    model: MODEL_CHAT,
    messages: [
      { role: 'system', content: systemPrompt },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: newUserMessage },
    ],
    temperature: 0.5,
  });
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
  ];
  return lines.join('\n');
}

export async function generateStudyWelcome(
  profile: ProfileContext,
  stats: StudyStatsContext,
): Promise<string> {
  const systemPrompt = buildStudySystemPrompt(profile, stats);
  const r = await client.chat.completions.create({
    model: MODEL_CHAT,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content:
          '请用 2-3 句话开场，根据当前数据给出**一个**最具体的行动建议。不要复述上面的数据，直接给建议。',
      },
    ],
    temperature: 0.5,
  });
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
  const r = await client.chat.completions.create({
    model: MODEL_CHAT,
    messages: [
      { role: 'system', content: systemPrompt },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: newUserMessage },
    ],
    temperature: 0.5,
  });
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
