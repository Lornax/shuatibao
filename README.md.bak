# 刷题宝 · 一个 AI 驱动的 H5 备考陪跑工具

> **有书有题，考试有底**

一个人备考没人催、错题翻来覆去刷不进脑子、不知道明天先做什么 —— 刷题宝把"档案管理 + 题库 + AI 陪学"三件事打通：把资料喂进来，系统帮你刷、催、复盘，最后拿结果。

技术形态是 **H5 / PWA**，移动端体验为先。

---

## 🎯 谁该用

- 一个人备考，**有真题**（PDF / 拍照 / 散乱笔记）但没系统刷过
- 备考期间**有教材**，想让 AI 答题时引用原书章节
- 想自学但缺一个不掉链子的"教练" —— 知道你今天剩多少时间、错题积压、距考天数

适用任何选择题为主的考试：**NPDP / CPA / 法考 / PMP / 软考 / 考研 / 公考** 等。

---

## ✨ 核心功能

### 📋 档案管理
- 每个考试一个档案：考试日期、目标、每日学习时长 / 题数（二选一）
- 主页"今日目标"进度条，达成自动 🎉
- 多档案归档管理

### 📚 4 种加题方式
- **拍照识题**：手机拍真题书页，AI 视觉识别题干+选项+答案，可手指自由拖框裁剪
- **手输**：传统一道一道敲
- **PDF 导入**：上传真题 PDF（≤20MB），AI 后台异步解析
  - 内容 sha256 hash 缓存：同份 PDF 重传秒出
  - 早停：前 3 批 0 题判定非题目 PDF，自动停
  - 断点续传：服务重启不丢任务，从断点继续
- **AI 出题**：三模式（指定章节 / 按知识点 / 随机），1-10 道批量后台跑，入库前查重

### 🤖 AI 陪学
- 题目页问"为什么选 A"、"还有哪些相关考点"
- 独立陪学 Tab：知道你的真实状态（错题/距考/上次答题），给具体行动而非空话
- 教练 prompt 默认严格风格：拒绝离题陪聊、不顺着拖延、表扬具体不空

### 📖 教材 RAG
- 上传 PDF 教材（≤50MB / 档案多本）
- AI 回答自动引用「第 X 章·第 Y 页」，可追溯，不让 AI 编造概念

### 🛠️ 题库管理
- 查重（余弦相似度 ≥ 0.85 提示）+ 一键去重
- 错题本自动归档 + 连续答对 3 次自动移出
- 多选 / 批量删除 / 一键清空 / 按筛选清空
- 题目克隆 / 拖拽排序

### 🎨 视觉
- 霞鹜文楷 TC 中文字体 + brutal 红影设计语言
- 调色板：米纸 / 深棕 / 砖红 / 蜜黄 / 靛蓝 / 苔绿

---

## 🛠 Tech Stack

| 层 | 技术 |
|---|---|
| **前端** | Vite + React 18 + TypeScript + Tailwind CSS + React Router 6 |
| **后端** | Hono + Drizzle ORM + PostgreSQL 15 |
| **AI 模型** | 通义千问（视觉/文本）+ DeepSeek（对话）+ text-embedding-v3（查重） |
| **文件存储** | 腾讯云 COS（可选，PDF 原文件归档） |
| **认证** | JWT (HS256) + bcryptjs |
| **测试** | vitest（94 个 backend integration tests） |
| **部署** | Node.js 22 + systemd + serveStatic |

---

## 🚀 Quick Start（本地）

### 1. 装环境

```bash
# Node.js 22
nvm use   # 项目根有 .nvmrc

# PostgreSQL 15
# macOS 推荐 Postgres.app: https://postgresapp.com
# 或 brew install postgresql@15
createdb shuatibao
```

### 2. 装依赖

```bash
npm install   # workspaces 自动装 backend + frontend
```

### 3. 配置环境变量

复制 example 文件：
```bash
cp backend/.env.example backend/.env
```

填写 `backend/.env`，详见下面 [API 与密钥配置](#-api-与密钥配置) 章节。

```bash
# frontend 也要一个 (跟 backend API_TOKEN 同值)
echo "VITE_API_TOKEN=<跟 backend API_TOKEN 同值>" > frontend/.env.local
```

### 4. 初始化数据库

```bash
cd backend
npx drizzle-kit migrate   # 应用 schema migrations
npm run seed              # 创建初始用户, 输出 SEED_USER_ID
# 把输出的 SEED_USER_ID=xxx 贴回 backend/.env
cd ..
```

### 5. 启动开发

```bash
# 两个终端
npm run dev:backend    # http://localhost:3001
npm run dev:frontend   # http://localhost:5173
```

浏览器打开 http://localhost:5173 → 注册账号 → 建档 → 开始用。

### 6. 跑测试

```bash
cd backend && npm test         # 94 个 integration tests
cd frontend && npm run build   # 类型检查 + 打包
```

---

## 🔑 API 与密钥配置

所有环境变量都在 `backend/.env`。功能依赖如下：

### 必填

| Env | 作用 | 哪里申请 / 怎么生成 |
|---|---|---|
| `DATABASE_URL` | PostgreSQL 连接串 | `postgres://user@localhost:5432/shuatibao` |
| `API_TOKEN` | 后端 Bearer token（开发期单用户兜底） | 任意 ≥8 字符随机串，跟 `frontend/.env.local` 的 `VITE_API_TOKEN` 一致 |
| `SEED_USER_ID` | 初始用户 UUID | 跑 `npm run seed` 输出 |
| `JWT_SECRET` | JWT 签名密钥 | 至少 16 字符随机串，`openssl rand -hex 32` |
| `DASHSCOPE_API_KEY` | **核心 AI 密钥**：通义千问 / DeepSeek 都走这一个 key | [阿里云百炼控制台](https://bailian.console.aliyun.com) 免费额度 100 万 token，足够备考期间用 |

`DASHSCOPE_API_KEY` 驱动的功能：
- `qwen-vl-max`：拍照识题
- `qwen-max`：PDF 文本结构化 / AI 出题 / AI 解题
- `deepseek-v3`：题目页问 AI / 陪学对话
- `text-embedding-v3`：查重 embedding

### 可选

| Env | 作用 |
|---|---|
| `COS_SECRET_ID` / `COS_SECRET_KEY` / `COS_BUCKET` / `COS_REGION` | 腾讯云 COS（PDF 原文件归档 + 教材文件存储）。不配则不上传，功能可用但 PDF 上传后无法二次下载 |
| `BASIC_AUTH_USER` / `BASIC_AUTH_PASS` | 生产环境用 HTTP Basic Auth 包一层 SPA（防止 token 暴露给爬虫） |
| `DASHSCOPE_CODING_API_KEY` | LLM fallback 密钥（百炼"coding plan"套餐）。主 key 配额耗尽时自动切。无则原 key 用尽即报错 |

### 完整 `.env` 示例

```bash
PORT=3001
DATABASE_URL=postgres://lornax@localhost:5432/shuatibao
API_TOKEN=<your-random-token>
SEED_USER_ID=<uuid-from-seed>
JWT_SECRET=<openssl rand -hex 32>
DASHSCOPE_API_KEY=sk-xxxx
# 可选
COS_SECRET_ID=
COS_SECRET_KEY=
COS_BUCKET=
COS_REGION=
BASIC_AUTH_USER=
BASIC_AUTH_PASS=
DASHSCOPE_CODING_API_KEY=
```

---

## 📦 部署到 VPS（极简版）

```bash
# 1. 后端 src + drizzle migration 上传, 跑 migrate
scp -r backend/src backend/drizzle backend/package.json backend/tsconfig.json <vps>:/opt/shuatibao/
ssh <vps> 'cd /opt/shuatibao && npm install --omit=dev && npx drizzle-kit migrate'

# 2. 前端 build 推到 backend 的 public/
cd frontend && npm run build && scp -r dist/* <vps>:/opt/shuatibao/public/

# 3. systemd unit
# 详细 systemd 配置见 docs/DEV_NOTES.md
```

**生产建议**：
- 反代用 Caddy / Nginx，加 HTTPS（Let's Encrypt 自动）
- 不要让 `DATABASE_URL` 暴露在公网
- `BASIC_AUTH_USER/PASS` 给 SPA 套一层防爬

---

## 🗺 后续迭代计划

详细见 [`docs/roadmap.md`](docs/roadmap.md)。三阶段视角：

### Stage 2 · 下期（稳 + 数据闭环）
- 📦 数据备份（一键 JSON 导出 + 每日 pg_dump 推 COS）
- 🔒 HTTPS（Caddy + 自动续证）
- ⏱️ 学习时长 / 题数双目标进度（已做基础，待加本周热力图）
- 📚 教材 PDF 上传也支持断点续传
- 🎭 AI 教练风格可选（严格 / 温柔 / 段子手 / 学者 / 自定义）
- ⚡ PDF chunk 并发解析（速度翻倍）
- 📝 考纲手输上传（影响章节出题比例 + 重点知识点）

### Stage 3 · 远期（产品长大）
- 🛒 题包 / 错题本 / 学习计划交易市场（作者署名 + 分润）
- 🏆 上岸墙 / 备考广场 / 学习社群
- 🎓 专家级 AI 教练（按热门考试垂直化：教材库预加载、真题库、模考、错题归因）
- 📱 移动端 Taro 转小程序
- 🔌 第三方学习/打卡工具打通（番茄钟 API、Notion 等）

---

## 🤝 联系 & 反馈

第一次开源项目，欢迎拍砖：

- **微信**：522401944（备注"刷题宝"）
- **公众号**：云青未眠
- **GitHub Issue**：直接在本仓库提 issue
- **Pull Request**：欢迎，建议先发 issue 讨论方向

---

## 📜 License

MIT。详见 [`LICENSE`](LICENSE)。

---

## 🙏 致谢

- 阿里云百炼 / 通义千问 / DeepSeek —— 国内开发者友好的 AI 平台
- 霞鹜文楷字体 —— 让中文 UI 有了温度
- 所有报 bug 的早期用户
