# learn-or-die-lite v0.0.2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** 在 v0.0.1 基础上加 AI 加题 3 入口（拍照/PDF/AI 生成）+ 查重，让作者把 NPDP 真题书一拍就识别入库。

**Architecture:** Backend 加 AI provider 抽象层（DashScope OpenAI 兼容 API），3 个 `/parse/*` 端点把 LLM candidate 吐给前端确认页，前端确认后走 v0.0.1 已有的 `POST /questions`（扩展 source 参数）；保存时后端同步算 embedding 入库 + 返回相似题（≥0.85）。

**Tech Stack（v0.0.2 新增）:** openai SDK 4.x（走 dashscope 兼容 endpoint），pdf-parse，multer-style multipart via Hono `c.req.formData()`。

**测试策略**：保留 v0.0.1 的 18 个 integration test 全 PASS。新增 AI 模块走单元测试 + mock；`/parse/*` 端点写"smoke test"用真实 dashscope API（少量调用，靠免费额度）。前端不写单测。

**估时**：3-4 天 / 8-12 小时实际编码。

---

## File Structure（v0.0.2 新增/修改）

```
learn-or-die-lite/
├── backend/
│   ├── package.json                                # +openai +pdf-parse
│   ├── .env.example                                # +DASHSCOPE_API_KEY=
│   ├── drizzle/                                    # +0001_add_embedding.sql
│   ├── src/
│   │   ├── ai/
│   │   │   ├── client.ts                           # AIClient interface + impl
│   │   │   ├── prompts.ts                          # 三个 prompt 模板（识图/出题/PDF结构化）
│   │   │   └── parser.ts                           # zod 校验 LLM 返回
│   │   ├── db/
│   │   │   └── schema.ts                           # +embedding jsonb 列
│   │   └── routes/
│   │       ├── parse.ts                            # POST /parse/image | /parse/prompt | /parse/pdf
│   │       └── questions.ts                        # 修改：保存时同步 embed + 返回 similar 数组
│   └── tests/
│       ├── ai-client.test.ts                       # 真实 API smoke test
│       └── parse.test.ts                           # /parse/* 端点 mock test
└── frontend/
    └── src/
        ├── api/client.ts                           # 加 4 个 method
        └── pages/
            ├── QuestionAddSheet.tsx                # 4 入口选择 sheet
            ├── QuestionFromImage.tsx               # 拍照上传 → /parse/image
            ├── QuestionFromPDF.tsx                 # PDF 上传 → /parse/pdf
            ├── QuestionFromPrompt.tsx              # AI 生成（输入知识点）
            └── QuestionConfirm.tsx                 # 编辑确认页（4 入口共用）
```

---

## Phase A · 数据层

### Task 1: questions 表加 embedding 列

**Files:**
- Modify: `backend/src/db/schema.ts`
- Generate: `backend/drizzle/0001_xxx.sql`

- [ ] **Step 1: 修改 schema.ts**

读 `backend/src/db/schema.ts`，找到 questions 表定义，在 `sourceMeta` 之后、`createdAt` 之前加一行：

```ts
  embedding: jsonb('embedding').$type<number[]>(),
```

完整 questions 表定义：

```ts
export const questions = pgTable('questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  stem: text('stem').notNull(),
  options: jsonb('options').$type<{ key: string; text: string }[]>().notNull(),
  answer: text('answer').notNull(),
  explanation: text('explanation'),
  tags: jsonb('tags').$type<string[]>().default([]).notNull(),
  difficulty: integer('difficulty').default(2).notNull(),
  source: questionSource('source').default('manual').notNull(),
  sourceMeta: jsonb('source_meta').$type<Record<string, unknown>>(),
  embedding: jsonb('embedding').$type<number[]>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  profileIdx: index('questions_profile_idx').on(t.profileId),
}));
```

- [ ] **Step 2: 生成 + 应用 migration**

```bash
export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH" && cd /Users/lornax/Works/learn-or-die-lite/backend && npx drizzle-kit generate --name=add_embedding && npx drizzle-kit migrate
```

期望：新建 `drizzle/0001_xxx.sql`，应用成功。

- [ ] **Step 3: 验证**

```bash
export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH" && psql learn_or_die_lite -c "\d questions"
```

期望输出含 `embedding | jsonb` 列。

- [ ] **Step 4: 跑 v0.0.1 测试确认无 regression**

```bash
export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH" && cd /Users/lornax/Works/learn-or-die-lite/backend && npm test
```

期望：18 passed。

- [ ] **Step 5: Commit**

```bash
cd /Users/lornax/Works/learn-or-die-lite && git add backend/src/db/schema.ts backend/drizzle/ && git commit -m "feat(backend): add embedding column to questions"
```

---

## Phase B · AI Provider 客户端

### Task 2: DashScope client + prompts + parser + smoke test

**Files:**
- Create: `backend/src/ai/client.ts`
- Create: `backend/src/ai/prompts.ts`
- Create: `backend/src/ai/parser.ts`
- Create: `backend/tests/ai-client.test.ts`
- Modify: `backend/package.json`（+openai）
- Modify: `backend/src/config.ts`（+DASHSCOPE_API_KEY）
- Modify: `backend/.env.example`（+DASHSCOPE_API_KEY=）

- [ ] **Step 1: 装 openai SDK**

```bash
export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH" && cd /Users/lornax/Works/learn-or-die-lite && npm install -w backend openai@^4.70.0
```

- [ ] **Step 2: 加 DASHSCOPE_API_KEY 到 .env.example**

读 backend/.env.example，在末尾加一行：
```
DASHSCOPE_API_KEY=
```

最终内容：
```
PORT=3001
DATABASE_URL=postgres://lornax@localhost:5432/learn_or_die_lite
API_TOKEN=<your-random-token>
SEED_USER_ID=
DASHSCOPE_API_KEY=
```

- [ ] **Step 3: 加 DASHSCOPE_API_KEY 到 config.ts**

读 backend/src/config.ts，扩展 schema：

```ts
import { z } from 'zod';
import 'dotenv/config';

const schema = z.object({
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1),
  API_TOKEN: z.string().min(8),
  SEED_USER_ID: z.string().uuid(),
  DASHSCOPE_API_KEY: z.string().min(8),
});

export const config = schema.parse(process.env);
```

- [ ] **Step 4: 让用户把真实 key 写进 .env**

⚠️ **必须告诉用户在 backend/.env 加一行 `DASHSCOPE_API_KEY=<your-dashscope-api-key>`（用他自己的 key）**。subagent 不要尝试发现/捕获/记录 key。

- [ ] **Step 5: Create backend/src/ai/prompts.ts (EXACT)**

```bash
mkdir -p /Users/lornax/Works/learn-or-die-lite/backend/src/ai
```

```ts
export const VISION_RECOGNIZE_PROMPT = `你是一个考试题目识别助手。输入是一张题目图片或一段题目文本。请识别题干、选项、正确答案、解析，返回严格的 JSON 格式：

{
  "stem": "题干文本（不含选项）",
  "options": [
    {"key": "A", "text": "选项A文本"},
    {"key": "B", "text": "选项B文本"},
    {"key": "C", "text": "选项C文本"},
    {"key": "D", "text": "选项D文本"}
  ],
  "answer": "B",
  "explanation": "解析（如果原文中有；没有就返回空字符串）",
  "tags": ["NPDP"],
  "difficulty": 2
}

规则：
- 只返回 JSON，不要 markdown 代码块，不要任何额外文字
- options 数组长度 2-8 之间，按原题顺序
- answer 必须是 options 里某个 key（A/B/C/D 等）
- difficulty 1-5（1 最简单，5 最难），凭借题目复杂度估
- tags 默认填 ["NPDP"]，如果题目明显属于其他领域可加
- 如果识别失败或图片不是题目，返回 {"error": "原因"}`;

export const PROMPT_GEN_PROMPT = `你是一个产品经理认证（NPDP）出题专家。根据用户给的知识点和难度，出一道高质量选择题。

返回严格的 JSON 格式：

{
  "stem": "题干",
  "options": [
    {"key": "A", "text": "选项A"},
    {"key": "B", "text": "选项B"},
    {"key": "C", "text": "选项C"},
    {"key": "D", "text": "选项D"}
  ],
  "answer": "B",
  "explanation": "为什么选这个答案，并说明其他选项的错处",
  "tags": ["NPDP"],
  "difficulty": <用户指定的难度>
}

规则：
- 只返回 JSON，不要 markdown 代码块
- 4 个选项要互斥且具有迷惑性，不能明显有 1 个对其他都错
- explanation 至少 50 字，要说清楚为什么`;

export const PDF_STRUCTURE_PROMPT = `你是一个考试真题结构化助手。下面是一段从 PDF 中抽取的文本，里面可能包含 1 到多道选择题。请把每道题转成 JSON 数组：

[
  {
    "stem": "题干",
    "options": [{"key": "A", "text": "..."}, ...],
    "answer": "B",
    "explanation": "",
    "tags": ["NPDP"],
    "difficulty": 2
  },
  ...
]

规则：
- 只返回 JSON 数组，不要 markdown
- 如果文本里只有 1 道题，返回长度 1 的数组
- 如果识别不出任何题，返回空数组 []
- answer 如果原文有标注就填，没有就根据题目语境推断；推断不出就填 "A"
- explanation 原文有就填，没有就填空字符串`;
```

- [ ] **Step 6: Create backend/src/ai/parser.ts (EXACT)**

```ts
import { z } from 'zod';

export const candidateQuestionSchema = z.object({
  stem: z.string().min(1).max(2000),
  options: z
    .array(z.object({ key: z.string().min(1).max(4), text: z.string().min(1).max(500) }))
    .min(2)
    .max(8),
  answer: z.string().min(1).max(20),
  explanation: z.string().max(2000).default(''),
  tags: z.array(z.string().max(30)).max(10).default(['NPDP']),
  difficulty: z.number().int().min(1).max(5).default(2),
});

export type CandidateQuestion = z.infer<typeof candidateQuestionSchema>;

export const candidateArraySchema = z.array(candidateQuestionSchema);

export const errorResponseSchema = z.object({
  error: z.string(),
});

export function parseCandidateOrThrow(raw: string): CandidateQuestion {
  const json = stripMarkdownFence(raw);
  let obj: unknown;
  try {
    obj = JSON.parse(json);
  } catch (e) {
    throw new Error(`AI returned invalid JSON: ${raw.slice(0, 200)}`);
  }

  const errCheck = errorResponseSchema.safeParse(obj);
  if (errCheck.success) {
    throw new Error(`AI rejected: ${errCheck.data.error}`);
  }

  const result = candidateQuestionSchema.safeParse(obj);
  if (!result.success) {
    throw new Error(`AI JSON failed schema: ${result.error.message}; raw: ${raw.slice(0, 200)}`);
  }

  // 强校验：answer 必须是 options 里某个 key
  const keys = result.data.options.map((o) => o.key);
  if (!keys.includes(result.data.answer)) {
    throw new Error(`AI answer "${result.data.answer}" not in options ${keys.join(',')}`);
  }

  return result.data;
}

export function parseCandidateArrayOrThrow(raw: string): CandidateQuestion[] {
  const json = stripMarkdownFence(raw);
  let arr: unknown;
  try {
    arr = JSON.parse(json);
  } catch (e) {
    throw new Error(`AI returned invalid JSON array: ${raw.slice(0, 200)}`);
  }
  const result = candidateArraySchema.safeParse(arr);
  if (!result.success) {
    throw new Error(`AI JSON array failed schema: ${result.error.message}`);
  }
  // 同样校验每个 answer 在 options 内
  for (const q of result.data) {
    const keys = q.options.map((o) => o.key);
    if (!keys.includes(q.answer)) {
      throw new Error(`AI answer "${q.answer}" not in options ${keys.join(',')}`);
    }
  }
  return result.data;
}

// LLM 偶尔会包 ```json ... ``` 围栏，剥掉
function stripMarkdownFence(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  return fenced ? fenced[1].trim() : trimmed;
}
```

- [ ] **Step 7: Create backend/src/ai/client.ts (EXACT)**

```ts
import OpenAI from 'openai';
import { config } from '../config.js';
import {
  VISION_RECOGNIZE_PROMPT,
  PROMPT_GEN_PROMPT,
  PDF_STRUCTURE_PROMPT,
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
  return parseCandidateOrThrow(raw);
}

export async function generateQuestionFromPrompt(
  knowledge: string,
  difficulty = 2,
): Promise<CandidateQuestion> {
  const r = await client.chat.completions.create({
    model: MODEL_TEXT,
    messages: [
      { role: 'system', content: PROMPT_GEN_PROMPT },
      { role: 'user', content: `知识点：${knowledge}\n难度：${difficulty}` },
    ],
    temperature: 0.7,
  });
  const raw = r.choices[0]?.message?.content ?? '';
  return parseCandidateOrThrow(raw);
}

export async function structureQuestionsFromPdfText(pdfText: string): Promise<CandidateQuestion[]> {
  const r = await client.chat.completions.create({
    model: MODEL_TEXT,
    messages: [
      { role: 'system', content: PDF_STRUCTURE_PROMPT },
      { role: 'user', content: pdfText },
    ],
    temperature: 0.1,
  });
  const raw = r.choices[0]?.message?.content ?? '';
  return parseCandidateArrayOrThrow(raw);
}

export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const r = await client.embeddings.create({
    model: MODEL_EMBEDDING,
    input: texts,
  });
  return r.data.map((d) => d.embedding);
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
```

- [ ] **Step 8: Create backend/tests/ai-client.test.ts (smoke test, calls real API)**

```ts
import { describe, it, expect } from 'vitest';
import { embed, cosineSimilarity, generateQuestionFromPrompt } from '../src/ai/client.js';

// 这些测试调用真实 dashscope API。运行前确保 DASHSCOPE_API_KEY 在 .env 里
// 跳过条件：CI 或 SKIP_AI_TESTS=1
const skip = !process.env.DASHSCOPE_API_KEY || process.env.SKIP_AI_TESTS === '1';

describe.skipIf(skip)('AI client smoke (calls real dashscope)', () => {
  it('embed returns 1024-dim vector', async () => {
    const r = await embed(['你好世界']);
    expect(r).toHaveLength(1);
    expect(r[0].length).toBeGreaterThanOrEqual(1024);
  }, 30000);

  it('cosineSimilarity finds same text similar', async () => {
    const r = await embed(['产品生命周期分为几个阶段', '产品生命周期分几阶段']);
    const sim = cosineSimilarity(r[0], r[1]);
    expect(sim).toBeGreaterThan(0.85);
  }, 30000);

  it('cosineSimilarity finds unrelated low', async () => {
    const r = await embed(['产品生命周期', '今天天气真好']);
    const sim = cosineSimilarity(r[0], r[1]);
    expect(sim).toBeLessThan(0.6);
  }, 30000);

  it('generateQuestionFromPrompt returns valid CandidateQuestion', async () => {
    const q = await generateQuestionFromPrompt('产品生命周期的成熟期特征', 2);
    expect(q.stem).toBeTruthy();
    expect(q.options.length).toBeGreaterThanOrEqual(3);
    expect(q.options.map((o) => o.key)).toContain(q.answer);
    expect(q.tags).toContain('NPDP');
  }, 60000);
});
```

注：`describe.skipIf` 是 vitest 内置 API，缺 key 时整个套件跳过。

- [ ] **Step 9: 跑 smoke test**

```bash
export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH" && cd /Users/lornax/Works/learn-or-die-lite/backend && npm test
```

期望：v0.0.1 的 18 个 + 新增 4 个 smoke test = 22 passed（如果 DASHSCOPE_API_KEY 没设/无效，4 个会 skip，但不会 fail）。

如果 4 个 smoke test FAIL：
- 401/403 → key 不对，让用户检查 .env
- 网络错误 → 检查国内能否访问 dashscope.aliyuncs.com（一般可以）
- JSON parse 失败 → 模型返回了 markdown 围栏或额外文字，prompts.ts 已强调"只返回 JSON"，但偶尔 LLM 不听话——`stripMarkdownFence` 已处理。如反复失败，可在 prompts 里加 "你的回答必须以 { 开头" 之类强约束

- [ ] **Step 10: Commit**

```bash
cd /Users/lornax/Works/learn-or-die-lite && git add backend/src/ai/ backend/tests/ai-client.test.ts backend/package.json backend/src/config.ts backend/.env.example backend/package.json package-lock.json && git commit -m "feat(backend): dashscope ai client (vision/text/embedding) with smoke tests"
```

期望：22 commits。

---

## Phase C · 后端 AI 加题端点

### Task 3: 拍照识题端点

**Files:**
- Create: `backend/src/routes/parse.ts`
- Create: `backend/tests/parse.test.ts`
- Modify: `backend/src/index.ts`（mount parseRouter）

- [ ] **Step 1: Create backend/src/routes/parse.ts (EXACT，含三个端点：image/prompt/pdf；T3 这步只先写 image，T4/T5 加另两个)**

由于 T4/T5 都改这同一个文件，把 import 和 router 框架先写好，第一个端点先实现：

```ts
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
```

T4/T5 会在此文件添加 `/parse/prompt` 和 `/parse/pdf`。

- [ ] **Step 2: Mount in index.ts**

读 backend/src/index.ts，加 import + mount：

```ts
import { parseRouter } from './routes/parse.js';
// ... 其他 import 后
app.route('/api', parseRouter);
```

完整 index.ts 应该长这样（在已有 routes 之后加新行）：

```ts
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { config } from './config.js';
import { auth } from './middleware/auth.js';
import type { AuthVars } from './middleware/auth.js';
import { profilesRouter } from './routes/profiles.js';
import { questionsRouter } from './routes/questions.js';
import { attemptsRouter } from './routes/attempts.js';
import { parseRouter } from './routes/parse.js';

const app = new Hono<{ Variables: AuthVars }>();

app.use('/api/*', cors({ origin: 'http://localhost:5173', credentials: true }));
app.use('/api/*', auth);

app.get('/health', (c) => c.json({ ok: true, version: '0.0.1' }));
app.get('/api/me', (c) => c.json({ userId: c.get('userId') }));

app.route('/api/profiles', profilesRouter);
app.route('/api', questionsRouter);
app.route('/api', attemptsRouter);
app.route('/api', parseRouter);

if (process.env.NODE_ENV !== 'test' && import.meta.url === `file://${process.argv[1]}`) {
  serve({ fetch: app.fetch, port: config.PORT }, (info) => {
    console.log(`backend listening on :${info.port}`);
  });
}

export { app };
```

- [ ] **Step 3: Create backend/tests/parse.test.ts (mock test 不调真实 API)**

由于 v0.0.2 整个 ai-client 已有 smoke test 调真 API，parse.test.ts 用 mock 重点测路由层（auth/不属于 user 的 profile/文件大小/格式）。

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { app } from '../src/index.js';
import { authHeaders } from './helpers.js';

vi.mock('../src/ai/client.js', () => ({
  recognizeQuestionFromImage: vi.fn(async () => ({
    stem: 'mock 题干',
    options: [
      { key: 'A', text: 'a' },
      { key: 'B', text: 'b' },
    ],
    answer: 'A',
    explanation: '',
    tags: ['NPDP'],
    difficulty: 2,
  })),
  generateQuestionFromPrompt: vi.fn(),
  structureQuestionsFromPdfText: vi.fn(),
  embed: vi.fn(),
  cosineSimilarity: vi.fn(),
}));

let pid: string;

beforeEach(async () => {
  const p = await app
    .request('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ examName: 'NPDP' }),
    })
    .then((r) => r.json());
  pid = p.id;
});

describe('POST /api/profiles/:pid/parse/image', () => {
  it('rejects unauth', async () => {
    const fd = new FormData();
    fd.set('image', new File([new Uint8Array([1, 2, 3])], 't.png', { type: 'image/png' }));
    const res = await app.request(`/api/profiles/${pid}/parse/image`, { method: 'POST', body: fd });
    expect(res.status).toBe(401);
  });

  it('rejects wrong profile', async () => {
    const fd = new FormData();
    fd.set('image', new File([new Uint8Array([1, 2, 3])], 't.png', { type: 'image/png' }));
    const res = await app.request('/api/profiles/00000000-0000-0000-0000-000000000000/parse/image', {
      method: 'POST',
      headers: authHeaders(),
      body: fd,
    });
    expect(res.status).toBe(404);
  });

  it('rejects no image', async () => {
    const fd = new FormData();
    const res = await app.request(`/api/profiles/${pid}/parse/image`, {
      method: 'POST',
      headers: authHeaders(),
      body: fd,
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('image_missing');
  });

  it('rejects non-image', async () => {
    const fd = new FormData();
    fd.set('image', new File([new Uint8Array([1, 2, 3])], 't.txt', { type: 'text/plain' }));
    const res = await app.request(`/api/profiles/${pid}/parse/image`, {
      method: 'POST',
      headers: authHeaders(),
      body: fd,
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('not_an_image');
  });

  it('returns candidate from mocked AI', async () => {
    const fd = new FormData();
    fd.set('image', new File([new Uint8Array([1, 2, 3])], 't.png', { type: 'image/png' }));
    const res = await app.request(`/api/profiles/${pid}/parse/image`, {
      method: 'POST',
      headers: authHeaders(),
      body: fd,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.candidate.stem).toBe('mock 题干');
    expect(body.source).toBe('photo');
  });
});
```

- [ ] **Step 4: 跑测试**

```bash
export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH" && cd /Users/lornax/Works/learn-or-die-lite/backend && npm test
```

期望：18(v0.0.1) + 4(ai smoke) + 5(parse mock) = 27 passed（或者 23 passed + 4 skipped 如果 SKIP_AI_TESTS=1）。

- [ ] **Step 5: Commit**

```bash
cd /Users/lornax/Works/learn-or-die-lite && git add backend/src/routes/parse.ts backend/src/index.ts backend/tests/parse.test.ts && git commit -m "feat(backend): /parse/image endpoint via qwen-vl-max"
```

期望：23 commits。

---

### Task 4: AI 生成端点

**Files:**
- Modify: `backend/src/routes/parse.ts`（加 /parse/prompt）
- Modify: `backend/tests/parse.test.ts`（加 prompt 测试）

- [ ] **Step 1: 在 parse.ts 加 /parse/prompt 端点**

读现有 parse.ts，在 `/parse/image` 路由之后、`export` 之前加：

```ts
const promptSchema = z.object({
  knowledge: z.string().min(2).max(500),
  difficulty: z.number().int().min(1).max(5).default(2),
});

router.post('/profiles/:pid/parse/prompt', async (c) => {
  const userId = c.get('userId');
  const pid = c.req.param('pid');
  if (!(await ownProfile(pid, userId))) return c.json({ error: 'not_found' }, 404);

  const body = await c.req.json().catch(() => null);
  const parsed = promptSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'invalid_body' }, 400);

  try {
    const candidate = await generateQuestionFromPrompt(parsed.data.knowledge, parsed.data.difficulty);
    return c.json({ candidate, source: 'ai_gen' });
  } catch (e) {
    return c.json({ error: 'ai_failed', detail: String(e) }, 502);
  }
});
```

- [ ] **Step 2: 加 mock 测试 case 到 parse.test.ts**

在 `vi.mock` 块里 `generateQuestionFromPrompt` 改成返回 mock 数据：

```ts
generateQuestionFromPrompt: vi.fn(async () => ({
  stem: 'mock 出题题干',
  options: [
    { key: 'A', text: 'aa' },
    { key: 'B', text: 'bb' },
    { key: 'C', text: 'cc' },
    { key: 'D', text: 'dd' },
  ],
  answer: 'C',
  explanation: 'because',
  tags: ['NPDP'],
  difficulty: 3,
})),
```

在文件末尾追加新 describe 块：

```ts
describe('POST /api/profiles/:pid/parse/prompt', () => {
  it('rejects unauth', async () => {
    const res = await app.request(`/api/profiles/${pid}/parse/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ knowledge: '产品生命周期' }),
    });
    expect(res.status).toBe(401);
  });

  it('rejects empty knowledge', async () => {
    const res = await app.request(`/api/profiles/${pid}/parse/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ knowledge: '' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns candidate from mocked AI', async () => {
    const res = await app.request(`/api/profiles/${pid}/parse/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ knowledge: '产品生命周期' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.candidate.stem).toBe('mock 出题题干');
    expect(body.source).toBe('ai_gen');
  });
});
```

- [ ] **Step 3: 跑测试**

```bash
export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH" && cd /Users/lornax/Works/learn-or-die-lite/backend && npm test
```

期望：30 passed（27 + 3 prompt cases，AI smoke 4 个还在）。

- [ ] **Step 4: Commit**

```bash
cd /Users/lornax/Works/learn-or-die-lite && git add backend/src/routes/parse.ts backend/tests/parse.test.ts && git commit -m "feat(backend): /parse/prompt endpoint via qwen-max"
```

期望：24 commits。

---

### Task 5: PDF 解析端点

**Files:**
- Modify: `backend/package.json`（+pdf-parse）
- Modify: `backend/src/routes/parse.ts`（加 /parse/pdf）
- Modify: `backend/tests/parse.test.ts`（加 pdf 测试）

- [ ] **Step 1: 装 pdf-parse**

```bash
export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH" && cd /Users/lornax/Works/learn-or-die-lite && npm install -w backend pdf-parse@^1.1.1
```

注意：pdf-parse 没有官方 TypeScript 类型，import 时用 dynamic require 或 `import pdfParse from 'pdf-parse';` 配合 `// @ts-ignore`。

- [ ] **Step 2: 在 parse.ts 加 /parse/pdf 端点**

import 部分加：

```ts
// pdf-parse 没有官方 types，运行时 import
// @ts-expect-error pdf-parse has no types
import pdfParse from 'pdf-parse';
```

在文件末尾（`export` 之前）加：

```ts
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
```

- [ ] **Step 3: Mock pdf-parse + 加测试 case**

先在 vi.mock 块顶部加：

```ts
vi.mock('pdf-parse', () => ({
  default: vi.fn(async (buf: Buffer) => ({ text: buf.toString().slice(0, 100) })),
}));
```

并在 vi.mock('../src/ai/client.js', ...) 块里 structureQuestionsFromPdfText 改成 mock：

```ts
structureQuestionsFromPdfText: vi.fn(async () => [
  {
    stem: 'PDF 题 1',
    options: [
      { key: 'A', text: '1' },
      { key: 'B', text: '2' },
    ],
    answer: 'A',
    explanation: '',
    tags: ['NPDP'],
    difficulty: 2,
  },
  {
    stem: 'PDF 题 2',
    options: [
      { key: 'A', text: 'x' },
      { key: 'B', text: 'y' },
    ],
    answer: 'B',
    explanation: '',
    tags: ['NPDP'],
    difficulty: 1,
  },
]),
```

文件末尾追加：

```ts
describe('POST /api/profiles/:pid/parse/pdf', () => {
  it('returns candidates array from mocked AI', async () => {
    const fd = new FormData();
    // 拼一个看起来像 PDF 的 buffer，mock 会忽略实际内容
    const fakePdf = new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46, ...new Array(40).fill(0x20)])], {
      type: 'application/pdf',
    });
    fd.set('pdf', new File([fakePdf], 't.pdf', { type: 'application/pdf' }));
    const res = await app.request(`/api/profiles/${pid}/parse/pdf`, {
      method: 'POST',
      headers: authHeaders(),
      body: fd,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.candidates).toHaveLength(2);
    expect(body.source).toBe('pdf');
    expect(body.count).toBe(2);
  });

  it('rejects no pdf', async () => {
    const fd = new FormData();
    const res = await app.request(`/api/profiles/${pid}/parse/pdf`, {
      method: 'POST',
      headers: authHeaders(),
      body: fd,
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('pdf_missing');
  });
});
```

注：`new Array(40).fill(0x20)` 是为了让 fake pdf buffer 长度 > 40，避免 file.size==0。

- [ ] **Step 4: 跑测试**

```bash
export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH" && cd /Users/lornax/Works/learn-or-die-lite/backend && npm test
```

期望：32 passed（30 + 2 pdf cases）。

- [ ] **Step 5: Commit**

```bash
cd /Users/lornax/Works/learn-or-die-lite && git add backend/src/routes/parse.ts backend/tests/parse.test.ts backend/package.json package-lock.json && git commit -m "feat(backend): /parse/pdf endpoint via pdf-parse + qwen-max"
```

期望：25 commits。

---

### Task 6: createQuestion 集成 embedding + 查重

**Files:**
- Modify: `backend/src/routes/questions.ts`（保存时自动 embed + 返回相似题）
- Modify: `backend/tests/questions.test.ts`（加 mock embed 验证）

- [ ] **Step 1: 修改 routes/questions.ts**

读现有 questions.ts。修改点：
1. import embed/cosineSimilarity
2. import questionSource enum 类型 from schema
3. createSchema 加 source 字段（可选，默认 manual）
4. createSchema 加 sourceMeta 字段（可选 record）
5. POST 创建后：调 embed → 算与同档案下其他题的相似度 → 返回 similar 数组 + question

完整新文件（替换原内容）：

```ts
import { Hono } from 'hono';
import { z } from 'zod';
import { eq, desc, and, ne } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import type { AuthVars } from '../middleware/auth.js';
import { embed, cosineSimilarity } from '../ai/client.js';

const router = new Hono<{ Variables: AuthVars }>();

const optionSchema = z.object({
  key: z.string().min(1).max(4),
  text: z.string().min(1).max(500),
});

const createSchema = z.object({
  stem: z.string().min(1).max(2000),
  options: z.array(optionSchema).min(2).max(8),
  answer: z.string().min(1).max(20),
  explanation: z.string().max(2000).optional(),
  tags: z.array(z.string().max(30)).max(10).default([]),
  difficulty: z.number().int().min(1).max(5).default(2),
  source: z.enum(['photo', 'manual', 'pdf', 'ai_gen']).default('manual'),
  sourceMeta: z.record(z.string(), z.unknown()).optional(),
});

const SIMILARITY_THRESHOLD = 0.85;

async function ownProfile(profileId: string, userId: string) {
  const [row] = await db
    .select({ id: schema.profiles.id, userId: schema.profiles.userId })
    .from(schema.profiles)
    .where(eq(schema.profiles.id, profileId))
    .limit(1);
  return row && row.userId === userId;
}

router.post('/profiles/:pid/questions', async (c) => {
  const userId = c.get('userId');
  const pid = c.req.param('pid');
  if (!(await ownProfile(pid, userId))) return c.json({ error: 'not_found' }, 404);

  const body = await c.req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', details: parsed.error.flatten() }, 400);
  }

  const answerKeys = parsed.data.options.map((o) => o.key);
  if (!answerKeys.includes(parsed.data.answer)) {
    return c.json({ error: 'answer_not_in_options' }, 400);
  }

  // 算 embedding（失败不阻塞保存）
  let embedding: number[] | null = null;
  try {
    const [vec] = await embed([parsed.data.stem]);
    embedding = vec ?? null;
  } catch (e) {
    console.error('embed failed for question, saving without embedding:', e);
  }

  const [row] = await db
    .insert(schema.questions)
    .values({
      profileId: pid,
      stem: parsed.data.stem,
      options: parsed.data.options,
      answer: parsed.data.answer,
      explanation: parsed.data.explanation,
      tags: parsed.data.tags,
      difficulty: parsed.data.difficulty,
      source: parsed.data.source,
      sourceMeta: parsed.data.sourceMeta,
      embedding,
    })
    .returning();

  // 算相似题（同 profile 下，排除自己）
  let similar: { id: string; stem: string; similarity: number }[] = [];
  if (embedding) {
    const others = await db
      .select({ id: schema.questions.id, stem: schema.questions.stem, embedding: schema.questions.embedding })
      .from(schema.questions)
      .where(and(eq(schema.questions.profileId, pid), ne(schema.questions.id, row.id)));
    for (const o of others) {
      if (!o.embedding) continue;
      const sim = cosineSimilarity(embedding, o.embedding);
      if (sim >= SIMILARITY_THRESHOLD) {
        similar.push({ id: o.id, stem: o.stem, similarity: Number(sim.toFixed(4)) });
      }
    }
    similar.sort((a, b) => b.similarity - a.similarity);
  }

  return c.json({ question: row, similar }, 201);
});

router.get('/profiles/:pid/questions', async (c) => {
  const userId = c.get('userId');
  const pid = c.req.param('pid');
  if (!(await ownProfile(pid, userId))) return c.json({ error: 'not_found' }, 404);

  const rows = await db
    .select()
    .from(schema.questions)
    .where(eq(schema.questions.profileId, pid))
    .orderBy(desc(schema.questions.createdAt));
  return c.json(rows);
});

router.get('/questions/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const [q] = await db
    .select({
      q: schema.questions,
      p: schema.profiles,
    })
    .from(schema.questions)
    .innerJoin(schema.profiles, eq(schema.questions.profileId, schema.profiles.id))
    .where(eq(schema.questions.id, id))
    .limit(1);
  if (!q || q.p.userId !== userId) return c.json({ error: 'not_found' }, 404);
  return c.json(q.q);
});

export { router as questionsRouter };
```

⚠️ **Breaking change**：`POST /api/profiles/:pid/questions` 的响应从 `<Question>` 变成 `{ question: <Question>, similar: [...] }`。前端 `api.createQuestion` 也要相应改类型。

- [ ] **Step 2: 更新 questions.test.ts**

旧测试期望 `body.stem === ...`，现在要改成 `body.question.stem === ...`。同时 mock embed 让它返回固定向量。

读 backend/tests/questions.test.ts。在 import 后顶部加：

```ts
import { vi } from 'vitest';
vi.mock('../src/ai/client.js', () => ({
  embed: vi.fn(async (texts: string[]) => texts.map(() => new Array(1024).fill(0.1))),
  cosineSimilarity: vi.fn(() => 0.5),  // 默认低相似度
  recognizeQuestionFromImage: vi.fn(),
  generateQuestionFromPrompt: vi.fn(),
  structureQuestionsFromPdfText: vi.fn(),
}));
```

修改 'creates question' case，body 解析改为：

```ts
it('creates question', async () => {
  const res = await app.request(`/api/profiles/${pid}/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(validQuestion),
  });
  expect(res.status).toBe(201);
  const body = await res.json();
  expect(body.question.stem).toBe(validQuestion.stem);
  expect(body.question.options).toHaveLength(4);
  expect(body.question.source).toBe('manual');
  expect(body.similar).toEqual([]);  // mock 默认相似度 0.5 < 0.85，无相似题
});
```

'returns single question' 不变（GET 端点没改）。'lists questions' 不变。

- [ ] **Step 3: 跑测试**

```bash
export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH" && cd /Users/lornax/Works/learn-or-die-lite/backend && npm test
```

期望：32 passed（数字不变，因为 questions.test.ts 测试数没增减）。

如果 v0.0.1 的 attempts.test.ts 被波及失败（比如 `app.request('/api/profiles/${pid}/questions', ...)` 后用 `(await r.json()).id` 拿题 ID），看一下这个文件。如果是 `qid = q.id`，现在 `q` 是 `{question, similar}`——需要改成 `qid = q.question.id`。

读 backend/tests/attempts.test.ts，找到所有 `await app.request('.../questions', ...).then((r) => r.json())`，把后续用 `.id` 的地方改成 `.question.id`。

- [ ] **Step 4: Commit**

```bash
cd /Users/lornax/Works/learn-or-die-lite && git add backend/src/routes/questions.ts backend/tests/ && git commit -m "feat(backend): auto-embed on question save + return similar questions"
```

期望：26 commits。

---

## Phase D · 前端 AI 加题流程

### Task 7: 加题 sheet（4 入口） + AI 生成页

**Files:**
- Modify: `frontend/src/api/client.ts`（加 4 个 method + 改 createQuestion 返回类型）
- Modify: `frontend/src/pages/QuestionAdd.tsx`（改成 sheet 4 入口；保留手输 inline）
- Modify: `frontend/src/routes.tsx`（加 4 个新路由）
- Create: `frontend/src/pages/QuestionFromPrompt.tsx`
- Create: `frontend/src/pages/QuestionConfirm.tsx`（共用编辑确认页）

由于这 task 改动较大，分小步。

- [ ] **Step 1: 改 frontend/src/api/client.ts**

加 4 个 method + 调整 createQuestion 返回类型 + 加 CandidateQuestion 类型。在文件 type 区追加：

```ts
export type CandidateQuestion = {
  stem: string;
  options: { key: string; text: string }[];
  answer: string;
  explanation: string;
  tags: string[];
  difficulty: number;
};

export type SimilarQuestion = {
  id: string;
  stem: string;
  similarity: number;
};

export type QuestionSource = 'photo' | 'manual' | 'pdf' | 'ai_gen';
```

`Question` 类型加 `source` 字段：

```ts
export type Question = {
  id: string;
  stem: string;
  options: { key: string; text: string }[];
  answer: string;
  explanation: string | null;
  tags: string[];
  difficulty: number;
  source: QuestionSource;
};
```

修改 createQuestion 返回类型：

```ts
createQuestion: (
  pid: string,
  input: {
    stem: string;
    options: { key: string; text: string }[];
    answer: string;
    explanation?: string;
    tags?: string[];
    difficulty?: number;
    source?: QuestionSource;
    sourceMeta?: Record<string, unknown>;
  },
) => request<{ question: Question; similar: SimilarQuestion[] }>(`/profiles/${pid}/questions`, {
  method: 'POST',
  body: JSON.stringify(input),
}),
```

加 4 个新方法：

```ts
parseImage: (pid: string, file: File) => {
  const fd = new FormData();
  fd.set('image', file);
  return fetch(`/api${`/profiles/${pid}/parse/image`}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: fd,
  }).then(async (res) => {
    if (!res.ok) throw new Error(`parseImage ${res.status}: ${await res.text()}`);
    return res.json() as Promise<{ candidate: CandidateQuestion; source: 'photo' }>;
  });
},

parsePdf: (pid: string, file: File) => {
  const fd = new FormData();
  fd.set('pdf', file);
  return fetch(`/api${`/profiles/${pid}/parse/pdf`}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: fd,
  }).then(async (res) => {
    if (!res.ok) throw new Error(`parsePdf ${res.status}: ${await res.text()}`);
    return res.json() as Promise<{ candidates: CandidateQuestion[]; source: 'pdf'; count: number }>;
  });
},

parsePrompt: (pid: string, knowledge: string, difficulty: number) =>
  request<{ candidate: CandidateQuestion; source: 'ai_gen' }>(
    `/profiles/${pid}/parse/prompt`,
    { method: 'POST', body: JSON.stringify({ knowledge, difficulty }) },
  ),
```

注意 `request` 是已有的 fetch wrapper，但它默认 set 'Content-Type': 'application/json'。multipart 不能这样，所以 parseImage/parsePdf 走原生 fetch + 只 set Authorization。

- [ ] **Step 2: 改 routes.tsx 加 4 个新路由**

读 frontend/src/routes.tsx，追加 4 个 route entries：

```tsx
{ path: '/profiles/:pid/questions/from-image', element: <QuestionFromImage /> },
{ path: '/profiles/:pid/questions/from-pdf', element: <QuestionFromPDF /> },
{ path: '/profiles/:pid/questions/from-prompt', element: <QuestionFromPrompt /> },
{ path: '/profiles/:pid/questions/confirm', element: <QuestionConfirm /> },
```

加对应的 import:
```tsx
import { QuestionFromImage } from './pages/QuestionFromImage';
import { QuestionFromPDF } from './pages/QuestionFromPDF';
import { QuestionFromPrompt } from './pages/QuestionFromPrompt';
import { QuestionConfirm } from './pages/QuestionConfirm';
```

注意：T7 step 2 只先创建 QuestionFromPrompt 和 QuestionConfirm 实际文件，QuestionFromImage 和 QuestionFromPDF 由 T8/T9 创建。为了让 routes.tsx 能跑，T7 这步先创建两个 stub：

```bash
echo "import { Layout } from '../components/Layout';
export function QuestionFromImage() { return <Layout title='拍照识题'>TODO T8</Layout>; }" > /Users/lornax/Works/learn-or-die-lite/frontend/src/pages/QuestionFromImage.tsx

echo "import { Layout } from '../components/Layout';
export function QuestionFromPDF() { return <Layout title='PDF 上传'>TODO T9</Layout>; }" > /Users/lornax/Works/learn-or-die-lite/frontend/src/pages/QuestionFromPDF.tsx
```

- [ ] **Step 3: 改 QuestionAdd.tsx 成 4 入口 sheet**

把现有的"手输完整表单"改成 4 选项卡入口。点击「手输」展开内联表单（保留原 v0.0.1 表单），其他 3 项 navigate 跳转。

完整新内容：

```tsx
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Box } from '../components/Box';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { Check } from '../components/Check';
import { Input, Textarea } from '../components/Input';
import { Layout } from '../components/Layout';

const KEYS = ['A', 'B', 'C', 'D'] as const;

export function QuestionAdd() {
  const { pid } = useParams<{ pid: string }>();
  const nav = useNavigate();
  const [mode, setMode] = useState<'menu' | 'manual'>('menu');

  return (
    <Layout title="加题" back={() => mode === 'manual' ? setMode('menu') : nav(`/profiles/${pid}`)}>
      {mode === 'menu' && <Menu pid={pid!} onPickManual={() => setMode('manual')} />}
      {mode === 'manual' && <ManualForm pid={pid!} onDone={() => nav(`/profiles/${pid}`)} />}
    </Layout>
  );
}

function Menu({ pid, onPickManual }: { pid: string; onPickManual: () => void }) {
  const items: { icon: string; title: string; desc: string; onClick: () => void; href?: string }[] = [
    { icon: '✍', title: '手输', desc: '一道一道敲', onClick: onPickManual },
    { icon: '📷', title: '拍照识题', desc: '拍真题书页 AI 自动识别', onClick: () => {}, href: `/profiles/${pid}/questions/from-image` },
    { icon: '📁', title: 'PDF 导入', desc: '上传 PDF AI 解析批量入库', onClick: () => {}, href: `/profiles/${pid}/questions/from-pdf` },
    { icon: '🎲', title: 'AI 生成', desc: '给个知识点 AI 出题', onClick: () => {}, href: `/profiles/${pid}/questions/from-prompt` },
  ];
  return (
    <div className="space-y-2">
      <p className="font-cn text-sm text-ink-2 mb-3">选一个加题方式</p>
      {items.map((it, i) => {
        const inner = (
          <Box variant="soft" className="p-3 flex items-center gap-3 cursor-pointer hover:bg-chip-cream">
            <span className="text-2xl">{it.icon}</span>
            <div className="flex-1">
              <div className="font-cn font-bold">{it.title}</div>
              <div className="font-cn text-xs text-ink-2">{it.desc}</div>
            </div>
            <span className="font-cn text-xs text-ink-3">›</span>
          </Box>
        );
        return it.href ? (
          <Link key={i} to={it.href}>{inner}</Link>
        ) : (
          <div key={i} onClick={it.onClick}>{inner}</div>
        );
      })}
    </div>
  );
}

function ManualForm({ pid, onDone }: { pid: string; onDone: () => void }) {
  const [stem, setStem] = useState('');
  const [optionTexts, setOptionTexts] = useState(['', '', '', '']);
  const [answer, setAnswer] = useState<string>('A');
  const [explanation, setExplanation] = useState('');
  const [difficulty, setDifficulty] = useState(2);
  const [tagInput, setTagInput] = useState('NPDP');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setOption(i: number, text: string) {
    setOptionTexts((prev) => prev.map((t, idx) => (idx === i ? text : t)));
  }

  async function submit(continueAdd: boolean) {
    if (!stem.trim()) return setError('题干必填');
    const options = KEYS.map((k, i) => ({ key: k, text: optionTexts[i].trim() })).filter((o) => o.text);
    if (options.length < 2) return setError('至少 2 个选项');
    if (!options.find((o) => o.key === answer)) return setError('答案必须在选项中');

    setSubmitting(true);
    setError(null);
    try {
      await api.createQuestion(pid, {
        stem: stem.trim(),
        options,
        answer,
        explanation: explanation.trim() || undefined,
        tags: tagInput.split(',').map((s) => s.trim()).filter(Boolean),
        difficulty,
        source: 'manual',
      });
      if (continueAdd) {
        setStem('');
        setOptionTexts(['', '', '', '']);
        setAnswer('A');
        setExplanation('');
      } else {
        onDone();
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="font-cn font-bold text-sm block mb-1">题干</label>
        <Textarea value={stem} onChange={(e) => setStem(e.target.value)} rows={3} placeholder="把题目敲进来..." />
      </div>
      <div>
        <label className="font-cn font-bold text-sm block mb-1">选项 + 标记正确答案</label>
        <div className="space-y-2">
          {KEYS.map((k, i) => (
            <div key={k} className="flex items-center gap-2">
              <Check checked={answer === k} shape="circle" onClick={() => setAnswer(k)} />
              <span className="font-handBold font-bold w-4">{k}.</span>
              <Input value={optionTexts[i]} onChange={(e) => setOption(i, e.target.value)} placeholder={`选项 ${k}`} />
            </div>
          ))}
        </div>
      </div>
      <div>
        <label className="font-cn font-bold text-sm block mb-1">解析（选填）</label>
        <Textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={2} />
      </div>
      <div>
        <label className="font-cn font-bold text-sm block mb-1">标签（逗号分隔）</label>
        <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="NPDP, 基础" />
      </div>
      <div>
        <label className="font-cn font-bold text-sm block mb-1">难度</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((d) => (
            <Chip key={d} active={difficulty === d} onClick={() => setDifficulty(d)}>
              {'★'.repeat(d)}
            </Chip>
          ))}
        </div>
      </div>
      {error && (
        <Box variant="dashed" className="p-2">
          <p className="font-cn text-xs text-accent">{error}</p>
        </Box>
      )}
      <div className="flex gap-2 pt-2">
        <Button onClick={() => submit(true)} disabled={submitting} className="flex-1 justify-center text-xs">
          保存继续
        </Button>
        <Button variant="primary" onClick={() => submit(false)} disabled={submitting} className="flex-[1.4] justify-center">
          保存返回
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create QuestionFromPrompt.tsx**

```tsx
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Box } from '../components/Box';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { Input } from '../components/Input';
import { Layout } from '../components/Layout';

export function QuestionFromPrompt() {
  const { pid } = useParams<{ pid: string }>();
  const nav = useNavigate();
  const [knowledge, setKnowledge] = useState('');
  const [difficulty, setDifficulty] = useState(2);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    if (!knowledge.trim()) return setError('知识点必填');
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.parsePrompt(pid!, knowledge.trim(), difficulty);
      // 把 candidate 通过 location.state 传给 confirm 页
      nav(`/profiles/${pid}/questions/confirm`, {
        state: { candidate: res.candidate, source: 'ai_gen' },
      });
    } catch (e) {
      setError(String(e));
      setSubmitting(false);
    }
  }

  return (
    <Layout title="AI 出题" back={() => nav(`/profiles/${pid}/questions/new`)}>
      <div className="space-y-3">
        <p className="font-cn text-sm text-ink-2">
          给一个知识点 / 一段你想强化的内容，AI 帮你出一道选择题。
        </p>
        <div>
          <label className="font-cn font-bold text-sm block mb-1">知识点</label>
          <Input
            value={knowledge}
            onChange={(e) => setKnowledge(e.target.value)}
            placeholder="例：产品生命周期的成熟期特征"
          />
        </div>
        <div>
          <label className="font-cn font-bold text-sm block mb-1">难度</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((d) => (
              <Chip key={d} active={difficulty === d} onClick={() => setDifficulty(d)}>
                {'★'.repeat(d)}
              </Chip>
            ))}
          </div>
        </div>
        {error && (
          <Box variant="dashed" className="p-2">
            <p className="font-cn text-xs text-accent">{error}</p>
          </Box>
        )}
        <Button variant="primary" onClick={go} disabled={submitting} className="w-full justify-center">
          {submitting ? 'AI 出题中...（10-20s）' : 'AI 帮我出一道'}
        </Button>
      </div>
    </Layout>
  );
}
```

- [ ] **Step 5: Create QuestionConfirm.tsx**

这是 4 入口共用的编辑确认页。从 `location.state` 拿 candidate（单个）或 candidates（数组）+ source，让用户编辑后保存。

```tsx
import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, type CandidateQuestion, type QuestionSource, type SimilarQuestion } from '../api/client';
import { Box } from '../components/Box';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { Check } from '../components/Check';
import { Input, Textarea } from '../components/Input';
import { Layout } from '../components/Layout';

type LocationState = {
  candidate?: CandidateQuestion;
  candidates?: CandidateQuestion[];
  source: QuestionSource;
};

export function QuestionConfirm() {
  const { pid } = useParams<{ pid: string }>();
  const nav = useNavigate();
  const loc = useLocation();
  const state = loc.state as LocationState | null;

  if (!state || (!state.candidate && !state.candidates)) {
    return (
      <Layout title="确认" back={() => nav(`/profiles/${pid}`)}>
        <Box variant="dashed" className="p-4">
          <p className="font-cn text-sm text-ink-2">没有候选题。请先从加题入口进入。</p>
        </Box>
      </Layout>
    );
  }

  const queue = state.candidates ?? (state.candidate ? [state.candidate] : []);
  const [idx, setIdx] = useState(0);
  const current = queue[idx];

  return (
    <Layout title={`确认 ${idx + 1}/${queue.length}`} back={() => nav(`/profiles/${pid}`)}>
      <ConfirmOne
        key={idx}
        pid={pid!}
        candidate={current}
        source={state.source}
        onSavedNext={() => {
          if (idx + 1 < queue.length) setIdx(idx + 1);
          else nav(`/profiles/${pid}`);
        }}
        onSkip={() => {
          if (idx + 1 < queue.length) setIdx(idx + 1);
          else nav(`/profiles/${pid}`);
        }}
      />
    </Layout>
  );
}

function ConfirmOne({
  pid,
  candidate,
  source,
  onSavedNext,
  onSkip,
}: {
  pid: string;
  candidate: CandidateQuestion;
  source: QuestionSource;
  onSavedNext: () => void;
  onSkip: () => void;
}) {
  const [stem, setStem] = useState(candidate.stem);
  const [optionTexts, setOptionTexts] = useState(() => {
    const arr = ['', '', '', ''];
    candidate.options.forEach((o, i) => { if (i < 4) arr[i] = o.text; });
    return arr;
  });
  const KEYS = ['A', 'B', 'C', 'D'] as const;
  const [answer, setAnswer] = useState<string>(candidate.answer);
  const [explanation, setExplanation] = useState(candidate.explanation || '');
  const [difficulty, setDifficulty] = useState(candidate.difficulty);
  const [tagInput, setTagInput] = useState(candidate.tags.join(', '));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [similar, setSimilar] = useState<SimilarQuestion[] | null>(null);

  function setOption(i: number, text: string) {
    setOptionTexts((prev) => prev.map((t, idx) => (idx === i ? text : t)));
  }

  async function save() {
    if (!stem.trim()) return setError('题干必填');
    const options = KEYS.map((k, i) => ({ key: k, text: optionTexts[i].trim() })).filter((o) => o.text);
    if (options.length < 2) return setError('至少 2 个选项');
    if (!options.find((o) => o.key === answer)) return setError('答案必须在选项中');

    setSubmitting(true);
    setError(null);
    try {
      const res = await api.createQuestion(pid, {
        stem: stem.trim(),
        options,
        answer,
        explanation: explanation.trim() || undefined,
        tags: tagInput.split(',').map((s) => s.trim()).filter(Boolean),
        difficulty,
        source,
      });
      if (res.similar.length > 0) {
        setSimilar(res.similar);
        // 显示警告，让用户决定是不是放弃刚保存的（v0.0.2 简化：保存成功了就保存了，提示但不回滚）
      } else {
        onSavedNext();
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (similar) {
    return (
      <div className="space-y-3">
        <Box variant="thick" className="p-3 bg-chip-cream">
          <p className="font-cn font-bold mb-2">⚠️ 题库里有相似的题</p>
          {similar.map((s) => (
            <div key={s.id} className="font-cn text-sm mb-1">
              · {s.stem.slice(0, 50)}{s.stem.length > 50 ? '...' : ''}
              <span className="text-ink-3 text-xs ml-1">（{(s.similarity * 100).toFixed(0)}%）</span>
            </div>
          ))}
          <p className="font-cn text-xs text-ink-2 mt-2">
            题已保存。如果你确认重复，可以稍后从档案里删掉。
          </p>
        </Box>
        <Button variant="primary" onClick={onSavedNext} className="w-full justify-center">
          {queue_continue(onSavedNext)}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Box variant="dashed" className="p-2">
        <p className="font-cn text-xs text-ink-2">来源：{sourceLabel(source)} · AI 已识别 / 生成，请检查再保存</p>
      </Box>
      <div>
        <label className="font-cn font-bold text-sm block mb-1">题干</label>
        <Textarea value={stem} onChange={(e) => setStem(e.target.value)} rows={3} />
      </div>
      <div>
        <label className="font-cn font-bold text-sm block mb-1">选项 + 答案</label>
        <div className="space-y-2">
          {KEYS.map((k, i) => (
            <div key={k} className="flex items-center gap-2">
              <Check checked={answer === k} shape="circle" onClick={() => setAnswer(k)} />
              <span className="font-handBold font-bold w-4">{k}.</span>
              <Input value={optionTexts[i]} onChange={(e) => setOption(i, e.target.value)} placeholder={`选项 ${k}`} />
            </div>
          ))}
        </div>
      </div>
      <div>
        <label className="font-cn font-bold text-sm block mb-1">解析</label>
        <Textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={2} />
      </div>
      <div>
        <label className="font-cn font-bold text-sm block mb-1">标签</label>
        <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} />
      </div>
      <div>
        <label className="font-cn font-bold text-sm block mb-1">难度</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((d) => (
            <Chip key={d} active={difficulty === d} onClick={() => setDifficulty(d)}>
              {'★'.repeat(d)}
            </Chip>
          ))}
        </div>
      </div>
      {error && (
        <Box variant="dashed" className="p-2">
          <p className="font-cn text-xs text-accent">{error}</p>
        </Box>
      )}
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onSkip} className="flex-1 justify-center">跳过这题</Button>
        <Button variant="primary" onClick={save} disabled={submitting} className="flex-[1.4] justify-center">
          {submitting ? '保存中...' : '保存'}
        </Button>
      </div>
    </div>
  );
}

function sourceLabel(s: QuestionSource): string {
  return s === 'photo' ? '拍照识题' : s === 'pdf' ? 'PDF 导入' : s === 'ai_gen' ? 'AI 生成' : '手输';
}

// 因为该函数无法获得 queue 上下文，文案直接 hard-code
function queue_continue(_: () => void): string {
  return '继续';
}
```

注：上面 `queue_continue` 是占位写法，subagent 实施时直接把按钮文字写 `'继续'` 即可，不要保留这个无意义函数。改成：

```tsx
<Button variant="primary" onClick={onSavedNext} className="w-full justify-center">
  继续
</Button>
```

- [ ] **Step 6: TS check**

```bash
cd /Users/lornax/Works/learn-or-die-lite/frontend && npx tsc -b
```

期望：no errors。

- [ ] **Step 7: Commit**

```bash
cd /Users/lornax/Works/learn-or-die-lite && git add frontend/ && git commit -m "feat(frontend): 4-entry add sheet + AI prompt page + confirm page"
```

期望：27 commits。

---

### Task 8: 拍照识题页

**Files:**
- Modify: `frontend/src/pages/QuestionFromImage.tsx`

- [ ] **Step 1: 替换 QuestionFromImage.tsx**

```tsx
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Box } from '../components/Box';
import { Button } from '../components/Button';
import { Layout } from '../components/Layout';

export function QuestionFromImage() {
  const { pid } = useParams<{ pid: string }>();
  const nav = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) return setError('请选图片文件');
    if (f.size > 8 * 1024 * 1024) return setError('图片超过 8MB');
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
  }

  async function go() {
    if (!file) return setError('先选一张图');
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.parseImage(pid!, file);
      nav(`/profiles/${pid}/questions/confirm`, {
        state: { candidate: res.candidate, source: 'photo' },
      });
    } catch (e) {
      setError(String(e));
      setSubmitting(false);
    }
  }

  return (
    <Layout title="拍照识题" back={() => nav(`/profiles/${pid}/questions/new`)}>
      <div className="space-y-3">
        <p className="font-cn text-sm text-ink-2">
          从相册选一张题目截图 / 拍照，AI 自动识别题干、选项、答案。
        </p>
        <label className="block">
          <Box variant="dashed" className="p-6 text-center cursor-pointer hover:bg-chip-cream">
            <p className="font-cn text-sm">{file ? file.name : '点这里选图（或拍照）'}</p>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={pick}
              className="hidden"
            />
          </Box>
        </label>
        {preview && (
          <Box variant="soft" className="p-2">
            <img src={preview} alt="preview" className="w-full max-h-80 object-contain" />
          </Box>
        )}
        {error && (
          <Box variant="dashed" className="p-2">
            <p className="font-cn text-xs text-accent">{error}</p>
          </Box>
        )}
        <Button variant="primary" onClick={go} disabled={!file || submitting} className="w-full justify-center">
          {submitting ? '识别中...（10-30s）' : '开始识别'}
        </Button>
      </div>
    </Layout>
  );
}
```

- [ ] **Step 2: TS check + commit**

```bash
cd /Users/lornax/Works/learn-or-die-lite/frontend && npx tsc -b
cd /Users/lornax/Works/learn-or-die-lite && git add frontend/src/pages/QuestionFromImage.tsx && git commit -m "feat(frontend): photo-recognition entry page"
```

期望：28 commits。

---

### Task 9: PDF 上传页

**Files:**
- Modify: `frontend/src/pages/QuestionFromPDF.tsx`

- [ ] **Step 1: 替换 QuestionFromPDF.tsx**

```tsx
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Box } from '../components/Box';
import { Button } from '../components/Button';
import { Layout } from '../components/Layout';

export function QuestionFromPDF() {
  const { pid } = useParams<{ pid: string }>();
  const nav = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.pdf')) return setError('请选 PDF 文件');
    if (f.size > 20 * 1024 * 1024) return setError('PDF 超过 20MB');
    setFile(f);
    setError(null);
  }

  async function go() {
    if (!file) return setError('先选一个 PDF');
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.parsePdf(pid!, file);
      if (res.candidates.length === 0) {
        setError('没识别出任何题');
        setSubmitting(false);
        return;
      }
      nav(`/profiles/${pid}/questions/confirm`, {
        state: { candidates: res.candidates, source: 'pdf' },
      });
    } catch (e) {
      setError(String(e));
      setSubmitting(false);
    }
  }

  return (
    <Layout title="PDF 导入" back={() => nav(`/profiles/${pid}/questions/new`)}>
      <div className="space-y-3">
        <p className="font-cn text-sm text-ink-2">
          上传一份 NPDP 真题 PDF（≤20MB），AI 解析后让你逐题确认。
        </p>
        <label className="block">
          <Box variant="dashed" className="p-6 text-center cursor-pointer hover:bg-chip-cream">
            <p className="font-cn text-sm">
              {file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB` : '点这里选 PDF'}
            </p>
            <input type="file" accept="application/pdf,.pdf" onChange={pick} className="hidden" />
          </Box>
        </label>
        {error && (
          <Box variant="dashed" className="p-2">
            <p className="font-cn text-xs text-accent">{error}</p>
          </Box>
        )}
        <Button variant="primary" onClick={go} disabled={!file || submitting} className="w-full justify-center">
          {submitting ? '解析中...（30-60s）' : '开始解析'}
        </Button>
        <Box variant="dashed" className="p-2">
          <p className="font-cn text-xs text-ink-3">
            提示：扫描版图片型 PDF 可能识别效果差，建议用文本可选 PDF。
          </p>
        </Box>
      </div>
    </Layout>
  );
}
```

- [ ] **Step 2: TS check + commit**

```bash
cd /Users/lornax/Works/learn-or-die-lite/frontend && npx tsc -b
cd /Users/lornax/Works/learn-or-die-lite && git add frontend/src/pages/QuestionFromPDF.tsx && git commit -m "feat(frontend): pdf import entry page"
```

期望：29 commits。

---

## Phase E · 收尾

### Task 10: 修复 ProfileDetail 的 createQuestion 类型 + 验证

T6 改了 createQuestion 返回类型 `<Question>` → `{question, similar}`，前端 `api.createQuestion` 已经在 T7 step 1 改对了。但 ProfileDetail 显示题数仍然依赖 `listQuestions`（不变），所以这步只验证全栈编译。

- [ ] **Step 1: TS check 整体编译**

```bash
cd /Users/lornax/Works/learn-or-die-lite/frontend && npx tsc -b && cd ../backend && npx tsc
```

期望：全过。

- [ ] **Step 2: 跑后端测试**

```bash
export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH" && cd /Users/lornax/Works/learn-or-die-lite/backend && npm test
```

期望：32 passed（v0.0.1 18 + smoke 4 + parse mock 10）。

如果有 fail，看是哪个：
- v0.0.1 attempts test fail → 大概率是 createQuestion 返回类型变了，attempts.test.ts 引用 `q.id` 现在是 `q.question.id`
- 修复后再跑

- [ ] **Step 3: Commit （如果有 fix）**

如果 step 2 有改动，commit 这些修复：

```bash
cd /Users/lornax/Works/learn-or-die-lite && git add backend/tests/ && git commit -m "fix(backend): adapt v0.0.1 tests to new createQuestion return shape"
```

期望：30 commits（如果有 fix）或 29 commits（如果不需要 fix）。

---

### Task 11: e2e 验收 + tag v0.0.2

- [ ] **Step 1: 提示用户配置 .env**

⚠️ 在浏览器 e2e 之前，作者必须在 `backend/.env` 加一行：
```
DASHSCOPE_API_KEY=<your-dashscope-api-key>
```
（用作者自己的 dashscope key）

- [ ] **Step 2: 启动前后端，作者亲自浏览器走完 4 入口**

不在 subagent 范围。subagent 只跑：
1. backend npm test 全 PASS
2. frontend npm run build 编译通过
3. AI smoke test（如果 DASHSCOPE_API_KEY 已设）真实调用 dashscope 一次，不报错就算 OK

```bash
export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH" && cd /Users/lornax/Works/learn-or-die-lite/backend && npm test && cd ../frontend && npm run build
```

- [ ] **Step 3: 更新 CLAUDE.md 加 dashscope 提示**

读 CLAUDE.md，在 Quick Start 后加一段：

```markdown
### v0.0.2+ AI 调用

`backend/.env` 必须设 `DASHSCOPE_API_KEY=sk-xxx`（阿里云通义千问百炼平台）。模型：
- `qwen-vl-max` 拍照识题
- `qwen-max` AI 生成 / PDF 结构化
- `text-embedding-v3` 查重 embedding
```

- [ ] **Step 4: Commit + tag**

```bash
cd /Users/lornax/Works/learn-or-die-lite && git add CLAUDE.md && git commit -m "docs: add v0.0.2 dashscope env note"
git tag v0.0.2
git log --oneline | head -10
git tag
```

期望：~31 commits + tag v0.0.2。

---

## 完工 checklist

- [ ] 11 个 task 全部 commit
- [ ] backend `npm test` 全 PASS（含 AI smoke 4 个走真实 API）
- [ ] frontend `npm run build` 编译通过
- [ ] 浏览器走通 4 入口（手输 / 拍照 / PDF / AI 生成）
- [ ] 拍 NPDP 真题书页 → AI 识别 → 编辑确认 → 保存
- [ ] AI 出题 → 编辑确认 → 保存
- [ ] PDF 上传 → 多题逐个确认 → 保存
- [ ] 重复题保存时弹相似题提示
- [ ] git tag v0.0.2
