# learn-or-die-lite v0.0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 从空仓库起步搭出本地可跑的 H5 应用，让作者能在 NPDP 备考档案下手输录题、做题、错题进错题本。

**Architecture:** npm workspaces 单仓库（frontend + backend），前端 Vite + React + TS + Tailwind，后端 Hono + TS + Drizzle，本地 PostgreSQL。单用户，token 写死在环境变量，不做登录系统。

**Tech Stack:** Vite, React 18, TypeScript, Tailwind CSS, React Router v6, Zustand, Hono, Drizzle ORM, PostgreSQL 15+, vitest, npm workspaces

**测试策略**：后端 API 路由层走 integration test（vitest + supertest 风格，hit 真实 Postgres test schema）；前端 v0.0.1 阶段不写单测，手工浏览器验证完整闭环——把节奏留给 v0.0.2 的 AI 管线，那部分单测价值更高。

**估时**：2-3 天 / 7-10 小时实际编码。

---

## File Structure

```
learn-or-die-lite/
├── .gitignore
├── .nvmrc                                      # 锁 node 22 LTS
├── package.json                                # workspaces 根, 共用 scripts
├── tsconfig.base.json                          # 共用 ts 配置
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   └── src/
│       ├── main.tsx                            # 入口
│       ├── App.tsx                             # 顶层布局 + Router
│       ├── index.css                           # Tailwind directives + design tokens
│       ├── api/
│       │   └── client.ts                       # fetch 封装 + token 注入
│       ├── components/                         # 通用组件
│       │   ├── Box.tsx                         # wf-box / soft / thick / dashed
│       │   ├── Button.tsx                      # wf-btn / primary / accent / ghost
│       │   ├── Chip.tsx                        # wf-chip / fill
│       │   ├── Input.tsx                       # wf-input
│       │   └── Check.tsx                       # wf-check / radio
│       └── pages/
│           ├── ProfileList.tsx                 # 档案列表 (PlanA)
│           ├── ProfileCreate.tsx               # 新建档案 (PlanB 简化)
│           ├── ProfileDetail.tsx               # 档案详情 (PlanC 简化)
│           ├── QuestionAdd.tsx                 # 手输加题
│           ├── Quiz.tsx                        # 答题 (LibA)
│           └── WrongBook.tsx                   # 错题本
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── drizzle.config.ts
│   ├── .env.example
│   ├── drizzle/                                # 生成的 migrations
│   ├── scripts/
│   │   └── seed.ts                             # 单用户 seed
│   ├── src/
│   │   ├── index.ts                            # Hono 入口
│   │   ├── config.ts                           # env 加载
│   │   ├── db/
│   │   │   ├── client.ts                       # Drizzle 连接
│   │   │   └── schema.ts                       # 4 张表 (User/Profile/Question/Attempt)
│   │   ├── middleware/
│   │   │   └── auth.ts                         # token 校验
│   │   └── routes/
│   │       ├── profiles.ts                     # /api/profiles
│   │       ├── questions.ts                    # /api/profiles/:pid/questions
│   │       └── attempts.ts                     # /api/questions/:qid/attempts + wrongbook
│   └── tests/
│       ├── helpers.ts                          # 测试 DB 准备 + auth helper
│       ├── profiles.test.ts
│       ├── questions.test.ts
│       └── attempts.test.ts
└── docs/
    ├── design.md                               # 已存在
    └── plan-v0.0.1.md                          # 本文件
```

---

## Phase A · 工程地基

### Task 1: Git 仓库 + .gitignore + git 配置

**Files:**
- Create: `.gitignore`
- Create: `.nvmrc`

- [ ] **Step 1: 初始化 git 仓库**

```bash
cd /Users/lornax/Works/learn-or-die-lite
git init
```

- [ ] **Step 2: 配 git local config（noreply 邮箱）**

```bash
git config user.email "281646775+Lornax@users.noreply.github.com"
git config user.name "Lornax"
```

验证：
```bash
git config user.email
# 期望输出: 281646775+Lornax@users.noreply.github.com
```

- [ ] **Step 3: 写 .gitignore**

```
node_modules/
dist/
.env
.env.local
.DS_Store
*.log
.vite/
coverage/
drizzle/meta/
```

- [ ] **Step 4: 写 .nvmrc 锁 node 版本**

```
22
```

- [ ] **Step 5: 第一个 commit**

```bash
git add .gitignore .nvmrc
git commit -m "chore: init repo with gitignore and node version pin"
```

验证：`git log --oneline` 看到一条 commit。

---

### Task 2: Monorepo workspace 结构

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`

- [ ] **Step 1: 写根 package.json**

```json
{
  "name": "learn-or-die-lite",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "workspaces": [
    "frontend",
    "backend"
  ],
  "scripts": {
    "dev": "NODE_OPTIONS=--max-old-space-size=2048 npm run dev --workspaces --if-present",
    "dev:frontend": "NODE_OPTIONS=--max-old-space-size=2048 npm run dev -w frontend",
    "dev:backend": "NODE_OPTIONS=--max-old-space-size=2048 npm run dev -w backend",
    "build": "npm run build --workspaces --if-present",
    "test": "npm run test --workspaces --if-present"
  },
  "engines": {
    "node": ">=22"
  }
}
```

- [ ] **Step 2: 写共用 tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add package.json tsconfig.base.json
git commit -m "chore: setup npm workspaces and base tsconfig"
```

---

### Task 3: 后端 Hono 脚手架 + health check

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/src/index.ts`
- Create: `backend/src/config.ts`
- Create: `backend/.env.example`

- [ ] **Step 1: 写 backend/package.json**

```json
{
  "name": "@learn-or-die-lite/backend",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "test": "vitest run"
  },
  "dependencies": {
    "@hono/node-server": "^1.13.0",
    "drizzle-orm": "^0.36.0",
    "hono": "^4.6.0",
    "postgres": "^3.4.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "drizzle-kit": "^0.28.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: 写 backend/tsconfig.json**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*", "tests/**/*", "scripts/**/*"]
}
```

- [ ] **Step 3: 写 backend/.env.example**

```
PORT=3001
DATABASE_URL=postgres://lornax@localhost:5432/learn_or_die_lite
API_TOKEN=dev-fixed-token-change-me
```

- [ ] **Step 4: 写 backend/src/config.ts**

```ts
import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1),
  API_TOKEN: z.string().min(8),
});

export const config = schema.parse(process.env);
```

- [ ] **Step 5: 写 backend/src/index.ts（最小 Hono server + health）**

```ts
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { config } from './config.js';

const app = new Hono();

app.use('/api/*', cors({ origin: 'http://localhost:5173', credentials: true }));

app.get('/health', (c) => c.json({ ok: true, version: '0.0.1' }));

serve({ fetch: app.fetch, port: config.PORT }, (info) => {
  console.log(`backend listening on :${info.port}`);
});

export { app };
```

- [ ] **Step 6: 安装依赖 + 复制 .env**

```bash
cd /Users/lornax/Works/learn-or-die-lite
npm install
cp backend/.env.example backend/.env
```

- [ ] **Step 7: 启动验证**

```bash
npm run dev:backend
```

另开终端：
```bash
curl http://localhost:3001/health
# 期望: {"ok":true,"version":"0.0.1"}
```

按 Ctrl+C 停掉。

- [ ] **Step 8: Commit**

```bash
git add backend/ package-lock.json
git commit -m "feat(backend): bootstrap hono server with health endpoint"
```

---

### Task 4: 前端 Vite + React + Tailwind + design tokens

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.node.json`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/postcss.config.js`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/index.css`

- [ ] **Step 1: 写 frontend/package.json**

```json
{
  "name": "@learn-or-die-lite/frontend",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.27.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.6.0",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 2: 写 frontend/vite.config.ts**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
```

- [ ] **Step 3: 写 frontend/tsconfig.json**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "outDir": "dist",
    "noEmit": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 4: 写 frontend/tsconfig.node.json**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 5: 写 frontend/tailwind.config.js（接入 design tokens）**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#fafaf6',
        ink: {
          DEFAULT: '#1a1a1a',
          2: '#4a4a4a',
          3: '#888888',
        },
        accent: {
          DEFAULT: '#d94a3a',
          2: '#f4c542',
          3: '#4a7eb8',
          4: '#6ba368',
        },
        chip: {
          blue: '#d4e4f4',
          green: '#d4e8d0',
          pink: '#f4d4d0',
          cream: '#fff8e6',
        },
      },
      fontFamily: {
        hand: ['"Patrick Hand"', '"Caveat"', 'cursive'],
        handBold: ['Kalam', 'cursive'],
        display: ['Caveat', 'cursive'],
        cn: ['"PingFang SC"', '"Noto Sans SC"', 'sans-serif'],
      },
      boxShadow: {
        brutal: '4px 4px 0 #1a1a1a',
        'brutal-sm': '2px 2px 0 #1a1a1a',
      },
      borderRadius: {
        soft: '14px',
        thick: '10px',
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 6: 写 frontend/postcss.config.js**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 7: 写 frontend/index.html**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <title>学不死</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Patrick+Hand&family=Kalam:wght@400;700&display=swap" rel="stylesheet" />
  </head>
  <body class="bg-paper">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: 写 frontend/src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html, body, #root {
    height: 100%;
  }
  body {
    font-family: 'PingFang SC', 'Noto Sans SC', sans-serif;
    color: #1a1a1a;
    background: #fafaf6;
    -webkit-font-smoothing: antialiased;
  }
}
```

- [ ] **Step 9: 写 frontend/src/main.tsx**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 10: 写 frontend/src/App.tsx（占位首页验证视觉）**

```tsx
export default function App() {
  return (
    <div className="min-h-full bg-paper p-6 max-w-md mx-auto">
      <h1 className="font-display text-4xl mb-2">学不死</h1>
      <p className="font-cn text-base text-ink-2 mb-6">v0.0.1 占位首页</p>
      <div className="border-2 border-ink rounded-thick bg-white p-4 shadow-brutal">
        <p className="font-cn text-sm">如果看到这块米色背景 + 厚黑边 + 立体阴影，视觉 token 已生效。</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 11: 安装依赖**

```bash
cd /Users/lornax/Works/learn-or-die-lite
npm install
```

- [ ] **Step 12: 启动验证**

```bash
npm run dev:frontend
```

浏览器打开 http://localhost:5173 ：
- 米色背景 ✓
- 卡片有 4px 黑色立体阴影 ✓
- 标题"学不死"是 Caveat 手写英文渲染后看不出来（"学不死"是中文走 PingFang SC，正常）

按 Ctrl+C 停掉。

- [ ] **Step 13: Commit**

```bash
git add frontend/ package-lock.json
git commit -m "feat(frontend): bootstrap vite+react+tailwind with design tokens"
```

---

## Phase B · 数据层

### Task 5: Drizzle schema (4 张表)

**Files:**
- Create: `backend/src/db/schema.ts`
- Create: `backend/src/db/client.ts`
- Create: `backend/drizzle.config.ts`

- [ ] **Step 1: 写 backend/src/db/schema.ts**

```ts
import { pgTable, uuid, text, timestamp, jsonb, integer, boolean, pgEnum, index } from 'drizzle-orm/pg-core';

export const profileStatus = pgEnum('profile_status', ['active', 'archived', 'given_up']);
export const questionSource = pgEnum('question_source', ['photo', 'manual', 'pdf', 'ai_gen']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  nickname: text('nickname').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  examName: text('exam_name').notNull(),
  target: text('target'),
  examDate: timestamp('exam_date', { withTimezone: true }),
  dailyMinutes: integer('daily_minutes').default(60).notNull(),
  status: profileStatus('status').default('active').notNull(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  userIdx: index('profiles_user_idx').on(t.userId),
}));

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
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  profileIdx: index('questions_profile_idx').on(t.profileId),
}));

export const attempts = pgTable('attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  questionId: uuid('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  chosen: text('chosen').notNull(),
  isCorrect: boolean('is_correct').notNull(),
  timeSpentMs: integer('time_spent_ms').default(0).notNull(),
  attemptedAt: timestamp('attempted_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  questionIdx: index('attempts_question_idx').on(t.questionId),
  userIdx: index('attempts_user_idx').on(t.userId),
}));
```

- [ ] **Step 2: 写 backend/src/db/client.ts**

```ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from '../config.js';
import * as schema from './schema.js';

const sql = postgres(config.DATABASE_URL, { max: 5 });
export const db = drizzle(sql, { schema });
export { schema };
```

- [ ] **Step 3: 写 backend/drizzle.config.ts**

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://lornax@localhost:5432/learn_or_die_lite',
  },
});
```

- [ ] **Step 4: 创建本地数据库**

```bash
createdb learn_or_die_lite
```

如果 `createdb: command not found`，先 `brew install postgresql@15 && brew services start postgresql@15`。

- [ ] **Step 5: 生成 + 应用 migration**

```bash
cd /Users/lornax/Works/learn-or-die-lite/backend
npx drizzle-kit generate --name=init
npx drizzle-kit migrate
```

验证：
```bash
psql learn_or_die_lite -c "\dt"
# 期望看到 4 张表：users / profiles / questions / attempts
```

- [ ] **Step 6: Commit**

```bash
cd /Users/lornax/Works/learn-or-die-lite
git add backend/src/db/ backend/drizzle.config.ts backend/drizzle/
git commit -m "feat(backend): add drizzle schema for users/profiles/questions/attempts"
```

---

### Task 6: 单用户 seed 脚本

**Files:**
- Create: `backend/scripts/seed.ts`

- [ ] **Step 1: 写 seed 脚本**

```ts
import { db, schema } from '../src/db/client.js';

async function seed() {
  const existing = await db.select().from(schema.users).limit(1);
  if (existing.length > 0) {
    console.log('seed: user exists, skipping. id =', existing[0].id);
    process.exit(0);
  }
  const [user] = await db
    .insert(schema.users)
    .values({
      email: 'lornax@local',
      nickname: 'Lornax',
    })
    .returning();
  console.log('seed: created user', user.id);
  console.log('PUT THIS IN backend/.env -> SEED_USER_ID=' + user.id);
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: 在 backend/package.json 加 seed script**

修改 `backend/package.json` 的 `scripts`，增加：

```json
"seed": "tsx scripts/seed.ts"
```

- [ ] **Step 3: 跑 seed**

```bash
cd /Users/lornax/Works/learn-or-die-lite/backend
npm run seed
```

复制输出的 `SEED_USER_ID=xxx` 到 `backend/.env`。

- [ ] **Step 4: 在 config.ts 增加 SEED_USER_ID 字段**

修改 `backend/src/config.ts`，schema 加一行：

```ts
SEED_USER_ID: z.string().uuid(),
```

完整 schema 应该是：

```ts
const schema = z.object({
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1),
  API_TOKEN: z.string().min(8),
  SEED_USER_ID: z.string().uuid(),
});
```

也更新 `backend/.env.example` 加一行 `SEED_USER_ID=`。

- [ ] **Step 5: Commit**

```bash
cd /Users/lornax/Works/learn-or-die-lite
git add backend/scripts/ backend/package.json backend/src/config.ts backend/.env.example
git commit -m "feat(backend): seed single user and wire SEED_USER_ID env"
```

---

### Task 7: Auth middleware（token 写死）

**Files:**
- Create: `backend/src/middleware/auth.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: 写 backend/src/middleware/auth.ts**

```ts
import type { MiddlewareHandler } from 'hono';
import { config } from '../config.js';

export type AuthVars = {
  userId: string;
};

export const auth: MiddlewareHandler<{ Variables: AuthVars }> = async (c, next) => {
  const header = c.req.header('Authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token || token !== config.API_TOKEN) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  c.set('userId', config.SEED_USER_ID);
  await next();
};
```

- [ ] **Step 2: 在 index.ts 挂载到 /api/* 路径**

修改 `backend/src/index.ts`，把 `cors` 之后加：

```ts
import { auth } from './middleware/auth.js';
// ... cors 那行之后
app.use('/api/*', auth);
```

完整文件应该长这样：

```ts
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { config } from './config.js';
import { auth } from './middleware/auth.js';
import type { AuthVars } from './middleware/auth.js';

const app = new Hono<{ Variables: AuthVars }>();

app.use('/api/*', cors({ origin: 'http://localhost:5173', credentials: true }));
app.use('/api/*', auth);

app.get('/health', (c) => c.json({ ok: true, version: '0.0.1' }));
app.get('/api/me', (c) => c.json({ userId: c.get('userId') }));

serve({ fetch: app.fetch, port: config.PORT }, (info) => {
  console.log(`backend listening on :${info.port}`);
});

export { app };
```

- [ ] **Step 3: 手工验证**

启动 backend：
```bash
npm run dev:backend
```

无 token：
```bash
curl -i http://localhost:3001/api/me
# 期望: HTTP/1.1 401 + {"error":"unauthorized"}
```

错 token：
```bash
curl -i -H "Authorization: Bearer wrong" http://localhost:3001/api/me
# 期望: 401
```

正确 token（替换成你 .env 里的 API_TOKEN）：
```bash
curl -i -H "Authorization: Bearer dev-fixed-token-change-me" http://localhost:3001/api/me
# 期望: 200 + {"userId":"<uuid>"}
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/middleware/ backend/src/index.ts
git commit -m "feat(backend): add static-token auth middleware"
```

---

## Phase C · 后端 API

### Task 8: Profile API + 测试

**Files:**
- Create: `backend/src/routes/profiles.ts`
- Create: `backend/tests/helpers.ts`
- Create: `backend/tests/profiles.test.ts`
- Create: `backend/vitest.config.ts`
- Modify: `backend/src/index.ts`
- Modify: `backend/package.json`

- [ ] **Step 1: 装测试依赖**

```bash
cd /Users/lornax/Works/learn-or-die-lite/backend
npm install -D @types/node
```

vitest 已经在 devDeps 里。

- [ ] **Step 2: 写 vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    fileParallelism: false,
    setupFiles: ['./tests/helpers.ts'],
  },
});
```

- [ ] **Step 3: 写 tests/helpers.ts（测试前清表 + 重新 seed）**

```ts
import { db, schema } from '../src/db/client.js';
import { config } from '../src/config.js';
import { sql } from 'drizzle-orm';
import { beforeEach } from 'vitest';

export const TEST_TOKEN = config.API_TOKEN;
export const TEST_USER_ID = config.SEED_USER_ID;

export async function resetDb() {
  await db.execute(sql`TRUNCATE attempts, questions, profiles, users RESTART IDENTITY CASCADE`);
  await db.insert(schema.users).values({
    id: TEST_USER_ID,
    email: 'lornax@local',
    nickname: 'Lornax',
  });
}

beforeEach(async () => {
  await resetDb();
});

export function authHeaders() {
  return { Authorization: `Bearer ${TEST_TOKEN}` };
}
```

注意：测试会清空开发库的数据。生产/dev 库和测试库共用是 v0.0.1 的妥协。要分离时把 `DATABASE_URL` 在 vitest 跑前重写到 `..._test`。

- [ ] **Step 4: 写 routes/profiles.ts（先写好，测试后实现）**

```ts
import { Hono } from 'hono';
import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import type { AuthVars } from '../middleware/auth.js';

const router = new Hono<{ Variables: AuthVars }>();

const createSchema = z.object({
  examName: z.string().min(1).max(100),
  target: z.string().max(200).optional(),
  examDate: z.string().datetime().optional(),
  dailyMinutes: z.number().int().min(5).max(720).default(60),
});

router.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', details: parsed.error.flatten() }, 400);
  }
  const userId = c.get('userId');
  const [row] = await db
    .insert(schema.profiles)
    .values({
      userId,
      examName: parsed.data.examName,
      target: parsed.data.target,
      examDate: parsed.data.examDate ? new Date(parsed.data.examDate) : null,
      dailyMinutes: parsed.data.dailyMinutes,
    })
    .returning();
  return c.json(row, 201);
});

router.get('/', async (c) => {
  const userId = c.get('userId');
  const rows = await db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.userId, userId))
    .orderBy(desc(schema.profiles.createdAt));
  return c.json(rows);
});

router.get('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const [row] = await db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.id, id))
    .limit(1);
  if (!row || row.userId !== userId) return c.json({ error: 'not_found' }, 404);
  return c.json(row);
});

export { router as profilesRouter };
```

- [ ] **Step 5: 在 index.ts 挂载 router**

修改 `backend/src/index.ts`，在 `app.get('/api/me', ...)` 后加：

```ts
import { profilesRouter } from './routes/profiles.js';
// ...
app.route('/api/profiles', profilesRouter);
```

- [ ] **Step 6: 写 tests/profiles.test.ts**

```ts
import { describe, it, expect } from 'vitest';
import { app } from '../src/index.js';
import { authHeaders } from './helpers.js';

describe('POST /api/profiles', () => {
  it('rejects unauth', async () => {
    const res = await app.request('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ examName: 'NPDP' }),
    });
    expect(res.status).toBe(401);
  });

  it('creates profile with examName only', async () => {
    const res = await app.request('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ examName: 'NPDP' }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.examName).toBe('NPDP');
    expect(body.dailyMinutes).toBe(60);
    expect(body.status).toBe('active');
  });

  it('rejects empty examName', async () => {
    const res = await app.request('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ examName: '' }),
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/profiles', () => {
  it('returns empty list initially', async () => {
    const res = await app.request('/api/profiles', { headers: authHeaders() });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('returns created profiles', async () => {
    await app.request('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ examName: 'NPDP' }),
    });
    const res = await app.request('/api/profiles', { headers: authHeaders() });
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].examName).toBe('NPDP');
  });
});

describe('GET /api/profiles/:id', () => {
  it('returns profile by id', async () => {
    const created = await app
      .request('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ examName: 'NPDP' }),
      })
      .then((r) => r.json());

    const res = await app.request(`/api/profiles/${created.id}`, { headers: authHeaders() });
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe(created.id);
  });

  it('returns 404 for missing id', async () => {
    const res = await app.request('/api/profiles/00000000-0000-0000-0000-000000000000', {
      headers: authHeaders(),
    });
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 7: 跑测试**

```bash
cd /Users/lornax/Works/learn-or-die-lite/backend
npm test
```

期望：8 个测试全 PASS。

如果失败，先排查 `DATABASE_URL` 和 migration 是否应用。

- [ ] **Step 8: Commit**

```bash
cd /Users/lornax/Works/learn-or-die-lite
git add backend/
git commit -m "feat(backend): profile crud api with integration tests"
```

---

### Task 9: Question API + 测试

**Files:**
- Create: `backend/src/routes/questions.ts`
- Create: `backend/tests/questions.test.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: 写 routes/questions.ts**

```ts
import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import type { AuthVars } from '../middleware/auth.js';

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
});

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
      source: 'manual',
    })
    .returning();
  return c.json(row, 201);
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

- [ ] **Step 2: 在 index.ts 挂载**

```ts
import { questionsRouter } from './routes/questions.js';
// ...
app.route('/api', questionsRouter);
```

注意：因为 questions 路由有两个前缀（`/profiles/:pid/questions` 和 `/questions/:id`），整体挂在 `/api` 下。

- [ ] **Step 3: 写 tests/questions.test.ts**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { app } from '../src/index.js';
import { authHeaders } from './helpers.js';

let pid: string;

beforeEach(async () => {
  const res = await app.request('/api/profiles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ examName: 'NPDP' }),
  });
  pid = (await res.json()).id;
});

const validQuestion = {
  stem: '产品生命周期分为几个阶段？',
  options: [
    { key: 'A', text: '3' },
    { key: 'B', text: '4' },
    { key: 'C', text: '5' },
    { key: 'D', text: '6' },
  ],
  answer: 'B',
  explanation: '导入、成长、成熟、衰退',
  tags: ['NPDP', '基础'],
  difficulty: 2,
};

describe('POST /api/profiles/:pid/questions', () => {
  it('creates question', async () => {
    const res = await app.request(`/api/profiles/${pid}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(validQuestion),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.stem).toBe(validQuestion.stem);
    expect(body.options).toHaveLength(4);
    expect(body.source).toBe('manual');
  });

  it('rejects answer not in options', async () => {
    const res = await app.request(`/api/profiles/${pid}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ ...validQuestion, answer: 'Z' }),
    });
    expect(res.status).toBe(400);
  });

  it('rejects unknown profile', async () => {
    const res = await app.request('/api/profiles/00000000-0000-0000-0000-000000000000/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(validQuestion),
    });
    expect(res.status).toBe(404);
  });
});

describe('GET /api/profiles/:pid/questions', () => {
  it('lists questions', async () => {
    await app.request(`/api/profiles/${pid}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(validQuestion),
    });
    const res = await app.request(`/api/profiles/${pid}/questions`, { headers: authHeaders() });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
  });
});

describe('GET /api/questions/:id', () => {
  it('returns single question', async () => {
    const created = await app
      .request(`/api/profiles/${pid}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(validQuestion),
      })
      .then((r) => r.json());
    const res = await app.request(`/api/questions/${created.id}`, { headers: authHeaders() });
    expect(res.status).toBe(200);
    expect((await res.json()).stem).toBe(validQuestion.stem);
  });
});
```

- [ ] **Step 4: 跑测试**

```bash
npm test
```

期望：所有测试 PASS（含上一个 task 的 8 个）。

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/questions.ts backend/src/index.ts backend/tests/questions.test.ts
git commit -m "feat(backend): question api with manual entry + tests"
```

---

### Task 10: Attempt API + WrongBook + 测试

**Files:**
- Create: `backend/src/routes/attempts.ts`
- Create: `backend/tests/attempts.test.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: 写 routes/attempts.ts**

```ts
import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import type { AuthVars } from '../middleware/auth.js';

const router = new Hono<{ Variables: AuthVars }>();

const submitSchema = z.object({
  chosen: z.string().min(1).max(20),
  timeSpentMs: z.number().int().min(0).max(60 * 60 * 1000).default(0),
});

router.post('/questions/:qid/attempts', async (c) => {
  const userId = c.get('userId');
  const qid = c.req.param('qid');

  const [q] = await db
    .select({
      q: schema.questions,
      p: schema.profiles,
    })
    .from(schema.questions)
    .innerJoin(schema.profiles, eq(schema.questions.profileId, schema.profiles.id))
    .where(eq(schema.questions.id, qid))
    .limit(1);
  if (!q || q.p.userId !== userId) return c.json({ error: 'not_found' }, 404);

  const body = await c.req.json().catch(() => null);
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'invalid_body' }, 400);

  const isCorrect = parsed.data.chosen === q.q.answer;

  const [row] = await db
    .insert(schema.attempts)
    .values({
      questionId: qid,
      userId,
      chosen: parsed.data.chosen,
      isCorrect,
      timeSpentMs: parsed.data.timeSpentMs,
    })
    .returning();

  return c.json({
    attempt: row,
    correctAnswer: q.q.answer,
    explanation: q.q.explanation,
  });
});

router.get('/profiles/:pid/wrongbook', async (c) => {
  const userId = c.get('userId');
  const pid = c.req.param('pid');

  const [profile] = await db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.id, pid))
    .limit(1);
  if (!profile || profile.userId !== userId) return c.json({ error: 'not_found' }, 404);

  // 拿这个档案下、当前用户最近一次作答错误的题
  const rows = await db.execute<{
    id: string;
    stem: string;
    options: { key: string; text: string }[];
    answer: string;
    explanation: string | null;
    last_chosen: string;
    last_attempted_at: Date;
    wrong_count: number;
  }>(sql`
    SELECT
      q.id, q.stem, q.options, q.answer, q.explanation,
      latest.chosen as last_chosen,
      latest.attempted_at as last_attempted_at,
      cnt.wrong_count
    FROM questions q
    JOIN LATERAL (
      SELECT chosen, is_correct, attempted_at
      FROM attempts
      WHERE question_id = q.id AND user_id = ${userId}
      ORDER BY attempted_at DESC
      LIMIT 1
    ) latest ON TRUE
    JOIN LATERAL (
      SELECT COUNT(*)::int as wrong_count
      FROM attempts
      WHERE question_id = q.id AND user_id = ${userId} AND is_correct = false
    ) cnt ON TRUE
    WHERE q.profile_id = ${pid}
      AND latest.is_correct = false
    ORDER BY latest.attempted_at DESC
  `);

  return c.json(rows);
});

router.get('/profiles/:pid/quiz/next', async (c) => {
  const userId = c.get('userId');
  const pid = c.req.param('pid');

  const [profile] = await db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.id, pid))
    .limit(1);
  if (!profile || profile.userId !== userId) return c.json({ error: 'not_found' }, 404);

  // v0.0.1 简化策略：随机抽一道未答过 OR 上次答错的题
  const rows = await db.execute<{
    id: string;
    stem: string;
    options: { key: string; text: string }[];
    difficulty: number;
  }>(sql`
    SELECT q.id, q.stem, q.options, q.difficulty
    FROM questions q
    LEFT JOIN LATERAL (
      SELECT is_correct
      FROM attempts
      WHERE question_id = q.id AND user_id = ${userId}
      ORDER BY attempted_at DESC
      LIMIT 1
    ) latest ON TRUE
    WHERE q.profile_id = ${pid}
      AND (latest.is_correct IS NULL OR latest.is_correct = false)
    ORDER BY RANDOM()
    LIMIT 1
  `);

  if (rows.length === 0) return c.json({ done: true });
  return c.json(rows[0]);
});

export { router as attemptsRouter };
```

- [ ] **Step 2: 在 index.ts 挂载**

```ts
import { attemptsRouter } from './routes/attempts.js';
// ...
app.route('/api', attemptsRouter);
```

完整 index.ts 应该是：

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

const app = new Hono<{ Variables: AuthVars }>();

app.use('/api/*', cors({ origin: 'http://localhost:5173', credentials: true }));
app.use('/api/*', auth);

app.get('/health', (c) => c.json({ ok: true, version: '0.0.1' }));
app.get('/api/me', (c) => c.json({ userId: c.get('userId') }));

app.route('/api/profiles', profilesRouter);
app.route('/api', questionsRouter);
app.route('/api', attemptsRouter);

serve({ fetch: app.fetch, port: config.PORT }, (info) => {
  console.log(`backend listening on :${info.port}`);
});

export { app };
```

- [ ] **Step 3: 写 tests/attempts.test.ts**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { app } from '../src/index.js';
import { authHeaders } from './helpers.js';

let pid: string;
let qid: string;

const validQuestion = {
  stem: '产品生命周期分为几个阶段？',
  options: [
    { key: 'A', text: '3' },
    { key: 'B', text: '4' },
    { key: 'C', text: '5' },
    { key: 'D', text: '6' },
  ],
  answer: 'B',
  explanation: '导入、成长、成熟、衰退',
};

beforeEach(async () => {
  const p = await app
    .request('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ examName: 'NPDP' }),
    })
    .then((r) => r.json());
  pid = p.id;
  const q = await app
    .request(`/api/profiles/${pid}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(validQuestion),
    })
    .then((r) => r.json());
  qid = q.id;
});

describe('POST /api/questions/:qid/attempts', () => {
  it('records correct attempt', async () => {
    const res = await app.request(`/api/questions/${qid}/attempts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ chosen: 'B', timeSpentMs: 5000 }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.attempt.isCorrect).toBe(true);
    expect(body.correctAnswer).toBe('B');
  });

  it('records wrong attempt and reveals answer', async () => {
    const res = await app.request(`/api/questions/${qid}/attempts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ chosen: 'A' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.attempt.isCorrect).toBe(false);
    expect(body.correctAnswer).toBe('B');
    expect(body.explanation).toBe(validQuestion.explanation);
  });
});

describe('GET /api/profiles/:pid/wrongbook', () => {
  it('returns wrong attempts only', async () => {
    // 答错一次
    await app.request(`/api/questions/${qid}/attempts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ chosen: 'A' }),
    });
    const res = await app.request(`/api/profiles/${pid}/wrongbook`, { headers: authHeaders() });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe(qid);
    expect(body[0].last_chosen).toBe('A');
    expect(body[0].wrong_count).toBe(1);
  });

  it('excludes question once correctly answered after wrong', async () => {
    // 先错
    await app.request(`/api/questions/${qid}/attempts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ chosen: 'A' }),
    });
    // 后对
    await app.request(`/api/questions/${qid}/attempts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ chosen: 'B' }),
    });
    const res = await app.request(`/api/profiles/${pid}/wrongbook`, { headers: authHeaders() });
    const body = await res.json();
    expect(body).toHaveLength(0); // 因为最近一次是对的
  });
});

describe('GET /api/profiles/:pid/quiz/next', () => {
  it('returns a question when unanswered exists', async () => {
    const res = await app.request(`/api/profiles/${pid}/quiz/next`, { headers: authHeaders() });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(qid);
  });

  it('returns done=true when all correctly answered', async () => {
    await app.request(`/api/questions/${qid}/attempts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ chosen: 'B' }),
    });
    const res = await app.request(`/api/profiles/${pid}/quiz/next`, { headers: authHeaders() });
    const body = await res.json();
    expect(body.done).toBe(true);
  });
});
```

- [ ] **Step 4: 跑测试**

```bash
npm test
```

期望：全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/attempts.ts backend/src/index.ts backend/tests/attempts.test.ts
git commit -m "feat(backend): attempt submission, wrongbook, and quiz/next"
```

---

## Phase D · 前端组件 + API

### Task 11: 通用组件库

**Files:**
- Create: `frontend/src/components/Box.tsx`
- Create: `frontend/src/components/Button.tsx`
- Create: `frontend/src/components/Chip.tsx`
- Create: `frontend/src/components/Input.tsx`
- Create: `frontend/src/components/Check.tsx`

- [ ] **Step 1: 写 Box.tsx**

```tsx
import type { HTMLAttributes, ReactNode } from 'react';

type Variant = 'soft' | 'thick' | 'dashed';

type Props = HTMLAttributes<HTMLDivElement> & {
  variant?: Variant;
  children: ReactNode;
};

const styleByVariant: Record<Variant, string> = {
  soft: 'border-[1.5px] border-ink rounded-soft bg-white',
  thick: 'border-[2.5px] border-ink rounded-thick bg-white shadow-brutal-sm',
  dashed: 'border-[1.5px] border-dashed border-ink-2 rounded-thick bg-transparent',
};

export function Box({ variant = 'soft', className = '', children, ...rest }: Props) {
  return (
    <div className={`${styleByVariant[variant]} ${className}`} {...rest}>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: 写 Button.tsx**

```tsx
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'accent' | 'default' | 'ghost';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
};

const styleByVariant: Record<Variant, string> = {
  default: 'border-2 border-ink bg-white text-ink',
  primary: 'border-2 border-ink bg-ink text-white',
  accent: 'border-2 border-accent bg-accent text-white',
  ghost: 'border-2 border-ink bg-transparent text-ink',
};

export function Button({ variant = 'default', className = '', children, disabled, ...rest }: Props) {
  return (
    <button
      className={`font-handBold font-bold text-sm rounded-full px-4 py-2 inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed ${styleByVariant[variant]} ${className}`}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 3: 写 Chip.tsx**

```tsx
import type { HTMLAttributes, ReactNode } from 'react';

type Props = HTMLAttributes<HTMLSpanElement> & {
  active?: boolean;
  children: ReactNode;
};

export function Chip({ active = false, className = '', children, ...rest }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 border-[1.5px] border-ink rounded-full px-2.5 py-0.5 font-cn text-xs cursor-pointer select-none ${
        active ? 'bg-accent-2 font-bold' : 'bg-white'
      } ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 4: 写 Input.tsx**

```tsx
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement>;
type AreaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

const baseStyle = 'border-[1.5px] border-ink rounded-lg bg-white px-3 py-2 font-cn text-sm text-ink w-full focus:outline-none focus:ring-2 focus:ring-accent';

export function Input({ className = '', ...rest }: InputProps) {
  return <input className={`${baseStyle} ${className}`} {...rest} />;
}

export function Textarea({ className = '', ...rest }: AreaProps) {
  return <textarea className={`${baseStyle} ${className}`} rows={3} {...rest} />;
}
```

- [ ] **Step 5: 写 Check.tsx**

```tsx
import type { HTMLAttributes } from 'react';

type Props = HTMLAttributes<HTMLDivElement> & {
  checked?: boolean;
  shape?: 'box' | 'circle';
};

export function Check({ checked = false, shape = 'box', className = '', ...rest }: Props) {
  const radius = shape === 'box' ? 'rounded' : 'rounded-full';
  return (
    <div
      className={`w-[18px] h-[18px] border-[1.5px] border-ink ${radius} flex items-center justify-center flex-shrink-0 cursor-pointer ${
        checked ? 'bg-ink' : 'bg-white'
      } ${className}`}
      {...rest}
    >
      {checked && shape === 'box' && <span className="text-white text-[13px] leading-none">✓</span>}
      {checked && shape === 'circle' && <span className="w-2 h-2 bg-white rounded-full" />}
    </div>
  );
}
```

- [ ] **Step 6: 改 App.tsx 临时演示组件**

```tsx
import { Box } from './components/Box';
import { Button } from './components/Button';
import { Chip } from './components/Chip';
import { Input } from './components/Input';
import { Check } from './components/Check';

export default function App() {
  return (
    <div className="min-h-full bg-paper p-6 max-w-md mx-auto space-y-4">
      <h1 className="font-display text-4xl">学不死 v0.0.1</h1>
      <p className="font-cn text-sm text-ink-2">组件预览</p>

      <Box variant="thick" className="p-4">
        <p className="font-cn text-sm">thick box + 立体阴影</p>
      </Box>
      <Box variant="soft" className="p-4">
        <p className="font-cn text-sm">soft box</p>
      </Box>
      <Box variant="dashed" className="p-4">
        <p className="font-cn text-sm">dashed box</p>
      </Box>

      <div className="flex gap-2 flex-wrap">
        <Button>default</Button>
        <Button variant="primary">primary</Button>
        <Button variant="accent">accent</Button>
        <Button variant="ghost">ghost</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Chip>普通</Chip>
        <Chip active>选中</Chip>
        <Chip>NPDP</Chip>
      </div>

      <Input placeholder="输入题干..." />

      <div className="flex items-center gap-2">
        <Check checked />
        <Check />
        <Check checked shape="circle" />
        <Check shape="circle" />
      </div>
    </div>
  );
}
```

- [ ] **Step 7: 浏览器验证**

```bash
npm run dev:frontend
```

打开 http://localhost:5173，确认：
- 三种 box 都能看出区别 ✓
- 4 种按钮颜色正确 ✓
- chip 选中态是黄色 ✓
- input 有黑边圆角 ✓
- check / radio 各两态 ✓

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/ frontend/src/App.tsx
git commit -m "feat(frontend): add base UI components matching wireframe styles"
```

---

### Task 12: API client + Routes

**Files:**
- Create: `frontend/src/api/client.ts`
- Create: `frontend/.env.local`
- Modify: `frontend/src/App.tsx`
- Create: `frontend/src/pages/ProfileList.tsx` (占位)

- [ ] **Step 1: 写 frontend/.env.local（gitignore 已覆盖）**

```
VITE_API_TOKEN=dev-fixed-token-change-me
```

注意：值必须跟 `backend/.env` 的 `API_TOKEN` 一致。

- [ ] **Step 2: 写 src/api/client.ts**

```ts
const TOKEN = import.meta.env.VITE_API_TOKEN as string;

if (!TOKEN) {
  throw new Error('VITE_API_TOKEN missing in frontend/.env.local');
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`api ${path} ${res.status}: ${detail}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type Profile = {
  id: string;
  examName: string;
  target: string | null;
  examDate: string | null;
  dailyMinutes: number;
  status: 'active' | 'archived' | 'given_up';
  createdAt: string;
};

export type Question = {
  id: string;
  stem: string;
  options: { key: string; text: string }[];
  answer: string;
  explanation: string | null;
  tags: string[];
  difficulty: number;
};

export type WrongItem = {
  id: string;
  stem: string;
  options: { key: string; text: string }[];
  answer: string;
  explanation: string | null;
  last_chosen: string;
  last_attempted_at: string;
  wrong_count: number;
};

export const api = {
  listProfiles: () => request<Profile[]>('/profiles'),
  createProfile: (input: { examName: string; target?: string; examDate?: string; dailyMinutes?: number }) =>
    request<Profile>('/profiles', { method: 'POST', body: JSON.stringify(input) }),
  getProfile: (id: string) => request<Profile>(`/profiles/${id}`),

  listQuestions: (pid: string) => request<Question[]>(`/profiles/${pid}/questions`),
  createQuestion: (
    pid: string,
    input: {
      stem: string;
      options: { key: string; text: string }[];
      answer: string;
      explanation?: string;
      tags?: string[];
      difficulty?: number;
    },
  ) => request<Question>(`/profiles/${pid}/questions`, { method: 'POST', body: JSON.stringify(input) }),

  nextQuiz: (pid: string) => request<Question | { done: true }>(`/profiles/${pid}/quiz/next`),
  submitAttempt: (qid: string, input: { chosen: string; timeSpentMs?: number }) =>
    request<{
      attempt: { id: string; isCorrect: boolean; chosen: string };
      correctAnswer: string;
      explanation: string | null;
    }>(`/questions/${qid}/attempts`, { method: 'POST', body: JSON.stringify(input) }),

  wrongbook: (pid: string) => request<WrongItem[]>(`/profiles/${pid}/wrongbook`),
};
```

- [ ] **Step 3: 写 ProfileList 占位**

```tsx
import { useEffect, useState } from 'react';
import { api, type Profile } from '../api/client';
import { Box } from '../components/Box';

export function ProfileList() {
  const [list, setList] = useState<Profile[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listProfiles().then(setList).catch((e) => setError(String(e)));
  }, []);

  if (error) return <Box variant="dashed" className="p-4">错误：{error}</Box>;
  if (!list) return <p className="font-cn text-ink-2">加载中...</p>;
  return (
    <div>
      <p className="font-cn text-sm text-ink-2 mb-2">档案数：{list.length}</p>
    </div>
  );
}
```

- [ ] **Step 4: 改 App.tsx 用 ProfileList**

```tsx
import { ProfileList } from './pages/ProfileList';

export default function App() {
  return (
    <div className="min-h-full bg-paper p-6 max-w-md mx-auto space-y-4">
      <h1 className="font-display text-4xl">学不死</h1>
      <ProfileList />
    </div>
  );
}
```

- [ ] **Step 5: 启动 frontend + backend 验证联通**

终端 1：
```bash
npm run dev:backend
```

终端 2：
```bash
npm run dev:frontend
```

浏览器开 http://localhost:5173，看到"档案数：0"——成功。如果看到 401，检查 `.env.local` 和 `backend/.env` 的 token 是否一致。

- [ ] **Step 6: Commit**

```bash
git add frontend/src/api/ frontend/src/pages/ProfileList.tsx frontend/src/App.tsx
git commit -m "feat(frontend): add api client and verify backend connectivity"
```

---

## Phase E · 前端页面

### Task 13: 路由 + ProfileList 完整版

**Files:**
- Create: `frontend/src/routes.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/pages/ProfileList.tsx`
- Create: `frontend/src/pages/ProfileCreate.tsx` (空骨架)
- Create: `frontend/src/pages/ProfileDetail.tsx` (空骨架)
- Create: `frontend/src/pages/QuestionAdd.tsx` (空骨架)
- Create: `frontend/src/pages/Quiz.tsx` (空骨架)
- Create: `frontend/src/pages/WrongBook.tsx` (空骨架)

- [ ] **Step 1: 写 routes.tsx**

```tsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProfileList } from './pages/ProfileList';
import { ProfileCreate } from './pages/ProfileCreate';
import { ProfileDetail } from './pages/ProfileDetail';
import { QuestionAdd } from './pages/QuestionAdd';
import { Quiz } from './pages/Quiz';
import { WrongBook } from './pages/WrongBook';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/profiles" replace /> },
  { path: '/profiles', element: <ProfileList /> },
  { path: '/profiles/new', element: <ProfileCreate /> },
  { path: '/profiles/:pid', element: <ProfileDetail /> },
  { path: '/profiles/:pid/questions/new', element: <QuestionAdd /> },
  { path: '/profiles/:pid/quiz', element: <Quiz /> },
  { path: '/profiles/:pid/wrongbook', element: <WrongBook /> },
]);
```

- [ ] **Step 2: 改 App.tsx 用 RouterProvider**

把布局下移到每个 page（通过 Layout 组件），App 只挂 Router：

```tsx
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';

export default function App() {
  return <RouterProvider router={router} />;
}
```

- [ ] **Step 3: 建 Layout 组件**

新增 `frontend/src/components/Layout.tsx`：

```tsx
import type { ReactNode } from 'react';

export function Layout({ title, children, back }: { title: string; children: ReactNode; back?: () => void }) {
  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-md mx-auto px-4 py-4">
        <header className="mb-3 flex items-center gap-2">
          {back && (
            <button onClick={back} className="font-handBold text-2xl leading-none">
              ‹
            </button>
          )}
          <h1 className="font-display text-3xl flex-1">{title}</h1>
        </header>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 写 ProfileList 完整版**

```tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Profile } from '../api/client';
import { Box } from '../components/Box';
import { Button } from '../components/Button';
import { Layout } from '../components/Layout';

function dDay(examDate: string | null) {
  if (!examDate) return null;
  const days = Math.ceil((new Date(examDate).getTime() - Date.now()) / 86400000);
  return days >= 0 ? `D-${days}` : `+${-days}d`;
}

export function ProfileList() {
  const [list, setList] = useState<Profile[] | null>(null);

  useEffect(() => {
    api.listProfiles().then(setList);
  }, []);

  return (
    <Layout title="我的备考">
      <div className="flex justify-end mb-3">
        <Link to="/profiles/new">
          <Button variant="primary">+ 新档案</Button>
        </Link>
      </div>

      {list === null && <p className="font-cn text-sm text-ink-2">加载中...</p>}
      {list?.length === 0 && (
        <Box variant="dashed" className="p-6 text-center">
          <p className="font-cn text-sm text-ink-2">还没有档案，点右上角新建一个</p>
        </Box>
      )}

      <div className="space-y-3">
        {list?.map((p) => (
          <Link key={p.id} to={`/profiles/${p.id}`} className="block">
            <Box variant="thick" className="p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-cn text-xs">主线</span>
                {dDay(p.examDate) && <span className="font-cn text-xs">{dDay(p.examDate)}</span>}
              </div>
              <div className="font-cn font-bold text-base">{p.examName}</div>
              <div className="font-cn text-xs text-ink-2 mt-1">
                {p.target ?? '无目标说明'} · 每天 {p.dailyMinutes} 分钟
              </div>
            </Box>
          </Link>
        ))}
      </div>
    </Layout>
  );
}
```

- [ ] **Step 5: 写其他 5 个 page 的占位骨架**

`frontend/src/pages/ProfileCreate.tsx`:
```tsx
import { Layout } from '../components/Layout';
export function ProfileCreate() {
  return <Layout title="新建档案">TODO</Layout>;
}
```

同样的占位写 `ProfileDetail.tsx` / `QuestionAdd.tsx` / `Quiz.tsx` / `WrongBook.tsx`，title 分别是「档案详情 / 加题 / 答题 / 错题本」。

- [ ] **Step 6: 浏览器验证**

刷新 http://localhost:5173 → 自动跳到 /profiles → 看到"还没有档案"卡片 + "+ 新档案"按钮。点按钮跳到 /profiles/new 看到占位"TODO"。

- [ ] **Step 7: Commit**

```bash
git add frontend/src/routes.tsx frontend/src/components/Layout.tsx frontend/src/pages/ frontend/src/App.tsx
git commit -m "feat(frontend): wire react-router and profile list page"
```

---

### Task 14: ProfileCreate 页面

**Files:**
- Modify: `frontend/src/pages/ProfileCreate.tsx`

- [ ] **Step 1: 写完整 ProfileCreate**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Box } from '../components/Box';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { Input, Textarea } from '../components/Input';
import { Layout } from '../components/Layout';

const dailyChips: { label: string; minutes: number }[] = [
  { label: '<30 min', minutes: 20 },
  { label: '1 小时', minutes: 60 },
  { label: '2 小时', minutes: 120 },
  { label: '>3 小时', minutes: 180 },
];

export function ProfileCreate() {
  const nav = useNavigate();
  const [examName, setExamName] = useState('NPDP');
  const [target, setTarget] = useState('');
  const [examDate, setExamDate] = useState('');
  const [dailyMinutes, setDailyMinutes] = useState(60);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!examName.trim()) {
      setError('考试名称必填');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await api.createProfile({
        examName: examName.trim(),
        target: target.trim() || undefined,
        examDate: examDate ? new Date(examDate).toISOString() : undefined,
        dailyMinutes,
      });
      nav(`/profiles/${created.id}`, { replace: true });
    } catch (e) {
      setError(String(e));
      setSubmitting(false);
    }
  }

  return (
    <Layout title="新建档案" back={() => nav(-1)}>
      <div className="space-y-3">
        <div>
          <label className="font-cn font-bold text-sm block mb-1">考试名称</label>
          <Input value={examName} onChange={(e) => setExamName(e.target.value)} placeholder="NPDP" />
        </div>

        <div>
          <label className="font-cn font-bold text-sm block mb-1">目标</label>
          <Textarea value={target} onChange={(e) => setTarget(e.target.value)} placeholder="例：60 分通过" />
        </div>

        <div>
          <label className="font-cn font-bold text-sm block mb-1">考试日期</label>
          <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
        </div>

        <div>
          <label className="font-cn font-bold text-sm block mb-1">每天能投入</label>
          <div className="flex gap-1 flex-wrap">
            {dailyChips.map((c) => (
              <Chip key={c.minutes} active={dailyMinutes === c.minutes} onClick={() => setDailyMinutes(c.minutes)}>
                {c.label}
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
          <Button variant="ghost" onClick={() => nav(-1)} className="flex-1 justify-center">
            取消
          </Button>
          <Button variant="primary" onClick={submit} disabled={submitting} className="flex-[1.4] justify-center">
            {submitting ? '建档中...' : '建档 ✓'}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
```

- [ ] **Step 2: 浏览器验证流程**

1. /profiles → 点 "+ 新档案"
2. 填 NPDP / 留空 target / 选个日期 / 选 1 小时
3. 点"建档 ✓"
4. 跳到 /profiles/<id>（占位 TODO）
5. 浏览器返回 /profiles 看到刚建的档案卡片

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/ProfileCreate.tsx
git commit -m "feat(frontend): profile create form"
```

---

### Task 15: ProfileDetail 页面

**Files:**
- Modify: `frontend/src/pages/ProfileDetail.tsx`

- [ ] **Step 1: 写完整 ProfileDetail**

```tsx
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, type Profile, type Question } from '../api/client';
import { Box } from '../components/Box';
import { Button } from '../components/Button';
import { Layout } from '../components/Layout';

export function ProfileDetail() {
  const { pid } = useParams<{ pid: string }>();
  const nav = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [questions, setQuestions] = useState<Question[] | null>(null);

  useEffect(() => {
    if (!pid) return;
    Promise.all([api.getProfile(pid), api.listQuestions(pid)]).then(([p, qs]) => {
      setProfile(p);
      setQuestions(qs);
    });
  }, [pid]);

  if (!profile || !questions) return <Layout title="加载中" back={() => nav('/profiles')}>...</Layout>;

  return (
    <Layout title={profile.examName} back={() => nav('/profiles')}>
      <Box variant="thick" className="p-3 mb-3 bg-chip-cream">
        <div className="font-cn text-xs text-ink-2">
          {profile.examDate
            ? `${new Date(profile.examDate).toLocaleDateString('zh-CN')} · 每天 ${profile.dailyMinutes} 分钟`
            : `每天 ${profile.dailyMinutes} 分钟（未设考试日期）`}
        </div>
        {profile.target && <div className="font-cn text-sm mt-1">{profile.target}</div>}
      </Box>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <Link to={`/profiles/${pid}/questions/new`}>
          <Box variant="soft" className="p-3 text-center hover:bg-chip-cream">
            <div className="font-cn font-bold">+ 加题</div>
            <div className="font-cn text-xs text-ink-2 mt-1">{questions.length} 道</div>
          </Box>
        </Link>
        <Link to={`/profiles/${pid}/quiz`}>
          <Box variant="soft" className="p-3 text-center hover:bg-chip-cream">
            <div className="font-cn font-bold">刷题</div>
            <div className="font-cn text-xs text-ink-2 mt-1">开始</div>
          </Box>
        </Link>
        <Link to={`/profiles/${pid}/wrongbook`}>
          <Box variant="soft" className="p-3 text-center hover:bg-chip-cream">
            <div className="font-cn font-bold">错题本</div>
            <div className="font-cn text-xs text-ink-2 mt-1">查看</div>
          </Box>
        </Link>
      </div>

      <h2 className="font-display text-xl mb-2">最近的题</h2>
      {questions.length === 0 && (
        <Box variant="dashed" className="p-4 text-center">
          <p className="font-cn text-sm text-ink-2">还没有题，先加几道再来</p>
        </Box>
      )}
      <div className="space-y-2">
        {questions.slice(0, 8).map((q) => (
          <Box key={q.id} variant="soft" className="p-3">
            <p className="font-cn text-sm leading-relaxed line-clamp-2">{q.stem}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-cn text-xs text-ink-2">难度 {'★'.repeat(q.difficulty)}</span>
              <span className="font-cn text-xs text-ink-2">{q.tags.slice(0, 3).join(' · ')}</span>
            </div>
          </Box>
        ))}
      </div>
    </Layout>
  );
}
```

- [ ] **Step 2: 浏览器验证**

进入刚建的档案 → 看到三个入口卡 + "还没有题"提示。

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/ProfileDetail.tsx
git commit -m "feat(frontend): profile detail with question count and entry cards"
```

---

### Task 16: QuestionAdd 页面（手输加题）

**Files:**
- Modify: `frontend/src/pages/QuestionAdd.tsx`

- [ ] **Step 1: 写完整 QuestionAdd**

```tsx
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
      await api.createQuestion(pid!, {
        stem: stem.trim(),
        options,
        answer,
        explanation: explanation.trim() || undefined,
        tags: tagInput.split(',').map((s) => s.trim()).filter(Boolean),
        difficulty,
      });
      if (continueAdd) {
        // 清空继续
        setStem('');
        setOptionTexts(['', '', '', '']);
        setAnswer('A');
        setExplanation('');
      } else {
        nav(`/profiles/${pid}`);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout title="加题" back={() => nav(`/profiles/${pid}`)}>
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
    </Layout>
  );
}
```

- [ ] **Step 2: 浏览器验证**

档案详情 → 点"+ 加题" → 输入一道 NPDP 真题（敲个简单的：题干"产品生命周期分几阶段" / A 3 B 4 C 5 D 6 / 答案 B / 解析"导入成长成熟衰退"） → 点"保存继续" → 表单清空 → 再加一道 → 点"保存返回" → 回档案详情看到题数 = 2。

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/QuestionAdd.tsx
git commit -m "feat(frontend): manual question entry form"
```

---

### Task 17: Quiz 页面（答题闭环）

**Files:**
- Modify: `frontend/src/pages/Quiz.tsx`

- [ ] **Step 1: 写 Quiz 完整版**

```tsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type Question } from '../api/client';
import { Box } from '../components/Box';
import { Button } from '../components/Button';
import { Layout } from '../components/Layout';

type Phase =
  | { kind: 'loading' }
  | { kind: 'done' }
  | { kind: 'asking'; q: Question; startAt: number; chosen: string | null }
  | { kind: 'revealed'; q: Question; chosen: string; correct: string; isCorrect: boolean; explanation: string | null };

export function Quiz() {
  const { pid } = useParams<{ pid: string }>();
  const nav = useNavigate();
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });

  async function loadNext() {
    setPhase({ kind: 'loading' });
    const next = await api.nextQuiz(pid!);
    if ('done' in next && next.done) {
      setPhase({ kind: 'done' });
    } else {
      setPhase({ kind: 'asking', q: next as Question, startAt: Date.now(), chosen: null });
    }
  }

  useEffect(() => {
    loadNext();
  }, [pid]);

  async function submit() {
    if (phase.kind !== 'asking' || !phase.chosen) return;
    const elapsed = Date.now() - phase.startAt;
    const res = await api.submitAttempt(phase.q.id, { chosen: phase.chosen, timeSpentMs: elapsed });
    setPhase({
      kind: 'revealed',
      q: phase.q,
      chosen: phase.chosen,
      correct: res.correctAnswer,
      isCorrect: res.attempt.isCorrect,
      explanation: res.explanation,
    });
  }

  return (
    <Layout title="答题" back={() => nav(`/profiles/${pid}`)}>
      {phase.kind === 'loading' && <p className="font-cn text-sm text-ink-2">加载中...</p>}

      {phase.kind === 'done' && (
        <Box variant="thick" className="p-6 text-center bg-chip-cream">
          <p className="font-display text-3xl mb-2">没题了 🎉</p>
          <p className="font-cn text-sm text-ink-2 mb-4">这个档案下所有题都答对过了。</p>
          <Button variant="primary" onClick={() => nav(`/profiles/${pid}`)}>
            返回档案
          </Button>
        </Box>
      )}

      {phase.kind === 'asking' && (
        <div className="space-y-3">
          <Box variant="thick" className="p-4 bg-chip-cream">
            <p className="font-cn text-base leading-relaxed whitespace-pre-wrap">{phase.q.stem}</p>
          </Box>
          <div className="space-y-2">
            {phase.q.options.map((o) => (
              <Box
                key={o.key}
                variant={phase.chosen === o.key ? 'thick' : 'soft'}
                className={`p-3 cursor-pointer ${phase.chosen === o.key ? 'bg-chip-cream' : ''}`}
                onClick={() => setPhase({ ...phase, chosen: o.key })}
              >
                <span className="font-handBold font-bold mr-2">{o.key}.</span>
                <span className="font-cn text-sm">{o.text}</span>
              </Box>
            ))}
          </div>
          <Button variant="primary" onClick={submit} disabled={!phase.chosen} className="w-full justify-center">
            提交
          </Button>
        </div>
      )}

      {phase.kind === 'revealed' && (
        <div className="space-y-3">
          <Box variant="thick" className="p-4 bg-chip-cream">
            <p className="font-cn text-base leading-relaxed whitespace-pre-wrap">{phase.q.stem}</p>
          </Box>
          <div className="space-y-2">
            {phase.q.options.map((o) => {
              const isUserChoice = o.key === phase.chosen;
              const isCorrect = o.key === phase.correct;
              const bg = isCorrect ? 'bg-chip-green' : isUserChoice ? 'bg-chip-pink' : '';
              return (
                <Box key={o.key} variant="soft" className={`p-3 ${bg}`}>
                  <span className="font-handBold font-bold mr-2">{o.key}.</span>
                  <span className="font-cn text-sm">{o.text}</span>
                  {isCorrect && <span className="font-cn text-xs ml-2 text-accent-4">正确</span>}
                  {isUserChoice && !isCorrect && <span className="font-cn text-xs ml-2 text-accent">你选的</span>}
                </Box>
              );
            })}
          </div>
          {phase.explanation && (
            <Box variant="dashed" className="p-3">
              <p className="font-cn font-bold text-xs mb-1">解析</p>
              <p className="font-cn text-sm whitespace-pre-wrap">{phase.explanation}</p>
            </Box>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => nav(`/profiles/${pid}`)} className="flex-1 justify-center">
              收摊
            </Button>
            <Button variant="primary" onClick={loadNext} className="flex-[1.4] justify-center">
              下一题 →
            </Button>
          </div>
        </div>
      )}
    </Layout>
  );
}
```

- [ ] **Step 2: 浏览器验证**

档案详情 → 点"刷题" → 看到一道之前手输的题 → 选 A → 提交 → 看到揭晓页（错的标粉，对的标绿，解析框） → 点"下一题 →" → 看到第二题 → 故意选错 → 看错题反馈。

继续点"下一题"直到把所有题答对一次，最后看到"没题了 🎉"。

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Quiz.tsx
git commit -m "feat(frontend): quiz page with submit and reveal flow"
```

---

### Task 18: WrongBook 页面

**Files:**
- Modify: `frontend/src/pages/WrongBook.tsx`

- [ ] **Step 1: 写 WrongBook**

```tsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type WrongItem } from '../api/client';
import { Box } from '../components/Box';
import { Button } from '../components/Button';
import { Layout } from '../components/Layout';

export function WrongBook() {
  const { pid } = useParams<{ pid: string }>();
  const nav = useNavigate();
  const [list, setList] = useState<WrongItem[] | null>(null);

  useEffect(() => {
    if (!pid) return;
    api.wrongbook(pid).then(setList);
  }, [pid]);

  return (
    <Layout title="错题本" back={() => nav(`/profiles/${pid}`)}>
      {list === null && <p className="font-cn text-sm text-ink-2">加载中...</p>}
      {list?.length === 0 && (
        <Box variant="dashed" className="p-6 text-center">
          <p className="font-cn text-sm text-ink-2">还没有错题——要么没刷过，要么全对 🌟</p>
        </Box>
      )}
      <div className="space-y-3">
        {list?.map((it) => {
          const correctOption = it.options.find((o) => o.key === it.answer);
          const chosenOption = it.options.find((o) => o.key === it.last_chosen);
          return (
            <Box key={it.id} variant="thick" className="p-3">
              <p className="font-cn text-sm leading-relaxed mb-2">{it.stem}</p>
              <div className="font-cn text-xs space-y-1">
                <div>
                  <span className="text-accent">你选：</span>
                  {it.last_chosen}. {chosenOption?.text}
                </div>
                <div>
                  <span className="text-accent-4">正确：</span>
                  {it.answer}. {correctOption?.text}
                </div>
                {it.explanation && (
                  <div className="text-ink-2 mt-2 pt-2 border-t border-dashed border-ink-3">{it.explanation}</div>
                )}
                <div className="text-ink-3 text-[10px] mt-1">错过 {it.wrong_count} 次</div>
              </div>
            </Box>
          );
        })}
      </div>
      {list && list.length > 0 && (
        <div className="mt-4">
          <Button variant="primary" onClick={() => nav(`/profiles/${pid}/quiz`)} className="w-full justify-center">
            再练一遍 →
          </Button>
        </div>
      )}
    </Layout>
  );
}
```

- [ ] **Step 2: 浏览器验证**

回到一个有错题的档案 → 点"错题本" → 看到错题列表 + 你选 vs 正确 + 解析 + 错过几次。

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/WrongBook.tsx
git commit -m "feat(frontend): wrongbook page"
```

---

## Phase F · 集成 + 收尾

### Task 19: CLAUDE.md 填充 + 端到端验收

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: 把 CLAUDE.md 的 Tech Stack/Quick Start/Structure 填上**

替换 CLAUDE.md 中 `_TBD —— ...` 三处占位为：

```markdown
## Tech Stack

- Runtime: Node.js 22 (`.nvmrc` 已锁)
- Frontend: Vite + React 18 + TypeScript + Tailwind CSS + React Router v6
- Backend: Hono + Drizzle ORM + PostgreSQL 15+
- Workspace: npm workspaces（`frontend/` + `backend/`）
- AI（v0.0.2 起）: qwen-vl-max / DeepSeek-V3 / Claude Sonnet（详见 docs/design.md 第 7 章）

## Quick Start

```bash
# 一次性
nvm use                                    # 装 node 22
brew install postgresql@15 && brew services start postgresql@15
createdb learn_or_die_lite
npm install

cp backend/.env.example backend/.env       # 然后改 API_TOKEN（任意 8+ 字符串）
echo "VITE_API_TOKEN=<刚才那个 API_TOKEN>" > frontend/.env.local

cd backend && npx drizzle-kit migrate && npm run seed && cd ..
# 把 seed 输出的 SEED_USER_ID 写进 backend/.env

# 日常开发（开两个终端）
npm run dev:backend                        # :3001
npm run dev:frontend                       # :5173
```

后端测试：`cd backend && npm test`

## Structure

```
frontend/        # Vite + React H5
backend/         # Hono API + Drizzle
docs/            # design.md, plan-v0.0.1.md
learn-or-die-linephoto/   # 线框图（Claude Design 输出）
```

## Dev Rules

- 启动脚本必须带 `NODE_OPTIONS=--max-old-space-size=2048`（已在 root package.json 内置）
- 禁用 Next.js（v2 React Compiler 雷）；H5 用 Vite
- 不接腾讯 OCR；拍照/PDF 解析直接用多模态大模型 API
- 不引入组件库（shadcn/MUI/Ant），自己实现线框图风格
- 单用户 token 写死在 .env，登录系统 v0.1.0+ 再做
```

- [ ] **Step 2: 端到端验收**

按 Quick Start 命令重新跑一次（假设新机器）：

1. ✅ 启动 backend + frontend
2. ✅ 浏览器打开 → 跳到 /profiles → 看到"还没有档案"
3. ✅ 新建 NPDP 档案
4. ✅ 进入档案详情
5. ✅ 加 3 道 NPDP 题
6. ✅ 进入答题，第 1 题选错、第 2 题选对、第 3 题选对
7. ✅ 错题本看到第 1 题
8. ✅ 第 1 题再练一遍选对，错题本变空

任何步骤失败 → 修，再 commit。

- [ ] **Step 3: 跑测试 + lint**

```bash
cd backend && npm test
# 全 PASS

cd ../frontend && npm run build
# 编译通过，无 ts 错误
```

- [ ] **Step 4: 最终 commit**

```bash
git add CLAUDE.md
git commit -m "docs: fill CLAUDE.md tech stack, quick start, and structure for v0.0.1"
git tag v0.0.1
```

---

## 完工 checklist

- [ ] 19 个 task 全部 commit
- [ ] backend `npm test` 全 PASS
- [ ] frontend `npm run build` 编译通过
- [ ] 浏览器跑通：建档 → 加题 → 答题（含选错）→ 错题本能看到错题 → 再练对清空错题本
- [ ] CLAUDE.md 三处占位填齐
- [ ] git log 看到清晰的 feat/chore commit 历史
- [ ] git tag v0.0.1

完工后告诉作者：可以开始往 NPDP 题库里手动塞题了，下一切片 v0.0.2 接 AI 加题管线。
