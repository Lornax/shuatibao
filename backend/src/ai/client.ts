import OpenAI from 'openai';
import { config } from '../config.js';
import { db, schema } from '../db/client.js';
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

// codingClient (百炼 coding plan key) 暂时不用了, 主+fallback 现在是 mimo+dashscope. 留 env 字段
// 以备将来需要做三级 fallback (mimo -> dashscope -> coding plan).

// 硅基流动 client: 给 embedding 用 (BAAI/bge-m3 永久免费, 1024 维兼容 dashscope text-embedding).
// 没配 key 时为 null, embed 自动 fallback 到 dashscope text-embedding-v4.
const siliconflowClient = config.SILICONFLOW_API_KEY
  ? new OpenAI({
      apiKey: config.SILICONFLOW_API_KEY,
      baseURL: config.SILICONFLOW_BASE_URL,
    })
  : null;

// 小米 MiMo client: 主用于 chat / text / vision (mimo-v2.5-pro / mimo-v2.5).
// 没配 key 时为 null, 各 LLM 调用降级用 dashscope (qwen-max / qwen-vl-max / deepseek-v3).
const mimoClient = config.MIMO_API_KEY
  ? new OpenAI({
      apiKey: config.MIMO_API_KEY,
      baseURL: config.MIMO_BASE_URL,
    })
  : null;

// 主模型: 优先 MiMo (包月套餐), MiMo 没配时回退用 dashscope 模型 (按 token 计费).
// fallback 始终是 dashscope, 让 MiMo quota / 服务异常时仍可用.
const useMimo = !!mimoClient;
const MODEL_VISION = useMimo ? 'mimo-v2.5' : 'qwen-vl-max';
const MODEL_TEXT = useMimo ? 'mimo-v2.5-pro' : 'qwen-max';
// chat 用 v2.5 (非 pro): thinking 链短, 响应 ~5s vs pro 10s, 用户在等回复时速度优先
const MODEL_CHAT = useMimo ? 'mimo-v2.5' : 'deepseek-v3';
// 解题跟 chat 一样是用户实时等待 (点「AI 解一下」按钮), 用 v2.5 速度优先.
// 出题 / PDF 结构化是后台任务用户能干别的, 仍用 pro 求质量.
const MODEL_SOLVE = useMimo ? 'mimo-v2.5' : 'qwen-max';
// Embedding 主用硅基流动 BAAI/bge-m3 (永久免费, 1024 维兼容 dashscope text-embedding-v3/v4).
const MODEL_EMBEDDING = 'BAAI/bge-m3';
// Fallback 模型 (走 dashscope 主 client)
const FB_VISION = 'qwen-vl-max';
const FB_TEXT = 'qwen-max';
const FB_CHAT = 'deepseek-v3';
// Embedding fallback: 硅基流动挂时回退到 dashscope text-embedding-v4. 都是 1024 维兼容老数据.
const FB_EMBEDDING = 'text-embedding-v4';
// 主 LLM client: 优先 mimo, 没配走 dashscope.
const primaryLlmClient: OpenAI = mimoClient ?? client;

export function buildEmbeddingCreateParams(
  model: string,
  texts: string[],
): { model: string; input: string[]; dimensions?: number } {
  const params: { model: string; input: string[]; dimensions?: number } = { model, input: texts };
  if (model !== MODEL_EMBEDDING) {
    params.dimensions = 1024;
  }
  return params;
}

/**
 * 把 dashscope 等 LLM 调用的英文报错转成给用户看的友好中文.
 * 主要场景: 余额/quota/free tier 类报错 -> 引导用户去反馈联系作者充值.
 * 其他错误原样返回, 便于排查.
 */
export function friendlyAIError(e: unknown): string {
  const msg = String((e as { message?: unknown })?.message ?? e ?? '');
  if (/exhausted|quota|free tier|arrearage|余额|rate limit|insufficient/i.test(msg)) {
    return '啊哦，作者的 token 余额不足，请在右上角点击 💬 反馈，让吝啬的作者再充点小钱钱吧！';
  }
  return msg;
}

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

// 主模型/主 client 挂了 → 切 fallback (可能换 client + 换 model).
// 成功路径 fire-and-forget 写 llm_usage 表, 用于后续用量统计.
async function withFallback<T>(
  primaryClient: OpenAI,
  primaryModel: string,
  fallbackClient: OpenAI | null,
  fallbackModel: string,
  label: string,
  run: (c: OpenAI, m: string) => Promise<T>,
): Promise<T> {
  let usedModel = primaryModel;
  let result: T;
  try {
    result = await run(primaryClient, primaryModel);
  } catch (e) {
    if (!isQuotaError(e)) throw e;
    if (!fallbackClient) {
      console.warn(`[ai:${label}] primary "${primaryModel}" quota, no fallback client configured`);
      throw e;
    }
    console.warn(`[ai:${label}] primary "${primaryModel}" hit quota, fallback to "${fallbackModel}"`);
    usedModel = fallbackModel;
    result = await run(fallbackClient, fallbackModel);
  }
  recordUsage(usedModel, label, result).catch((err) => {
    console.error('[ai:usage] log failed:', err);
  });
  return result;
}

// OpenAI SDK 的 ChatCompletion / Embedding response 都带 usage 字段.
// dashscope OpenAI 兼容模式也跟着返. fire-and-forget, db 失败不影响主路径.
async function recordUsage(model: string, kind: string, result: unknown): Promise<void> {
  const usage = (result as { usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } }).usage;
  if (!usage) return;
  await db.insert(schema.llmUsage).values({
    model,
    kind,
    inputTokens: usage.prompt_tokens ?? 0,
    outputTokens: usage.completion_tokens ?? 0,
    totalTokens: usage.total_tokens ?? 0,
  });
}

export async function recognizeQuestionFromImage(
  imageBase64DataUrl: string,
  examName?: string,
  /**
   * 可选的对话上下文 (来自 AI 陪学): 用户和 AI 在入库前已经讨论过这道题,
   * 可能在解释过程中纠正了倾向性答案. 入库时把这段讨论喂回模型,
   * 让它综合"教材标准 + 师生讨论结论"给出最终的 answer + explanation.
   */
  conversationContext?: string,
): Promise<CandidateQuestion> {
  const textParts: string[] = [buildVisionRecognizePrompt(examName)];
  if (conversationContext && conversationContext.trim()) {
    textParts.push(
      '',
      '⚠️ 重要补充: 用户已经就这道题和 AI 陪学进行了讨论, 下面是讨论记录:',
      '---',
      conversationContext.trim(),
      '---',
      '请综合教材标准答案 + 上面讨论中形成的共识, 给出 answer (如讨论中改了倾向性答案就用讨论后的) 和 explanation (吸收讨论中的关键澄清, 不要简单复述题面).',
    );
  }
  const r = await withFallback(primaryLlmClient, MODEL_VISION, client, FB_VISION, 'vision', (c, m) =>
    c.chat.completions.create({
      model: m,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: textParts.join('\n') },
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
  const r = await withFallback(primaryLlmClient, MODEL_TEXT, client, FB_TEXT, 'genPrompt', (c, model) =>
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
  const r = await withFallback(primaryLlmClient, MODEL_TEXT, client, FB_TEXT, 'pdfStruct', (c, model) =>
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
  const r = await withFallback(primaryLlmClient, MODEL_SOLVE, client, FB_TEXT, 'solve', (c, model) =>
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
  // 主: 硅基流动 BAAI/bge-m3 (永久免费), fallback: dashscope text-embedding-v4. 都是 1024 维.
  // siliconflowClient 没配时降级用 dashscope client (本地开发场景).
  const primary = siliconflowClient ?? client;
  const r = await withFallback(primary, MODEL_EMBEDDING, client, FB_EMBEDDING, 'embed', (c, model) =>
    c.embeddings.create(buildEmbeddingCreateParams(model, texts) as any),
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

  const r = await withFallback(primaryLlmClient, MODEL_CHAT, client, FB_CHAT, 'chat', (c, model) =>
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

export type StudyLanguage = 'zh' | 'en';
type StudyLanguagePolicy = StudyLanguage | 'auto';

function studyLanguageInstruction(language: StudyLanguagePolicy): string {
  if (language === 'en') return '- Language: English. Keep it mobile-readable.';
  if (language === 'auto') {
    return '- 语言: 跟随用户最新消息的主要语言回复；用户用英文就回英文，用户用中文就回中文；移动端阅读。';
  }
  return '- 语言: 中文，移动端阅读。';
}

function buildStudySystemPrompt(
  profile: ProfileContext,
  stats: StudyStatsContext,
  language: StudyLanguagePolicy,
): string {
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
    studyLanguageInstruction(language),
    '- 字数: 闲聊/建议类回复 ≤ 200 字; 解题/讲概念/分析图片题, 按需展开到 400~600 字, 把答案/思路/关键依据讲清楚, 不要为了压字数省略实质分析',
    '- 给具体可执行建议（"今天先刷错题本 10 道"），不要泛泛而谈',
    '- 如果用户连续 2 天没答题，温柔催促但不说教',
    '- 如果错题本 > 20 道，建议优先清积压',
    '- 如果距考试 < 30 天，重点强调冲刺策略；> 60 天 重在节奏稳定',
    '',
    '输出格式 (重要, 渲染端是纯文本气泡, markdown 会原样显示成符号):',
    '- 不要用 markdown: 不要 # 标题, 不要表格 |, 不要 **加粗**, 不要 ```代码块```, 不要 - 列表符号',
    '- 用自然语言短句, 一段 1-3 句, 段之间空行',
    '- 适度用 emoji 做视觉引导 (📚 学习 / ✏️ 答题 / 🎯 重点 / ⏰ 时间 / 🔥 连续打卡 / ⚠️ 警示 / 👍 表扬), 一次回复 2-4 个就够, 不要堆砌',
    '- 数据列举用顿号或自然语言, 不要用 - 项目符号. 例: "今天该做的: 错题 5 道、新题 10 道、章节复习 1 节"',
    '- 解释概念时用"先说结论, 再展开 1-2 句"的结构, 不要用编号大纲',
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
  language: StudyLanguage = 'zh',
): Promise<string> {
  const systemPrompt = buildStudySystemPrompt(profile, stats, language);
  const r = await withFallback(primaryLlmClient, MODEL_CHAT, client, FB_CHAT, 'chat', (c, model) =>
    c.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content:
            language === 'en'
              ? 'Open with 2-3 sentences in English. Based on the current data, give exactly one concrete next action. Do not restate the data; go straight to the recommendation.'
              : '请用 2-3 句话开场，根据当前数据给出**一个**最具体的行动建议。不要复述上面的数据，直接给建议。',
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
  imageDataUrl?: string,
): Promise<string> {
  let systemPrompt = buildStudySystemPrompt(profile, stats, 'auto');
  if (textbookReference) systemPrompt += `\n\n${textbookReference}`;

  // 含图片时切到 qwen-vl-max (deepseek-v3 不支持视觉),
  // 当前消息的 content 改成 multimodal 数组 [text, image_url]
  if (imageDataUrl) {
    console.log('[chatStudy] vision branch:', {
      model: MODEL_VISION,
      imagePrefix: imageDataUrl.slice(0, 40),
      imageLen: imageDataUrl.length,
      newUserMsg: newUserMessage.slice(0, 60),
      historyCount: history.length,
    });
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      {
        role: 'user',
        content: [
          { type: 'text', text: newUserMessage || '看这张图, 帮我分析' },
          { type: 'image_url', image_url: { url: imageDataUrl } },
        ],
      },
    ];
    const r = await withFallback(primaryLlmClient, MODEL_VISION, client, FB_VISION, 'chat-vision', (c, model) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      c.chat.completions.create({ model, messages: messages as any, temperature: 0.5 }),
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reply = (r as any).choices?.[0]?.message?.content?.trim() ?? '';
    if (!reply) throw new Error('AI 返回空回复');
    return reply;
  }

  const r = await withFallback(primaryLlmClient, MODEL_CHAT, client, FB_CHAT, 'chat', (c, model) =>
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
