# learn-or-die-lite v0.0.2.1 hotfix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox.

**Goal:** 修 v0.0.2 真实使用中暴露的 4 类问题（拍照答案歧义、查重 UX 太弱、AI 出题缺 context、题库无管理 UI），加 staged loading 体验。

**Tech context:** 沿用 v0.0.2 全部技术栈。dashscope 已配 key（实际 .env 已设）。后端测试库 = 开发库。

**估时:** 3 天 / 8-10 小时。

---

## 8 个 task 概览

| # | 内容 | 估时 |
|---|---|---|
| T1 | 后端 - 拍照答案歧义（prompt allow empty + parser + AI 解题端点 + tests） | 0.5d |
| T2 | 前端 - 拍照答案歧义 UI（empty answer 提示 + AI 解题按钮） | 0.3d |
| T3 | 后端 - similar 补全字段 + DELETE/PATCH/tags 端点 + tests | 0.5d |
| T4 | 前端 - 查重 UX 大改（新旧对比 + 答案不一致红字 + 单题 3 决策 + 批量按钮） | 0.6d |
| T5 | 前端 - AI 出题改进（章节/考点 input + 去默认标签 + 历史标签 chip） | 0.3d |
| T6 | 前端 - 题库管理 UI（list / edit / delete page） | 0.7d |
| T7 | 前端 - StagedLoader 组件 + 应用到 3 个 LLM 调用页 | 0.3d |
| T8 | 收尾 + tag v0.0.2.1 | 0.2d |

---

## Task 1: 后端拍照答案歧义

**Files:**
- Modify: `backend/src/ai/prompts.ts`
- Modify: `backend/src/ai/parser.ts`
- Modify: `backend/src/ai/client.ts` (add solveQuestion fn)
- Create: `backend/src/routes/solve.ts` (POST /api/questions/:qid/solve)
- Modify: `backend/src/index.ts` (mount solveRouter at /api)
- Modify: `backend/tests/parse.test.ts` (mock returns answer:'' case)
- Create: `backend/tests/solve.test.ts`

### 1.1 prompts.ts: 改 VISION_RECOGNIZE_PROMPT

把 "answer 必须是 options 里某个 key" 改为 "**如果原图明确标注了答案** answer 填对应 key，**没有标注就返回空字符串 ""**，不要编造"。

并新增一个 SOLVE_PROMPT（给 AI 解题用）：

```ts
export const SOLVE_PROMPT = `你是一个 NPDP 解题专家。下面是一道选择题，请推理出最可能的正确答案。

题干：{stem}
选项：{options}

返回严格的 JSON：
{
  "answer": "B",
  "explanation": "为什么选这个，至少 50 字"
}

answer 必须是给的某个选项 key。只返回 JSON，无 markdown。`;
```

### 1.2 parser.ts: candidateQuestionSchema.answer 允许空

```ts
answer: z.string().max(20).default(''),
```

`parseCandidateOrThrow` 改：把"answer 必须在 options 里"逻辑变成 **only when answer 非空 才校验**：

```ts
if (result.data.answer && !keys.includes(result.data.answer)) {
  throw new Error(`AI answer "${result.data.answer}" not in options ${keys.join(',')}`);
}
```

`parseCandidateArrayOrThrow` 同改。

### 1.3 client.ts: 加 solveQuestion

```ts
import { SOLVE_PROMPT } from './prompts.js';

export async function solveQuestion(
  stem: string,
  options: { key: string; text: string }[],
): Promise<{ answer: string; explanation: string }> {
  const optionsStr = options.map((o) => `${o.key}. ${o.text}`).join('\n');
  const r = await client.chat.completions.create({
    model: MODEL_TEXT,
    messages: [
      { role: 'system', content: SOLVE_PROMPT.replace('{stem}', stem).replace('{options}', optionsStr) },
    ],
    temperature: 0.3,
  });
  const raw = r.choices[0]?.message?.content ?? '';
  const json = raw.trim().replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```$/, '');
  const obj = JSON.parse(json);
  if (typeof obj.answer !== 'string' || typeof obj.explanation !== 'string') {
    throw new Error(`solveQuestion bad return: ${raw}`);
  }
  if (!options.find((o) => o.key === obj.answer)) {
    throw new Error(`solveQuestion answer "${obj.answer}" not in options`);
  }
  return obj;
}
```

### 1.4 routes/solve.ts: POST /api/questions/:qid/solve

按需求设计。读题（要做 ownership 检查）→ 调 solveQuestion → 返回 { answer, explanation }。

```ts
import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import type { AuthVars } from '../middleware/auth.js';
import { solveQuestion } from '../ai/client.js';

const router = new Hono<{ Variables: AuthVars }>();

router.post('/questions/:qid/solve', async (c) => {
  const userId = c.get('userId');
  const qid = c.req.param('qid');
  const [row] = await db
    .select({ q: schema.questions, p: schema.profiles })
    .from(schema.questions)
    .innerJoin(schema.profiles, eq(schema.questions.profileId, schema.profiles.id))
    .where(eq(schema.questions.id, qid))
    .limit(1);
  if (!row || row.p.userId !== userId) return c.json({ error: 'not_found' }, 404);

  try {
    const r = await solveQuestion(row.q.stem, row.q.options);
    return c.json(r);
  } catch (e) {
    return c.json({ error: 'ai_failed', detail: String(e) }, 502);
  }
});

export { router as solveRouter };
```

但**重要场景**：AI 解题往往是在题还没保存时调（用户在编辑确认页发现 answer 为空想让 AI 解）。所以应该再加一个**不需要 question id 的端点**：

```ts
router.post('/solve-candidate', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || !body.stem || !Array.isArray(body.options)) {
    return c.json({ error: 'invalid_body' }, 400);
  }
  try {
    const r = await solveQuestion(body.stem, body.options);
    return c.json(r);
  } catch (e) {
    return c.json({ error: 'ai_failed', detail: String(e) }, 502);
  }
});
```

挂载点：`/api/solve-candidate` 和 `/api/questions/:qid/solve`。两个端点共享 router。

### 1.5 index.ts mount

```ts
import { solveRouter } from './routes/solve.js';
app.route('/api', solveRouter);
```

### 1.6 测试

`backend/tests/solve.test.ts`：mock solveQuestion 返回固定值，2 个 case：
- POST /solve-candidate 不要 auth（应该要，加 auth header）
- 返回 mocked answer

注意 vi.mock 要 mock `'../src/ai/client.js'` 添加 solveQuestion。同时记得**更新 parse.test.ts 现有 mock**——`recognizeQuestionFromImage` 的 mock 现在可以测一个 answer:'' 的场景验证 parser allow empty。

### 1.7 跑测试 + commit

```bash
export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH" && cd /Users/lornax/Works/learn-or-die-lite/backend && npm test
```

期望：≥ 32 passed (原 32 + solve 新增 case)。

```bash
cd /Users/lornax/Works/learn-or-die-lite && git add backend/ && git commit -m "fix(backend): allow empty answer in vision parse + add solve-candidate endpoint"
```

---

## Task 2: 前端拍照答案歧义 UI

**Files:**
- Modify: `frontend/src/api/client.ts` (add solveCandidate method)
- Modify: `frontend/src/pages/QuestionConfirm.tsx` (empty answer UI + AI 解题按钮)

### 2.1 api/client.ts add solveCandidate

```ts
solveCandidate: (stem: string, options: { key: string; text: string }[]) =>
  request<{ answer: string; explanation: string }>(
    `/solve-candidate`,
    { method: 'POST', body: JSON.stringify({ stem, options }) },
  ),
```

### 2.2 QuestionConfirm.tsx 改

ConfirmOne 组件里：

- 初始化 `answer` state 时不再 default 'A'，用 `candidate.answer || ''`
- 在选项块**上方**条件渲染：
  ```tsx
  {!answer && (
    <Box variant="dashed" className="p-2 bg-chip-cream">
      <p className="font-cn text-xs mb-2">⚠️ AI 没识别出标准答案，需要你处理：</p>
      <div className="flex gap-2">
        <Button onClick={solveByAI} disabled={solving} className="flex-1 justify-center text-xs">
          {solving ? '🤖 AI 解题中…' : '🤖 让 AI 解一下'}
        </Button>
        <Button variant="ghost" onClick={() => {}} className="flex-1 justify-center text-xs">
          自己选下面一个
        </Button>
      </div>
    </Box>
  )}
  ```

- 加 state `solving` + 函数 `solveByAI`：
  ```tsx
  const [solving, setSolving] = useState(false);
  async function solveByAI() {
    const opts = KEYS.map((k, i) => ({ key: k, text: optionTexts[i].trim() })).filter((o) => o.text);
    if (opts.length < 2) return setError('要先填好选项再让 AI 解');
    setSolving(true);
    try {
      const r = await api.solveCandidate(stem.trim(), opts);
      setAnswer(r.answer);
      if (!explanation.trim()) setExplanation(r.explanation);
    } catch (e) {
      setError(String(e));
    } finally {
      setSolving(false);
    }
  }
  ```

- 选项渲染部分：如果 `answer === ''` 不预选任何 radio。原有 `Check checked={answer === k}` 自动满足（空字符串不等于任何 key，所以全 unchecked）。

- 保存校验逻辑：`if (!options.find((o) => o.key === answer))` 改成更精确的错误提示——"未选答案"。

### 2.3 typecheck + commit

```bash
cd /Users/lornax/Works/learn-or-die-lite/frontend && npx tsc -b
git add frontend/ && git commit -m "feat(frontend): handle empty AI-recognized answer + AI solve button"
```

---

## Task 3: 后端 similar 补全 + DELETE/PATCH/tags 端点

**Files:**
- Modify: `backend/src/routes/questions.ts` (similar 含 options/answer/explanation, +DELETE +PATCH)
- Create: `backend/src/routes/tags.ts` (GET /api/profiles/:pid/tags)
- Modify: `backend/src/index.ts` (mount tagsRouter)
- Modify: `backend/tests/questions.test.ts` (适配 similar 新字段 + 测 DELETE/PATCH)

### 3.1 routes/questions.ts: similar 字段补全

修改 createQuestion 末尾的 similar 构造：

```ts
similar.push({
  id: o.id,
  stem: o.stem,
  options: o.options,
  answer: o.answer,
  explanation: o.explanation,
  similarity: Number(sim.toFixed(4)),
});
```

select 也要扩展：

```ts
.select({
  id: schema.questions.id,
  stem: schema.questions.stem,
  options: schema.questions.options,
  answer: schema.questions.answer,
  explanation: schema.questions.explanation,
  embedding: schema.questions.embedding,
})
```

### 3.2 routes/questions.ts: 加 DELETE + PATCH

```ts
router.delete('/questions/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const [row] = await db
    .select({ q: schema.questions, p: schema.profiles })
    .from(schema.questions)
    .innerJoin(schema.profiles, eq(schema.questions.profileId, schema.profiles.id))
    .where(eq(schema.questions.id, id))
    .limit(1);
  if (!row || row.p.userId !== userId) return c.json({ error: 'not_found' }, 404);
  await db.delete(schema.questions).where(eq(schema.questions.id, id));
  return c.json({ ok: true });
});

const patchSchema = z.object({
  stem: z.string().min(1).max(2000).optional(),
  options: z.array(optionSchema).min(2).max(8).optional(),
  answer: z.string().max(20).optional(),
  explanation: z.string().max(2000).nullable().optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
});

router.patch('/questions/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const [row] = await db
    .select({ q: schema.questions, p: schema.profiles })
    .from(schema.questions)
    .innerJoin(schema.profiles, eq(schema.questions.profileId, schema.profiles.id))
    .where(eq(schema.questions.id, id))
    .limit(1);
  if (!row || row.p.userId !== userId) return c.json({ error: 'not_found' }, 404);

  const body = await c.req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'invalid_body', details: parsed.error.flatten() }, 400);

  // 如果 answer 被改且非空，校验在 options 里（取本次 options 或原 options）
  const finalOptions = parsed.data.options ?? row.q.options;
  if (parsed.data.answer && !finalOptions.map((o) => o.key).includes(parsed.data.answer)) {
    return c.json({ error: 'answer_not_in_options' }, 400);
  }

  // 如果 stem 改了，重新算 embedding（其他字段改不影响 embedding）
  let updates: any = { ...parsed.data };
  if (parsed.data.stem && parsed.data.stem !== row.q.stem) {
    try {
      const [vec] = await embed([parsed.data.stem]);
      updates.embedding = vec ?? null;
    } catch (e) {
      console.error('embed failed during patch:', e);
    }
  }

  const [updated] = await db
    .update(schema.questions)
    .set(updates)
    .where(eq(schema.questions.id, id))
    .returning();
  return c.json(updated);
});
```

### 3.3 routes/tags.ts: GET /api/profiles/:pid/tags

返回该 profile 下所有 tag 集合，按使用次数降序：

```ts
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

  // 用原生 SQL 拆 jsonb array 聚合
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
```

### 3.4 index.ts mount

```ts
import { tagsRouter } from './routes/tags.js';
app.route('/api', tagsRouter);
```

### 3.5 测试

questions.test.ts 添加：
- `'deletes question'` test
- `'patches stem'` test
- `'patches answer with options validation'` test
- `'similar includes options/answer fields'` test (cosineSimilarity mock 改返回 0.9 触发 similar)

跑测试：
```bash
export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH" && cd /Users/lornax/Works/learn-or-die-lite/backend && npm test
```

预期：原测试通过 + 新增 case 通过。tags 端点目前没单独 test，可加可不加（v0.0.2.1 阶段简化）。

### 3.6 commit

```bash
git add backend/ && git commit -m "feat(backend): expand similar fields + add DELETE/PATCH question + tags endpoint"
```

---

## Task 4: 前端查重 UX 大改

**Files:**
- Modify: `frontend/src/api/client.ts` (扩 SimilarQuestion 类型 + 加 deleteQuestion + patchQuestion methods)
- Modify: `frontend/src/pages/QuestionConfirm.tsx` (新旧对比 UI + 单题 3 决策 + 批量按钮)

### 4.1 api/client.ts

```ts
// 扩展 SimilarQuestion
export type SimilarQuestion = {
  id: string;
  stem: string;
  options: { key: string; text: string }[];
  answer: string;
  explanation: string | null;
  similarity: number;
};

// 加方法
deleteQuestion: (id: string) => request<{ ok: true }>(`/questions/${id}`, { method: 'DELETE' }),
patchQuestion: (id: string, input: Partial<{ stem: string; options: { key: string; text: string }[]; answer: string; explanation: string | null; tags: string[]; difficulty: number }>) =>
  request<Question>(`/questions/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
```

### 4.2 QuestionConfirm.tsx 重设计

**两层模式**（影响整个页面 state）：
- `bulkMode: 'none' | 'keep_all' | 'skip_all'` 顶部控制
- 在 PDF 多题队列场景下顶部显示批量按钮
- bulkMode=keep_all → 后续保存遇到 similar 自动调 onSavedNext（不弹决策 UI）
- bulkMode=skip_all → 后续保存如果有 similar，自动调 deleteQuestion 删新建 + onSavedNext

**当用户 save 后 res.similar.length > 0**：

```tsx
if (res.similar.length > 0) {
  if (bulkMode === 'keep_all') return onSavedNext();
  if (bulkMode === 'skip_all') {
    await api.deleteQuestion(res.question.id);
    return onSavedNext();
  }
  // 否则进入决策 UI
  setSavedQuestion(res.question);
  setSimilar(res.similar);
}
```

**决策 UI（当 similar 设置后渲染）**：

```tsx
function SimilarDecision({
  newQ,
  similar,
  onResolve,  // 调用方处理删除等动作并 onSavedNext
}: {
  newQ: Question;
  similar: SimilarQuestion[];
  onResolve: (action: 'keep_new' | 'keep_old' | 'keep_both') => Promise<void>;
}) {
  return (
    <div className="space-y-3">
      <Box variant="thick" className="p-3 bg-chip-cream">
        <p className="font-cn font-bold text-sm">⚠️ 题库里有相似题</p>
      </Box>

      <Box variant="soft" className="p-3">
        <div className="font-cn text-xs text-ink-2 mb-1">你刚加的（新）</div>
        <p className="font-cn text-sm font-bold mb-2">{newQ.stem}</p>
        {newQ.options.map((o) => (
          <div key={o.key} className="font-cn text-xs">
            {o.key}. {o.text} {o.key === newQ.answer && <span className="text-accent-4">✓</span>}
          </div>
        ))}
      </Box>

      {similar.map((s) => {
        const answerDiffer = s.answer !== newQ.answer;
        return (
          <Box key={s.id} variant="soft" className={`p-3 ${answerDiffer ? 'border-accent border-2' : ''}`}>
            <div className="font-cn text-xs text-ink-2 mb-1">已有（相似度 {(s.similarity * 100).toFixed(0)}%）</div>
            <p className="font-cn text-sm font-bold mb-2">{s.stem}</p>
            {s.options.map((o) => (
              <div key={o.key} className="font-cn text-xs">
                {o.key}. {o.text} {o.key === s.answer && <span className="text-accent-4">✓</span>}
              </div>
            ))}
            {answerDiffer && (
              <p className="font-cn text-xs text-accent mt-2 font-bold">⚠️ 答案不一样！自己核对一下</p>
            )}
          </Box>
        );
      })}

      <div className="space-y-2">
        <Button variant="primary" onClick={() => onResolve('keep_new')} className="w-full justify-center">
          保留新题，删旧题
        </Button>
        <Button onClick={() => onResolve('keep_old')} className="w-full justify-center">
          丢弃新题，保留旧题
        </Button>
        <Button variant="ghost" onClick={() => onResolve('keep_both')} className="w-full justify-center">
          都保留（不是重复）
        </Button>
      </div>
    </div>
  );
}
```

**resolve 逻辑**：

```tsx
async function handleResolve(action: 'keep_new' | 'keep_old' | 'keep_both') {
  if (action === 'keep_new') {
    for (const s of similar) await api.deleteQuestion(s.id);
  } else if (action === 'keep_old') {
    await api.deleteQuestion(savedQuestion.id);
  }
  // keep_both 不删
  setSimilar(null);
  setSavedQuestion(null);
  onSavedNext();
}
```

**批量按钮**（顶部，只在 queue.length > 1 时显示）：

```tsx
{queue.length > 1 && bulkMode === 'none' && (
  <div className="flex gap-2 mb-2">
    <Button variant="ghost" onClick={() => setBulkMode('keep_all')} className="flex-1 justify-center text-xs">
      全部都保留（无视相似警告）
    </Button>
    <Button variant="ghost" onClick={() => setBulkMode('skip_all')} className="flex-1 justify-center text-xs">
      全部跳过相似的
    </Button>
  </div>
)}
{bulkMode !== 'none' && (
  <Box variant="dashed" className="p-2 mb-2">
    <span className="font-cn text-xs">批量模式：{bulkMode === 'keep_all' ? '全保留' : '跳过相似'}</span>
    <Button variant="ghost" onClick={() => setBulkMode('none')} className="ml-2 text-xs">取消</Button>
  </Box>
)}
```

bulkMode 提到 `QuestionConfirm` 顶层（不是 ConfirmOne），通过 props 传给 ConfirmOne。

### 4.3 typecheck + commit

```bash
cd /Users/lornax/Works/learn-or-die-lite/frontend && npx tsc -b
git add frontend/ && git commit -m "feat(frontend): rewrite similar question UX with side-by-side compare and bulk actions"
```

---

## Task 5: 前端 AI 出题改进

**Files:**
- Modify: `frontend/src/api/client.ts` (parsePrompt 加 chapter/topics 参数 + 加 listTags method)
- Modify: `backend/src/routes/parse.ts` + `backend/src/ai/prompts.ts` (PROMPT_GEN_PROMPT 接收章节/考点)
- Modify: `frontend/src/pages/QuestionFromPrompt.tsx`

### 5.1 后端 prompt 调整

`prompts.ts` PROMPT_GEN_PROMPT 改：

```ts
export const PROMPT_GEN_PROMPT = `你是一个 NPDP 出题专家。根据用户给的知识点 + 上下文，出一道高质量选择题。

返回 JSON：
{
  "stem": "...",
  "options": [{"key":"A","text":"..."},...],
  "answer": "B",
  "explanation": "至少 50 字...",
  "tags": [],
  "difficulty": <用户指定难度>
}

规则：
- 只返回 JSON，无 markdown
- 4 个选项互斥具迷惑性
- explanation ≥ 50 字
- tags 留空数组（用户会自己加）
- 紧扣用户给的章节 / 考点信息`;
```

`client.ts` `generateQuestionFromPrompt` 函数签名改：

```ts
export async function generateQuestionFromPrompt(
  knowledge: string,
  difficulty = 2,
  chapter?: string,
  topics?: string,
): Promise<CandidateQuestion> {
  const userMsg = [
    `知识点：${knowledge}`,
    chapter ? `教材章节：${chapter}` : '',
    topics ? `考点关键词：${topics}` : '',
    `难度：${difficulty}`,
  ].filter(Boolean).join('\n');
  
  const r = await client.chat.completions.create({
    model: MODEL_TEXT,
    messages: [
      { role: 'system', content: PROMPT_GEN_PROMPT },
      { role: 'user', content: userMsg },
    ],
    temperature: 0.7,
  });
  // rest unchanged
}
```

`routes/parse.ts` promptSchema 扩展：

```ts
const promptSchema = z.object({
  knowledge: z.string().min(2).max(500),
  difficulty: z.number().int().min(1).max(5).default(2),
  chapter: z.string().max(100).optional(),
  topics: z.string().max(200).optional(),
});

// handler 调用
const candidate = await generateQuestionFromPrompt(
  parsed.data.knowledge,
  parsed.data.difficulty,
  parsed.data.chapter,
  parsed.data.topics,
);
```

### 5.2 frontend api/client.ts

`parsePrompt` 签名调整：

```ts
parsePrompt: (pid: string, input: { knowledge: string; difficulty: number; chapter?: string; topics?: string }) =>
  request<{ candidate: CandidateQuestion; source: 'ai_gen' }>(
    `/profiles/${pid}/parse/prompt`,
    { method: 'POST', body: JSON.stringify(input) },
  ),
```

加 listTags：

```ts
listTags: (pid: string) => request<{ tag: string; cnt: number }[]>(`/profiles/${pid}/tags`),
```

### 5.3 QuestionFromPrompt.tsx 改

加 chapter / topics 两个 state + Input 元素。提交时传给 api.parsePrompt。

历史标签 chip：useEffect 拉 listTags(pid) 在 UI 顶部显示前 8 个 tag chip 让用户点击 append 到 topics 字段。

注意：默认 tagInput 在 QuestionConfirm 已经从 candidate.tags 拿（candidate.tags 现在 LLM 返空数组，所以前端 default 为空）。

### 5.4 typecheck + 后端 test

后端 prompts/parse 改了，跑 npm test 确认还过（mock 不应受影响）。

```bash
cd /Users/lornax/Works/learn-or-die-lite/backend && npm test
cd /Users/lornax/Works/learn-or-die-lite/frontend && npx tsc -b
```

### 5.5 commit

```bash
git add backend/ frontend/ && git commit -m "feat: AI generation with chapter/topics context + history tag chips"
```

---

## Task 6: 题库管理 UI

**Files:**
- Create: `frontend/src/pages/LibraryManage.tsx`
- Modify: `frontend/src/routes.tsx` (加 /profiles/:pid/library)
- Modify: `frontend/src/pages/ProfileDetail.tsx` (在"最近的题"右上角加"管理全部 →"链接)
- Modify: `frontend/src/api/client.ts` (deleteQuestion/patchQuestion 已在 T4 加)

### 6.1 LibraryManage.tsx

页面布局：
- 顶部搜索框（前端过滤 stem）
- 列表（所有 question，按 createdAt desc）
- 每条：题干前 80 字、source chip、难度、tag、答案预览
- 点击 → 进编辑模式（inline 或 modal，简单起见 inline 展开）
- 编辑模式有"保存"和"删除"按钮，调 patchQuestion / deleteQuestion

简化版（v0.0.2.1，避开过度工程）：

```tsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type Question } from '../api/client';
import { Box } from '../components/Box';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Layout } from '../components/Layout';

export function LibraryManage() {
  const { pid } = useParams<{ pid: string }>();
  const nav = useNavigate();
  const [list, setList] = useState<Question[] | null>(null);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!pid) return;
    api.listQuestions(pid).then(setList);
  }, [pid]);

  async function reload() {
    if (!pid) return;
    api.listQuestions(pid).then(setList);
  }

  async function handleDelete(id: string) {
    if (!confirm('确认删除？此操作不可撤销')) return;
    await api.deleteQuestion(id);
    reload();
  }

  const filtered = list?.filter((q) => !search || q.stem.includes(search) || q.tags.some((t) => t.includes(search))) ?? [];

  return (
    <Layout title={`题库（${list?.length ?? 0}）`} back={() => nav(`/profiles/${pid}`)}>
      <div className="space-y-2">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜题干 / 标签..." />
        {list === null && <p className="font-cn text-sm text-ink-2">加载中...</p>}
        {list?.length === 0 && (
          <Box variant="dashed" className="p-4 text-center">
            <p className="font-cn text-sm text-ink-2">题库还空着</p>
          </Box>
        )}
        {filtered.map((q) => (
          <Box key={q.id} variant="soft" className="p-3">
            {editingId === q.id ? (
              <EditQuestionInline q={q} onSaved={() => { setEditingId(null); reload(); }} onCancel={() => setEditingId(null)} />
            ) : (
              <div>
                <p className="font-cn text-sm leading-relaxed mb-1">{q.stem}</p>
                <div className="flex items-center gap-2 mt-1 text-xs">
                  <span className="font-cn text-ink-2">来源：{q.source}</span>
                  <span className="font-cn text-ink-2">难度 {'★'.repeat(q.difficulty)}</span>
                  <span className="font-cn text-ink-2">{q.tags.join('·')}</span>
                </div>
                <div className="font-cn text-xs text-ink-2 mt-1">答案：{q.answer || '<空>'}</div>
                <div className="flex gap-2 mt-2">
                  <Button onClick={() => setEditingId(q.id)} className="text-xs">编辑</Button>
                  <Button variant="ghost" onClick={() => handleDelete(q.id)} className="text-xs text-accent border-accent">删除</Button>
                </div>
              </div>
            )}
          </Box>
        ))}
      </div>
    </Layout>
  );
}
```

`EditQuestionInline` 组件：跟 ConfirmOne 类似但少了"相似题决策"逻辑。可以**复用**部分 ConfirmOne 的代码——但 v0.0.2.1 阶段简化：直接写一个简版（题干、4 选项、答案、解析、难度、保存/取消）。subagent 自己实现这个组件（参考 ConfirmOne 模板）。

```tsx
function EditQuestionInline({ q, onSaved, onCancel }: { q: Question; onSaved: () => void; onCancel: () => void }) {
  const [stem, setStem] = useState(q.stem);
  const [optionTexts, setOptionTexts] = useState(['', '', '', '']);
  // initialize from q.options
  useEffect(() => {
    const arr = ['', '', '', ''];
    q.options.forEach((o, i) => { if (i < 4) arr[i] = o.text; });
    setOptionTexts(arr);
  }, [q.id]);
  const KEYS = ['A', 'B', 'C', 'D'] as const;
  const [answer, setAnswer] = useState<string>(q.answer);
  const [explanation, setExplanation] = useState(q.explanation || '');
  const [difficulty, setDifficulty] = useState(q.difficulty);
  const [tagInput, setTagInput] = useState(q.tags.join(', '));
  const [submitting, setSubmitting] = useState(false);

  async function save() {
    setSubmitting(true);
    try {
      const options = KEYS.map((k, i) => ({ key: k, text: optionTexts[i].trim() })).filter((o) => o.text);
      await api.patchQuestion(q.id, {
        stem: stem.trim(),
        options,
        answer,
        explanation: explanation.trim() || null,
        tags: tagInput.split(',').map((s) => s.trim()).filter(Boolean),
        difficulty,
      });
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }
  // render form similar to ConfirmOne (reuse layout)
  // ...
}
```

### 6.2 routes.tsx 加路由 + ProfileDetail 加链接

```tsx
{ path: '/profiles/:pid/library', element: <LibraryManage /> },
```

ProfileDetail.tsx "最近的题" 标题旁加：

```tsx
<div className="flex items-center justify-between mb-2">
  <h2 className="font-display text-xl">最近的题</h2>
  <Link to={`/profiles/${pid}/library`} className="font-cn text-xs underline">管理全部 →</Link>
</div>
```

### 6.3 typecheck + commit

```bash
cd /Users/lornax/Works/learn-or-die-lite/frontend && npx tsc -b
git add frontend/ && git commit -m "feat(frontend): library manage page (list/edit/delete) + entry from profile detail"
```

---

## Task 7: StagedLoader 组件 + 应用

**Files:**
- Create: `frontend/src/components/StagedLoader.tsx`
- Modify: `frontend/src/pages/QuestionFromImage.tsx` (替换简单 spinner)
- Modify: `frontend/src/pages/QuestionFromPrompt.tsx`
- Modify: `frontend/src/pages/QuestionConfirm.tsx` (AI 解题 button 时也用 staged)

### 7.1 StagedLoader 组件

```tsx
import { useEffect, useState } from 'react';

type Stage = { label: string; emoji: string; minMs: number };

export function StagedLoader({
  stages,
  active,
}: {
  stages: Stage[];
  active: boolean;
}) {
  const [stageIdx, setStageIdx] = useState(0);
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!active) {
      setStageIdx(0);
      return;
    }
    let cancelled = false;
    let i = 0;
    function next() {
      if (cancelled || i >= stages.length - 1) return;
      setTimeout(() => {
        if (cancelled) return;
        i++;
        setStageIdx(i);
        next();
      }, stages[i].minMs);
    }
    next();
    return () => {
      cancelled = true;
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setDots((d) => (d.length >= 3 ? '' : d + '.')), 400);
    return () => clearInterval(t);
  }, [active]);

  if (!active) return null;
  return (
    <div className="space-y-2">
      {stages.map((s, i) => {
        const done = i < stageIdx;
        const active = i === stageIdx;
        return (
          <div key={i} className={`flex items-center gap-2 font-cn text-sm ${done ? 'opacity-60' : ''}`}>
            <span>{done ? '✓' : active ? s.emoji : '○'}</span>
            <span>{s.label}{active ? dots : ''}</span>
          </div>
        );
      })}
    </div>
  );
}
```

### 7.2 应用到 QuestionFromImage.tsx

替换原 `{submitting ? '识别中...（10-30s）' : '开始识别'}` 按钮文案 → 在 button 之上加 StagedLoader 组件：

```tsx
<StagedLoader
  active={submitting}
  stages={[
    { label: '上传图片', emoji: '📤', minMs: 1500 },
    { label: 'AI 看图思考', emoji: '👁', minMs: 8000 },
    { label: '整理结构化结果', emoji: '🧩', minMs: 3000 },
  ]}
/>
```

### 7.3 类似改 QuestionFromPrompt.tsx

```tsx
<StagedLoader
  active={submitting}
  stages={[
    { label: '理解你的知识点', emoji: '🤔', minMs: 4000 },
    { label: '构造选项与迷惑项', emoji: '✏️', minMs: 6000 },
    { label: '生成解析', emoji: '📝', minMs: 5000 },
  ]}
/>
```

### 7.4 QuestionConfirm.tsx AI 解题用 StagedLoader

```tsx
<StagedLoader
  active={solving}
  stages={[
    { label: '读题', emoji: '📖', minMs: 2000 },
    { label: '推理答案', emoji: '🧠', minMs: 5000 },
    { label: '写解析', emoji: '✍️', minMs: 4000 },
  ]}
/>
```

### 7.5 PDF 暂时保持原状

PDF 整改在 v0.0.2.2，这里不动。

### 7.6 typecheck + commit

```bash
cd /Users/lornax/Works/learn-or-die-lite/frontend && npx tsc -b
git add frontend/ && git commit -m "feat(frontend): staged loading for vision/prompt/solve LLM calls"
```

---

## Task 8: 收尾 + tag

### 8.1 全栈 verify

```bash
export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH" && cd /Users/lornax/Works/learn-or-die-lite/backend && npm test && cd ../frontend && npm run build
```

### 8.2 CLAUDE.md 加 v0.0.2.1 changelog 段落

CLAUDE.md 末尾加：

```markdown
## v0.0.2.1 hotfix（2026-05-09）

修复 v0.0.2 真实使用反馈：
- 拍照识题：原文未标答案时不再编造，UI 显示"AI 没识别答案"+「让 AI 解一下」按钮
- 查重：弹窗展示新旧题完整对比（题干+选项+答案），答案不一致红字警告，3 单题决策按钮 + 批量按钮
- AI 出题：加教材章节/考点输入框，去默认 NPDP 标签，历史标签 chip
- 题库管理 UI：新页面 /profiles/:pid/library 支持 list/edit/delete
- LLM 调用 staged loading：拍照/出题/解题分阶段提示
- 后端新端点：DELETE/PATCH /api/questions/:id, POST /api/solve-candidate, POST /api/questions/:qid/solve, GET /api/profiles/:pid/tags
```

### 8.3 commit + tag

```bash
cd /Users/lornax/Works/learn-or-die-lite && git add CLAUDE.md && git commit -m "docs: changelog for v0.0.2.1 hotfix"
git tag v0.0.2.1
git tag
git log --oneline | head -10
```

---

## 完工 checklist

- [ ] 8 tasks 全 commit
- [ ] backend npm test 全 PASS（含可能新增的 solve / DELETE / PATCH cases）
- [ ] frontend tsc -b + npm run build 全过
- [ ] 浏览器走完：
  - 拍照识题（无答案的图）→ 看到提示 + AI 解题按钮工作
  - 查重弹窗显示新旧对比 + 3 决策能用
  - PDF 多题场景批量按钮能用（如果 PDF 跑得通）
  - AI 出题填章节/考点 → 题更精准
  - 题库管理页能 edit / delete
  - 所有 LLM 调用看到 staged loading
- [ ] git tag v0.0.2.1
