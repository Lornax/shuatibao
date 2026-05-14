# learn-or-die-lite v0.0.2.5 实施计划 —— PDF 异步导入整改

**Why this version**：v0.0.2 的 PDF 入口是同步阻塞 + 整篇文本一次性丢 qwen-max，大 PDF（>20 题）会被 8K 输出 token 截断，HTTP 也容易被网关 1-2 分钟超时杀掉。整改目标见 CLAUDE.md Tech Debt：**拆批 + 异步任务 + 真进度推送**。

**Goal**：用户传一份 100 题的 NPDP 真题 PDF，能看到「N/M chunk 完成 · 已识别 K 题」的进度，关页面回来还能续看，最终跳到 confirm 页逐题确认。

**节奏**：约 1-1.5 天。subagent 串行 8 个 task，每 task 完成立刻 commit。

**Tech Stack 增量**：无新依赖。drizzle 迁移 +1（新表）。

---

## 0. 决策记录

### 0.1 为什么选 jobs 表 + 后台 worker（B 方案）而非 SSE（A）

- 用户体验优先：关页面/换设备能继续；进度持久化看得见
- 同一套异步基础设施 v0.0.3 AI 陪学异步对话还能复用
- 单进程 setImmediate worker 足够，不引 Redis/Bull 这类外部队列

### 0.2 chunk 切分策略

- pdf-parse 出全文 text（保留换行）
- 目标 chunk size：**3500 字符**（qwen-max 输入 32K tokens ≈ 64K 中文字符，留足上下文余量；输出 8K tokens ≈ 16K 字符，按 1 题 300 字算单 chunk 最多 50 题，按 3500 字符切单 chunk 通常 2-6 题——稳）
- **边界对齐**：在目标位置附近找题号边界（正则 `\n\s*\d{1,3}[\.、)]\s` 或 `\n\s*第\s*\d+\s*[题道节]`），找不到就硬切
- 单 chunk 失败 = 整 job 失败（v0.0.2.5 不做单 chunk 重试，简化）

### 0.3 并发与重启

- **同档案同时只允许 1 个 running/pending job**：重复 POST 直接 409 返回现有 jobId
- **重启自愈**：backend 启动时把 `status='running'` 的旧 job 标记 `failed('server_restart')`，用户重传——不持久化 LLM 中间状态
- **不做用户主动取消**：v0.0.2.5 范围外，job 自然跑完或失败

### 0.5 失败时保留已识别题（UX 优化）

- 中途 chunk 失败 → job status=failed，但 `candidates` 字段保留已成功的 N 题
- 前端 failed 状态页给两个 CTA：
  - **「用现有 X 题 →」**（主按钮）：跳 confirm 页，state.candidates = job.candidates
  - **「重传整本 PDF」**：回 `/profiles/:pid/questions/pdf`
- 实现成本接近零（candidates 字段本就持久化），UX 收益大

### 0.4 前端轮询而非 SSE

- 轮询间隔 **1.5s**，简单 setInterval
- 完成/失败立即停止轮询
- 不上 SSE 是因为 jobs 表已经能跨页面/重启续看，多一个 SSE 通道收益小

---

## 1. 数据模型

### 1.1 新表 `import_jobs`

```ts
// backend/src/db/schema.ts 新增
export const importJobStatus = pgEnum('import_job_status', [
  'pending',
  'running',
  'completed',
  'failed',
]);

export const importJobs = pgTable('import_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(),                      // 'pdf'（预留）
  status: importJobStatus('status').default('pending').notNull(),
  filename: text('filename').notNull(),
  totalChunks: integer('total_chunks').default(0).notNull(),
  doneChunks: integer('done_chunks').default(0).notNull(),
  candidates: jsonb('candidates').$type<CandidateQuestion[]>().default([]).notNull(),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
}, (t) => ({
  profileIdx: index('import_jobs_profile_idx').on(t.profileId),
  statusIdx: index('import_jobs_status_idx').on(t.status),
}));
```

### 1.2 drizzle 迁移

`backend/drizzle/0002_import_jobs.sql`（用 `npx drizzle-kit generate` 自动产出）

---

## 2. Task 列表

每个 task 完成立即 commit，commit 信息见每个 task 末尾。

### Task 1: schema + 迁移

- Add `importJobStatus` enum + `importJobs` table 到 `backend/src/db/schema.ts`
- 运行 `npx drizzle-kit generate` 出 `0002_import_jobs.sql`
- 运行 `npx drizzle-kit migrate` 应用到本地 dev 库
- 跑 `npm test`：所有旧测试应该仍 pass

**Commit**：`feat(backend): import_jobs table + migration`

### Task 2: chunk 切分工具 + 单测

- New: `backend/src/lib/pdf-chunker.ts`
  - `export function chunkPdfText(text: string, targetSize = 3500): string[]`
  - 算法：从 offset=0 开始，找 [offset + 0.7*targetSize, offset + 1.3*targetSize] 范围内最后一个题号边界换行；找不到就硬切到 offset + targetSize；空 text 返回 []；末段不足 targetSize 也作为 1 chunk
  - 题号边界正则：`/\n\s*\d{1,3}[\.、)]\s/g` 和 `/\n\s*第\s*\d+\s*[题道节]/g`，取两者匹配位置中最靠近目标的
- New: `backend/tests/pdf-chunker.test.ts`（vitest）
  - 空文本 → []
  - 500 字符 → 1 chunk
  - 10000 字符无题号 → 3 chunks（按字符硬切）
  - 10000 字符含 "1. ... 2. ... 3. ..." → chunk 边界落在题号前换行
  - 长度上限合理（每 chunk ≤ 1.3 * targetSize）

**Commit**：`feat(backend): pdf-chunker util + tests`

### Task 3: AI client 加 chunk 版函数

- Modify `backend/src/ai/client.ts`：
  - 保留旧 `structureQuestionsFromPdfText`（向后兼容，但后续 v0.0.2.5 不再用）
  - 新增：与旧版本一样的实现，参数加 `chunkIndex / totalChunks` 用于 logging（可选）
  - 复用 PDF_STRUCTURE_PROMPT，无需改 prompt

**Commit**：`refactor(backend): ai client pdf structuring used per chunk`

> 注：若旧函数已能直接复用（同一 prompt、单段文本入），Task 3 可合并到 Task 4 删掉。Task 3 保留位置是为了便于 task 文档拆分；执行时若 client.ts 无改动，则跳过此 commit，Task 4 顺延。

### Task 4: import-jobs route + worker（核心）

- New: `backend/src/lib/import-worker.ts`
  - `export async function processPdfImportJob(jobId: string): Promise<void>`
  - 取 job → 校验 status=pending → set running + startedAt
  - 读 `sourceMeta` 里存的 chunks 数组（见下方设计）
  - 循环每个 chunk：调 `structureQuestionsFromPdfText(chunk)` → append candidates + doneChunks++
  - 全部完成 set completed + finishedAt
  - 任一 chunk throw → set failed + error + finishedAt
- **设计**：chunks 不存 `sourceMeta`，太大；存到一个临时字段 `payload jsonb` 里？或者…**直接 chunks 临时挂内存 Map（jobId → chunks[]）**——简化，重启就丢，符合"重启 = 重传"约定。
- New: `backend/src/routes/import-jobs.ts`
  - `POST /api/profiles/:pid/import-jobs`（multipart pdf 字段）
    - 校验 own profile
    - 校验文件（≤20MB，.pdf）
    - 拒绝重复：查 `(profileId, status in [pending, running])`，存在则 409 `{ error: 'job_in_progress', jobId }`
    - pdfParse → text
    - chunkPdfText(text) → chunks
    - INSERT job (status=pending, totalChunks=chunks.length)
    - 内存 Map 挂 chunks
    - `setImmediate(() => processPdfImportJob(jobId).catch(...))`
    - 返回 `{ jobId, totalChunks }`
  - `GET /api/profiles/:pid/import-jobs/:jid`
    - 校验 own profile + job.profileId === pid
    - 返回 `{ id, status, doneChunks, totalChunks, candidates, error, createdAt, finishedAt }`
  - `GET /api/profiles/:pid/import-jobs?status=running,pending`（可选；前端用来恢复"未完成的导入"，v0.0.2.5 范围内做）
- Modify `backend/src/index.ts`：挂 importJobsRouter，路径 `/api`
- Modify `backend/src/index.ts`：启动时执行 self-heal — `UPDATE import_jobs SET status='failed', error='server_restart', finishedAt=now() WHERE status IN ('pending','running')`

**Commit**：`feat(backend): async pdf import jobs (worker + endpoints)`

### Task 5: backend integration tests

- New: `backend/tests/import-jobs.test.ts`
  - mock pdf-parse + ai client（参考 parse.test.ts）
  - case 1: POST 返回 jobId + totalChunks，立即 GET 看到 pending/running
  - case 2: `await new Promise(r => setTimeout(r, 50))` 给 worker 跑，再 GET 看到 completed + candidates 数 = mock 返回总和
  - case 3: ai mock 抛错 → 等微秒，GET status=failed + error 字符串
  - case 4: 已有 running job，再 POST → 409 返回现有 jobId
  - case 5: 别人的 profile 不能 GET（404）
- Modify `backend/tests/helpers.ts` 如有必要

**Commit**：`test(backend): import-jobs integration tests`

### Task 6: frontend API client + 进度页

- Modify `frontend/src/api/client.ts`：
  - `createPdfImportJob(pid, file) → { jobId, totalChunks }`
  - `getImportJob(pid, jid) → { ...job }`
  - `listImportJobs(pid, statuses) → [...]`（可选）
- New: `frontend/src/pages/ImportJobProgress.tsx`
  - 路径 `/profiles/:pid/import-jobs/:jid`
  - 进入页面 setInterval 1500ms 拉 getImportJob
  - 渲染：progress bar（doneChunks/totalChunks）+ "已识别 X 题"
  - status=completed → clearInterval + 自动 nav 到 `/profiles/:pid/questions/confirm` with `state: { candidates, source: 'pdf' }`
  - status=failed → 显示 error + 「重试」按钮（回 `/profiles/:pid/questions/pdf`）
- Modify `frontend/src/routes.tsx`：加路由
- Modify `frontend/src/pages/QuestionFromPDF.tsx`：
  - 改调 `createPdfImportJob`
  - 拿到 jobId 立刻 nav 到 progress 页（不再等结果）
  - 处理 409：直接 nav 到现有 jobId 的 progress 页

**Commit**：`feat(frontend): async pdf import with progress page`

### Task 7: profile detail 入口"恢复未完成导入"（可选但推荐）

- Modify `frontend/src/pages/ProfileDetail.tsx`：
  - 进入时拉 `GET /import-jobs?status=running,pending`
  - 有则显示 chip「正在导入 N/M」点击跳进度页
- 跳过条件：listImportJobs 后端没做就跳过

**Commit**：`feat(frontend): resume in-progress pdf import from profile detail`

### Task 8: 收尾 + tag

- 全栈 verify：`cd backend && npm test && cd ../frontend && npm run build`
- 浏览器 e2e 走一遍：
  - 传一份大 PDF（>20 题）→ 进度条递增 → 完成后到 confirm 页
  - 传一份会报错的 PDF（图扫描型无文本）→ failed + 错误提示
  - 上传后立刻关页面、5s 后回 profile detail → 看到"正在导入"入口
- CLAUDE.md 加 v0.0.2.5 changelog 段落，Tech Debt 里删掉「PDF 同步阻塞」那条
- commit + `git tag v0.0.2.5`

**Commit**：`docs: changelog for v0.0.2.5 pdf async import` + tag

---

## 3. 完工 checklist

- [ ] 8 tasks 全 commit
- [ ] backend `npm test` 全 PASS（含新增 pdf-chunker 单测 + import-jobs integration tests）
- [ ] frontend `npx tsc -b` + `npm run build` 全过
- [ ] 浏览器 e2e:
  - 传 NPDP 真题大 PDF → 进度条递增 → completed → confirm 页 → 查重弹窗工作
  - 故意传图扫描型 PDF → failed + 重传
  - 上传 → 关页面 → 回 profile detail → 看到"正在导入" → 点进去续看
  - backend 重启后，旧 running job 标 failed（手动 SQL 验证）
- [ ] CLAUDE.md changelog + Tech Debt 更新
- [ ] git tag v0.0.2.5

---

## 4. 风险与回退

- **风险 1**：内存 Map 挂 chunks 在并发多 job 时会涨。**Why OK**：单用户单 profile 同时 1 job，最大 20MB PDF → text 通常 <500KB → chunks 总占用 <1MB。
- **风险 2**：worker 没 catch 住的 throw 让 Node unhandledRejection。**Mitigation**：`setImmediate(() => processPdfImportJob(jobId).catch(err => { ... 写 failed + error })`。
- **风险 3**：drizzle migration 应用失败破坏现有库。**Mitigation**：先在本地 dev 验证，VPS 部署再做（v0.0.2.5 不要求部署）。
- **回退**：tag v0.0.2.4 是当前完工状态，任何阶段出错可 `git reset --hard v0.0.2.4` 回退。

---

# Round 2（2026-05-14，真实使用反馈驱动）

第 1 轮做完，作者本人测了一份 100+ 题的 NPDP PDF，暴露 10 个产品/UX 问题。本节把这 10 条作为 v0.0.2.5 的同版本增补，不另起版本号。

## 用户反馈对应表

| # | 反馈 | 修法 |
|---|------|------|
| ① | "0/8" 让人以为只识别了 8 道题；长时间不跳动以为卡死 | chunk size 3500→1200 让单 chunk 内出题 4-8 道（输出快），文案改"批次"，加预估时间 |
| ② | 完成后 1s 没自动跳转 | useEffect 依赖 `job?.status` re-run 时 cleanup 把 setTimeout 的 cancelled 守卫设为 true，1s 后 nav 被拒绝。改为不自动跳转 |
| ③ | "自动跳转 + 按钮"同时显示矛盾 | 去掉自动跳转，只留按钮 |
| ④ | 一次审 80 道太痛苦 | 改"待审队列"列表模式：列表页 + 单题进 confirm，审一道从 candidates 删一道 |
| ⑤ | 退出去再进入 candidates 全没（navigation state 内存丢失） | candidates 从 `GET /import-jobs/:jid` 持久化读，不再用 navigation state |
| ⑥ | Quiz 答错没解析 / 没上一题 / 不知道第几题 | **拆 v0.0.2.6 另做**，与 PDF 异步无关 |
| ⑦ | 不能终止导入 | 加 `DELETE /import-jobs/:jid` + worker cancel 标志（检查后续 chunk 不再跑）+ 前端按钮 |
| ⑧ | 重复上传被静默跳到旧 job | 改为明确提示「已有一份 xxx.pdf 在跑，等它结束再传新的」，不自动跳走。**不上排队**——待审堆已经够大 |
| ⑨ | 题库管理没创建时间，无法筛选 | listQuestions 返回 `createdAt`；列表行显示"3 天前 · PDF"；顶部加日期快捷 chip + 来源多选 chip（前端本地筛选） |
| ⑩ | PDF 缺答案的题需要逐道点 AI 解，应该批量 | 待审队列顶部检测 `candidates.filter(c => !c.answer)`，显示「⚠ N 道题缺答案 [一键 AI 全部解答]」；client-side 串行调 `/solve-candidate`，每完成 PATCH job.candidates |

## 数据模型变更

- **不动 schema**——`questions.source` enum + `sourceMeta` jsonb 已经足够。未来"市场购买/署名"扩展时往这两处加，不动结构。
- **新增端点**：
  - `PATCH /api/profiles/:pid/import-jobs/:jid`（修改 candidates 数组，用于待审队列单题保存进库后移除、AI 批量解答更新 answer/explanation）
  - `DELETE /api/profiles/:pid/import-jobs/:jid`（取消 running 任务）
  - `listQuestions` 加 `createdAt` 字段（默认就在表里，只是 SELECT 没拿）

## Round 2 Task 拆分

| Task | 内容 |
|------|------|
| 9 | 后端：listQuestions 加 createdAt 返回；import-jobs 加 PATCH + DELETE 端点；worker cancel 标志 |
| 10 | 前端进度页修复：chunk 1200 + 文案"批次" + 预估时间 + 去掉自动跳转 + 取消按钮 + 重复上传 toast |
| 11 | 待审队列页（新）：从 jobId 读 candidates，列表 + 单题进 QuestionConfirm 编辑，保存后 PATCH job |
| 12 | 缺答案识别 + 一键 AI 批量解答（client-side 串行循环，每题 PATCH job） |
| 13 | 题库管理：行显示创建时间 + 来源 chip；顶部加日期快捷 chip + 来源多选 chip（前端本地筛选） |
| 14 | 验证 + changelog 增补 + tag v0.0.2.5 |

## 复用决策

- 单题编辑**复用现有 QuestionConfirm.tsx**——它已支持 stem/options/answer/tags/difficulty/explanation 编辑 + 查重 + AI 解题。只需在路由里传 jobId + candidateIdx，保存逻辑改成 PATCH job + 创建 question + 从 candidates 数组移除该 idx。
- 批量 AI 解答不开后端 worker——前端 client-side 串行循环复用 `/solve-candidate`，进度天然实时，关浏览器不丢（已解的题已 PATCH 持久化）。
