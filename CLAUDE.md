# learn-or-die-lite

学不死的便携版——砍掉 v2 的微信渠道和通用 skills 体系，聚焦学习督促的垂直核心：知识点、学习计划、每日 log、用户画像。

v2 见 https://github.com/Lornax/learn-or-die（已封存，2026-05-04 起停止开发）。lite 是从零起的全新项目，**不 fork v2**。

## Tech Stack

- Runtime: Node.js 22 (`.nvmrc` 已锁)
- Frontend: Vite + React 18 + TypeScript + Tailwind CSS + React Router v6 + Zustand
- Backend: Hono + Drizzle ORM + PostgreSQL 18 (via Postgres.app)
- Workspace: npm workspaces（`frontend/` + `backend/`）
- Tests: vitest（后端 integration test，前端 v0.0.1 阶段不写单测）
- AI（v0.0.2 起）: 通义 qwen-vl-max / DeepSeek-V3 / Claude Sonnet（详见 docs/design.md 第 7 章）

## Quick Start

### 一次性环境

```bash
nvm use   # 装 node 22
```

PostgreSQL 用 [Postgres.app](https://postgresapp.com)（不用 brew）：
1. 下载 dmg 拖到 Applications 双击启动 → 点 "Initialize"
2. 配 PATH（一次性）：
   ```bash
   sudo mkdir -p /etc/paths.d && echo /Applications/Postgres.app/Contents/Versions/latest/bin | sudo tee /etc/paths.d/postgresapp
   ```
3. 重开终端，验证：`psql --version`
4. 建 dev 库：`createdb learn_or_die_lite`

### 项目初始化

```bash
npm install
cp backend/.env.example backend/.env
# 改 backend/.env 的 API_TOKEN（任意 8+ 字符串）
echo "VITE_API_TOKEN=<跟 backend/.env 的 API_TOKEN 同值>" > frontend/.env.local

cd backend
npx drizzle-kit migrate           # 应用 schema
npm run seed                      # 创建单用户，输出 SEED_USER_ID
# 把输出的 SEED_USER_ID=xxx 贴进 backend/.env
cd ..
```

### 日常开发（开两个终端）

```bash
npm run dev:backend     # :3001
npm run dev:frontend    # :5173
```

浏览器开 http://localhost:5173

### 测试

```bash
cd backend && npm test  # 18 个 integration test
cd frontend && npm run build  # 编译 + 类型检查
```

### v0.0.2+ AI 调用

`backend/.env` 必须设 `DASHSCOPE_API_KEY=sk-xxx`（[阿里云通义千问百炼平台](https://bailian.console.aliyun.com)，新用户免费额度 100 万 token 足够 NPDP 备考期间使用）。模型：

- `qwen-vl-max` 拍照识题（视觉模态 → 结构化 JSON）
- `qwen-max` AI 出题 / PDF 文本结构化
- `text-embedding-v3` 查重 embedding（1024 维 → 余弦相似度 ≥0.85 提示）

调用走 dashscope OpenAI 兼容 endpoint：`https://dashscope.aliyuncs.com/compatible-mode/v1`，使用 openai SDK 直接调。

## Structure

```
frontend/
  src/
    api/         # API client（Bearer token + fetch 封装）
    components/  # Box / Button / Chip / Input / Check / Layout
    pages/       # ProfileList / ProfileCreate / ProfileDetail / QuestionAdd / Quiz / WrongBook
    routes.tsx   # React Router 配置
    App.tsx      # 顶层 RouterProvider
backend/
  src/
    db/          # Drizzle schema + client
    middleware/  # auth (Bearer token)
    routes/      # profiles / questions / attempts
    config.ts    # zod env schema
    index.ts     # Hono server + 路由挂载
  tests/         # vitest integration tests
  scripts/       # seed.ts
  drizzle/       # 生成的 migration SQL
docs/
  design.md         # 设计文档 v0.6
  plan-v0.0.1.md    # v0.0.1 任务级实施计划
learn-or-die-linephoto/  # 线框图（Claude Design 输出）
```

## Dev Rules（来自 v2 的教训，必须遵守）

1. **写代码前先做可视化产品稿**——HTML 原型即可。v2 走过的最大弯路是没有提前看页面长什么样，从 we-assistant fork 的复杂度（iLink 渠道、通用 skills 等）一直保留到完工才发现都不必要。详见 ~/.claude/projects/-Users-lornax/memory/feedback_visual_prototype.md。
2. **不 fork 其他项目骨架启动**。lite 从空项目起步，只装真正需要的东西。每加一个依赖、每带一个模块都要问"现在真的需要它吗"。
3. **不带微信渠道**（iLink Bot 等）。产品形态已确认是 Web 页面或小程序，不要为微信留接口。
4. 如选用 **Next.js 16 + React Compiler**，禁止开启 `reactCompiler: true`。v2 dashboard 因此两次拖死整台 macOS（Activity Monitor 显示吃到 88G）。如要启用，先在隔离环境（VM 或远程容器）验证内存稳定。
5. **dev/启动脚本必须带内存上限**：`NODE_OPTIONS=--max-old-space-size=2048`（或更小）。作保险丝，让进程超阈值自杀，不让它继续吞物理内存拖死系统。
6. **遵守 Superpowers 流程**：brainstorming → design doc → plan → subagent development → TDD → code review → finish branch。不允许跳过 brainstorming 和 planning 阶段直接写代码。

## Tech Debt
- ~~PDF 原文件下载~~ ✅ 已做 (v0.0.3.2)：上传时推到腾讯云北京 COS bucket `zp1-1428145534`，URL 存进 `import_jobs.cos_url`，GET 时 mint 10 分钟 signed URL。
- ~~PDF 识别完整性~~ ✅ 主因已修 (v0.0.2.5 partial-tolerant 解析)：单道烂题不再 nuke 整 chunk。
- **AI 陪学 Tab**：design.md 规划的独立 Tab（主动学习建议 / 错题复盘 / 进度督促），目前只做了"题目页问 AI"单点入口。

## v0.0.2.6（2026-05-14，Quiz 答题页打磨 + 拍照入口拆分）

补 v0.0.2.5 真实使用时暴露的 Quiz 页 + 拍照入口体验问题，为部署上 VPS + 手机端使用做准备。

- **Quiz 加 history 栈 + 「← 上一题」按钮**：state 改成 history + live + viewing 三段，回看已答过的题（只读：显示 chosen / correct / explanation），「下一题 →」可在历史/当前之间跳。
- **Quiz 顶部显示进度**：「本次第 K 道 · 剩 R 道未掌握 / 共 N 道」（R = listQuestions 里 accuracy<1 OR attemptTotal==0 的数，每答完一道实时刷新）。
- **Quiz 答错也显示解析 Box**：原来 explanation 为空整个 Box 隐身；现在始终渲染，空时显示「暂无解析，可去题库管理补一条」。
- **拍照页拆「📸 拍照 / 🖼 从相册选」两个按钮**：原一个 input 加 `capture=environment` 在桌面端语义混乱。两按钮明确：拍照按钮 capture=environment（手机直接开相机），相册按钮不加 capture。

## v0.0.2.5（2026-05-14，PDF 异步导入 + 真实使用反馈打磨）

把 v0.0.2 同步阻塞的 PDF 导入改成异步任务模型，解决大 PDF（>20 题）被 8K 输出 token 截断 + HTTP 网关超时的痛点。**作者本人传一份 100+ 题真题暴露了 10 个产品/UX 问题，全部 Round 2 修完**。

### Round 1：异步基础设施

- 新表 `import_jobs`：status/totalChunks/doneChunks/candidates/error 持久化进度
- 新工具 `pdf-chunker`：按字符切分，在题号边界（`N.` / `第N题`）对齐，无字符丢失
- 新 worker `processPdfImportJob`：setImmediate 后台串行调每个 chunk 的 qwen-max，逐 chunk 写库
- 新端点：`POST/GET /api/profiles/:pid/import-jobs[/:jid]`；重复 POST 直接 409 返回现有 jobId
- 启动时 self-heal：`pending`/`running` 旧 job 标 `failed('server_restart')`
- 失败时 candidates 字段持久化保留，UI 提供「用现有 N 题」CTA

### Round 2：真实使用反馈驱动的 UX 修复

- **chunk size 3500→1200**：单次 LLM 调用降到 15-25s，进度条跳动密集（之前 60-100s 一格让用户以为卡死）
- **进度页文案改"批次"**："0/8" 不再被误解为"只识别了 8 道题"；加预估时间「预计还需 N 分 M 秒」
- **去掉自动跳转**：useEffect 依赖 `job?.status` re-run cleanup 把 setTimeout cancelled 守卫错误置 true，nav 被阻塞——修复方式是直接去掉自动跳转，只留按钮（避免"自动 + 手动按钮同时显示"的矛盾）
- **取消导入按钮**：DELETE 端点 + worker cancel 标志（下个 chunk 边界生效），已识别的题保留
- **重复上传不再静默跳走**：409 时显示页内 banner「已有一份 xxx.pdf 在跑」+ CTA
- **待审队列改造**（核心）：完成后跳新页 `/import-jobs/:jid/review`，candidates 从 job 表持久化读
  - 列表视图：每条题干前缀 + 「缺答案」/「已识别答案 X」chip + 「丢弃」按钮
  - 点击进单题编辑（复用 ConfirmOne），保存后 PATCH job 移除该条
  - 关浏览器/换页面随时回来续审，PATCH 自动清空 job 时删除 row
- **一键 AI 批量解答**：检测 `candidates.filter(c => !c.answer)`，client-side 串行循环调 `/solve-candidate`，每题 PATCH job 持久化，关页面不丢
- **题库列表加创建时间 + 来源 + 筛选**：每行显示「拍照/手输/PDF/AI 出题」chip + 相对时间；顶部加日期快捷 chip（今天/近 7 天/近 30 天/全部）+ 来源多选 chip
- **数据模型不动**：未来"第三方笔记包/署名"扩展通过 `source` enum 加值 + `sourceMeta` jsonb 字段（已存在）即可实现

## v0.0.2.1 hotfix（2026-05-09，使用反馈驱动）

修复 v0.0.2 真实使用暴露的体验/数据正确性问题：
- **拍照识题答案歧义**：原文无答案时 AI 不再编造（返回 ""），编辑确认页显示「AI 没识别答案」+「让 AI 解一下」按钮
- **查重 UX 大改**：弹窗显示新旧题完整对比（题干+选项+答案），答案不一致红字警告，单题 3 决策（保留新删旧/丢弃新留旧/都保留），PDF 多题场景顶部加批量按钮（全部都保留/全部跳过相似的）
- **AI 出题改进**：加教材章节 + 考点关键词输入框；prompt 紧扣这些上下文；去掉默认 NPDP 标签（档案已是 NPDP，冗余）；显示历史标签 chip 让用户点击复用
- **题库管理 UI**：新页面 `/profiles/:pid/library` 支持搜索/编辑/删除题目（避免 AI 污染数据没法清理）
- **LLM 调用 staged loading**：拍照/出题/AI 解题分阶段显示思考过程，规避"是不是卡了"的焦虑
- **新端点**：`DELETE /api/questions/:id`、`PATCH /api/questions/:id`、`POST /api/solve-candidate`、`POST /api/questions/:qid/solve`、`GET /api/profiles/:pid/tags`

## v0.0.2 完工特性（2026-05-09）

- 4 个加题入口：手输 / 拍照识题（qwen-vl-max）/ PDF 导入（qwen-max）/ AI 生成（qwen-max）
- 编辑确认页（4 入口共用），支持单题或队列模式
- 查重：保存时自动算 embedding，与同档案下其他题做余弦相似度，≥0.85 提示
- AI 走 dashscope OpenAI 兼容 endpoint，3 个模型一份 key

## v2 踩过的具体雷（备查）

- **v2 dashboard `reactCompiler: true` + Next 16 dev** → 两次拖死 macOS（吃到 88G），用户被迫物理重启
- **v2 vps iLink 轮询启动后约 22 秒 OOM**（4G 默认堆，崩溃栈停在 `Builtins_AsyncFunctionAwaitResolveClosure → PromiseFulfillReactionJob`），疑似 `getUpdates()` 一次返回积压消息或 `handleMessage` 大图 base64 累积，根因未查。lite 不带 iLink 渠道，自动规避
- **v2 `vps/data/` sqlite 含 we-assistant 的绝对路径污染**：fork 时数据复制不干净，启动反复出现 `bad media_path /Users/lornax/Works/we-assistant/...` warning。lite 全新项目无此问题
- **v2 `skill-loader` 把 `*.test.ts` 当 skill 加载并执行**：node:test 副作用导致服务启动时跑了一遍测试。已修复（提取 `isSkillFile()` 共用过滤器）。lite 如果用 skills 模式，扫描时务必排除 test 文件
- **v2 git author 是 IP fallback `LornaX <lornax@192.168.1.17>`**：内网 IP 进 commit 历史。lite 启动开发前先配 local 或 global git config，用 `281646775+Lornax@users.noreply.github.com` 之类 noreply 邮箱
