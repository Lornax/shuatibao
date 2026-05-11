# learn-or-die-lite · 一期 (P1) Design Doc

版本：v0.6 · 2026-05-07
作者：Lornax
状态：draft 定稿，进 plan 阶段

**v0.6 修订**（vs v0.5）：
- **切片从 6 片合并到 3 片**：拍照/PDF/AI 出题三个加题入口本质同源（多模态 LLM 解析 → 编辑确认 → 保存），合并到 v0.0.2 一片做完；查重并入 v0.0.2；AI 陪学并入 v0.0.3。总开发周期从 10-12 天缩到 7-10 天，约 2 个日历周
- **去掉腾讯 OCR**：拍照/PDF 解析改用多模态大模型 API（qwen-vl-max / Claude Sonnet vision）一次调用直接出结构化 JSON，省掉一次网络往返、一份秘钥、一份合规对接
- 第 7 章 AI 能力分配相应更新；"PDF 批量导入"原描述的"批量"涵义（队列、并发、失败重试）在单用户场景不存在，去掉这个伪需求

**v0.5 修订**（vs v0.4）：
- 新增第 11 章「视觉风格」：风格定位「温柔同伴 · 学习日记」（neo-brutalist 厚黑边 + 米色纸 + 圆润气泡 + 手写中点缀），design tokens 直接复用线框图 styles.css
- 字体混搭策略：**中文走系统字体（PingFang / Noto Sans SC）保证长文本耐读，英文/数字/装饰走 Caveat / Patrick Hand / Kalam 增温度**——规避"手写字体长文本费眼"的劣势
- 加入"避免过软"的视觉约束：核心信息（按钮、错题计数、考试日期）用厚黑边 + 立体阴影，给"温柔陪伴"装"不是玩具"的骨架

**v0.4 修订**（vs v0.3）：
- **本地优先**：每个切片以"本地跑通可用"为完成标准，不强求每片都部署到 VPS
- VPS 部署改为**独立于切片节奏的阶段性里程碑事件**，默认建议 v0.0.3（PDF 导入完成、题库有规模后）做第一次部署，主要为支持手机刷题；具体时机由作者决定
- 第 2 章目标和第 10 章节奏底线相应调整

**v0.3 修订**（vs v0.2）：
- **推翻 8 周里程碑**。备考产品要在备考期内有用，作者考完才上线没意义
- 改成**按最小可用切片增量推进**：v0.0.1 → v0.0.6 共 6 个切片，每片 1-3 天
- 全部 P1 必需功能预计 2-3 个日历周走完（取决于作者备考期间能投入的开发时间）
- 登录系统延后到 v0.1.0 之后；OnbC 对话式注册延后到 v0.0.4 之后（AI 能力接好再做）

**v0.2 修订**（vs v0.1）：
- 核心闭环补全 OnbC 注册到 PlanB 建档的衔接：AI 对话提取身份/在备考啥 → 直接跳建档表单（AI 预填"每天投入时长"默认值，用户可改）→ 进入 P1 闭环
- 延期砍项调整：原"砍 AI 出题"→ 改为"砍简单归档"（作者备考期内大概率未考完 NPDP，归档不会被使用）。AI 出题保留 P1，因其在"PDF 导入/聊天遇到错题"场景下是顺势功能

---

## 1. 产品定位

**学不死 lite** 是一个 **H5 备考陪跑工具**，给一个人在备考路上提供"档案管理 + 题库 + AI 陪学"三件事。

**一句话**：让用户把自己的备考资料喂进系统，系统帮他刷、帮他催、帮他复盘，最后拿结果。

**不做什么**（P1 边界）：
- 不做社交（广场、上岸墙、关注、动态）
- 不做 UGC 市场（错题本买卖、作者分润、审核体系）
- 不做 AI 全网搜资料（建档后让 AI 搜罗+采购清单的流程）
- 不做用户画像可视化、AI 周报
- 不做小程序（H5 起步，后续要小程序再用 Taro 转）
- 不做付费（P1 完全免费，订阅入口仅占位 UI）

## 2. 一期目标与验收

**目标**：尽快做出能让 **作者本人** 在备考 NPDP 期间立刻使用的 H5 应用，**本地优先**按切片增量推进，每个切片本地跑通可用即算完成，2-3 个日历周走完 P1 必需功能（本地版）。VPS 部署作为阶段性里程碑事件，不绑定切片节奏。

**第一个种子用户**：作者本人，备考 NPDP（产品经理国际认证），目标日期待定。

**P1 验收标准**（必须全部达成才算 P1 完成）：
1. 作者能在 H5 里建一个 NPDP 备考档案、填进考试日期和每天投入时长
2. 作者能用拍照、手输、PDF 批量导入、AI 出题 4 种方式 至少把 100 道 NPDP 真题录入题库
3. 题库有查重提醒（相似度 ≥70% 弹出）
4. 作者能在 H5 上做"今日 20 题"刷题闭环，错题自动进错题本
5. 在题目页能问 AI"讲讲 X 概念"，AI 给出回答+引用相关题
6. AI 陪学会在作者连续 2 天没刷题时弹催促（H5 内提醒，不依赖系统通知）
7. 部署在腾讯云北京 VPS，能从手机浏览器访问，整套链路稳定跑 1 周不崩

**非验收**（P1 阶段不评估）：
- 视觉打磨（线框图保真度即可）
- 性能优化（首屏 < 3s 即可）
- 多用户支持（一个用户跑通就行，但 schema 要预留）

## 3. 信息架构

P1 砍掉广场和市场两个 Tab。剩下 **3 个 Tab**：

| Tab | 内容 | 对应线框图 |
|---|---|---|
| 备考 | 档案列表 / 新建 / 详情 / 简单归档 | wf-plan PlanA/B/C/D |
| AI 陪学 | 主聊天 + 今日陪学(催促打卡) | wf-rest AiA/B |
| 我的 | 头像/昵称/订阅占位/隐私/退出 | wf-rest MeA（精简） |

**题库不是顶级 Tab**，它从「备考档案详情」里进入——每个档案有自己的题库。这样信息层次更清晰：档案是组织单位，题库归属档案。

注册：用 OnbC_Chat（AI 对话式 1 屏），跳过 A/B 多步流。

题库管理在档案详情下挂二级页：管理首页（Lib_Manage）、加题 sheet（Lib_AddSheet）、拍照识题（Lib_OcrEdit）、查重（Lib_Dup）、批量导入（Lib_BulkImport）。加题 sheet 里去掉「市场」「粘贴链接」两个入口，保留 4 个：拍照、手输、文件导入、AI 出题。

## 4. 核心闭环（用户视角）

```
OnbC 对话注册                    PlanB 建档表单
(提取身份/行业/  ───────►   (AI 预填"每天投入"默认值
 在备考什么)                  用户可改; 填考试日期/目标)
                                       │
                                       ▼
                          加题(拍照/手输/PDF/AI生成)
                                       │
                                       ▼
                                  查重提醒
                                       │
                                       ▼
                                  题库就绪
                                       │
                          ┌────────────┴────────────┐
                          ▼                         ▼
                     今日 20 题刷题             AI 陪学聊天
                          │                         │
                          ▼                         ▼
                     错题进错题本               问 AI 概念
                          │                         │
                          └─────► 连续打卡 / 催促 ◄──┘
                                       │
                                       ▼
                              考试 → 归档(打勾完成)
```

**注册到建档的衔接**：OnbC 对话的产出（身份/关注领域/在备考啥）会带到 PlanB 表单作预填，"每天投入时长"由 AI 根据对话推荐一个默认 chip，用户可在表单里直接改。建档前不依赖 AI 对话也能跑通——表单本身字段完整。

## 5. 数据模型（核心实体）

> P1 用 PostgreSQL + Drizzle ORM。schema 字段名只列关键字段，详细见 `db/schema.ts`（plan 阶段产出）。

```
User          id, email/phone, nickname, avatar, identity, industry, focus_tags, created_at
Profile       id, user_id, exam_name, target, exam_date, daily_minutes, status, archived_at
              status ∈ {active, archived, given_up}
Question      id, profile_id, stem, options(jsonb), answer, explanation, tags, difficulty,
              source(enum: photo|manual|pdf|ai_gen), source_meta(jsonb), created_at
Attempt       id, question_id, user_id, chosen, is_correct, time_spent_ms, attempted_at
WrongBook     视图：从 Attempt 聚合，is_correct=false 且未标记掌握的 question_id
ChatMessage   id, profile_id, role(user|ai), content, attachments(jsonb), created_at
DailyTask     id, profile_id, date, planned_count, done_count, task_list(jsonb)
              用于催促判断："连续 N 天 done_count = 0" → 触发催促
SimilarPair   id, q1_id, q2_id, similarity(float), status(pending|merged|kept_both)
              查重产出，用户处理后写状态
```

**P1 阶段刻意不建的表**：
- 大佬关注关系、市场订单、作者收益、上岸墙发布——这些 P2 再加
- 用户画像深度标签（"夜猫子/实践派"那套）——P1 不可视化，所以不存

## 6. 技术架构

```
┌─────────────────────────────────────────┐
│  H5 前端 (Vite + React + TS)             │
│  · 移动端优先, 桌面端兼容                  │
│  · 状态管理: Zustand (轻, 不用 Redux)     │
│  · 路由: React Router v6                 │
│  · UI: 自己实现线框图风格 + Tailwind      │
└──────────────┬──────────────────────────┘
               │ REST/JSON over HTTPS
               ↓
┌─────────────────────────────────────────┐
│  后端 (Node.js + Hono + TS)              │
│  · 单体应用, 不微服务                      │
│  · NODE_OPTIONS=--max-old-space-size=2048│
│  · ORM: Drizzle                          │
│  · 鉴权: JWT (HttpOnly Cookie)           │
└──────┬──────────────────────────┬───────┘
       │                          │
       ↓                          ↓
┌──────────────┐      ┌────────────────────┐
│ PostgreSQL   │      │  AI Provider Layer │
│ (北京 VPS)    │      │  · DeepSeek        │
│              │      │  · Claude          │
│ 不上 Redis    │      │  · 腾讯云 OCR       │
│ (P1 用不到)   │      │  · 通义 qwen-vl    │
└──────────────┘      └────────────────────┘
                              │
                              ↓
                      ┌──────────────┐
                      │  腾讯 COS     │
                      │  (题目图片)    │
                      └──────────────┘
```

**部署**：单台北京 VPS（CLAUDE.md 已记载：4核3.6G无swap，82.156.139.33）。前端构建产物 + 后端进程都跑这台。Postgres 也在同台（P1 数据量小，1 个用户）。

**为什么不用 Next.js**：v2 的 React Compiler 雷在记忆里。Vite 启动快、心智简单、不引入 SSR/RSC 复杂度。MVP 阶段不需要 SEO（H5 备考工具登录后才能用）。

**为什么不用 Redis**：P1 单用户，缓存收益约等于零。需要时再加。

## 7. AI 能力分配

| 能力 | Provider | 备选 | 备注 |
|---|---|---|---|
| 拍照识题 / PDF 解析（图片或 PDF → 结构化题目 JSON） | 通义 qwen-vl-max | Claude Sonnet vision | 一次调用直接出 JSON（题干/选项/答案/解析），不分 OCR + 文本两步 |
| 查重相似度判定 | qwen embedding 或 DeepSeek embedding + 余弦 | - | embedding 落库，增量比对 |
| AI 出题 | Claude Sonnet | DeepSeek 备选 | 出题质量敏感，用强模型 |
| AI 陪学聊天 | DeepSeek-V3 | - | 高频低敏感，走便宜的 |
| AI 搜索研究 (题目页问答) | Claude Sonnet | - | RAG：检索题库 + 知识点片段 |

**Provider 抽象**：实现一个 `AIClient` interface，每个能力点走自己的 provider。秘钥放 `.env`，永远不进 commit。

**为什么不接腾讯 OCR**（vs v0.5）：原计划"OCR + 文本结构化"两步流程，多一次网络往返、多一份秘钥、多一份合规对接。多模态 LLM（qwen-vl / Claude vision）已经能直接吃图/PDF 出结构化 JSON，一步搞定。质量也更好——看到图就理解题目语境，不像 OCR 只把字符抠出来。

**成本预算**（粗算）：作者一人用，所有 AI 调用月成本 < ¥100。多模态调用单价比纯文本贵几倍，但拍照/PDF 录入是低频动作（一次几十张图，备考期内总量可控）。

## 8. 关键决策与权衡

| 决策 | 选 | 不选 | 理由 |
|---|---|---|---|
| 形态 | H5 | 微信小程序 | 避开类目审核（AI 内容类难过），后续可用 Taro 转 |
| 前端框架 | Vite + React | Next.js | 避开 v2 React Compiler 雷，MVP 不需要 SSR |
| 后端框架 | Hono | Express/Fastify | TypeScript 端到端类型最优、轻量、性能好 |
| 数据库 | PostgreSQL | SQLite/MySQL | 题库要 jsonb（选项）+ 全文搜索 + embedding 向量 |
| ORM | Drizzle | Prisma | Drizzle 更轻、不依赖额外进程、SQL-like API |
| 题库 Tab | 不做顶级 Tab，在档案下 | 顶级 Tab | 信息层次：档案是组织单位 |
| 登录方式 | 邮箱+密码 起步 | 微信网页授权 | P1 一个用户，最简实现；后续可加微信授权 |
| 缓存 | 不上 Redis | 上 Redis | P1 单用户，无 QPS 压力 |
| 监控 | 进程级 systemd journal | Sentry/Datadog | 单机 P1 不值得引入 |

## 9. 风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| 拍照识题准确率低 | 题录入痛苦，用户放弃 | 识别后强制走"编辑确认"页（已在线框图），允许人工改 |
| PDF 批量导入版面千差万别 | 部分 PDF 解析失败 | 失败的题标"需手动补充"，不阻塞流程 |
| 查重相似度阈值不准 | 漏判或误判 | P1 阶段两档：≥90% 自动归组、70-90% 提示用户 |
| AI 出题质量差 | 用户不信任 | 出题标"AI 生成"标签，混入真题里时区分 |
| VPS 内存只有 3.6G 无 swap | OOM 拖死整机 | NODE_OPTIONS 上限 2G，Postgres shared_buffers 限 512MB |
| AI 模型 API 限流/挂掉 | 关键功能不可用 | Provider 抽象层支持运行时切换；OCR 失败回退手输 |
| NPDP 题库初始数据从哪来 | 没题就跑不起来 | 作者本人 8 周内主要靠拍照 + PDF 导入；不依赖第三方题库 |

## 10. 切片增量开发计划

按最小可用切片增量在 **本地** 跑通。每个切片本地能跑能用即算完成。VPS 部署作为**阶段性里程碑事件**，不是每个切片必做。

| 版本 | 估时 | 内容 | 本地跑通后作者能做什么 |
|---|---|---|---|
| **v0.0.1** | 2-3 天 | 脚手架（前后端 + DB）+ 建档（最简表单）+ 手输加题 + 答题 + 错题本 + 单用户(token 写死) | 把 NPDP 真题手动敲进系统刷，跑通最小闭环 |
| **v0.0.2** | 3-4 天 | AI 加题管线（拍照 / PDF 上传 / AI 出题 三个入口共用一条管线：上传或输入 → 多模态 LLM 解析 → 编辑确认页 → 保存）+ 查重（embedding + 相似度） | 拍真题书页 / 传 PDF / AI 凭知识点出题，三种方式塞满题库；重复题自动归组 |
| **v0.0.3** | 2-3 天 | AI 陪学主聊天 + 题目页问 AI（含上下文里 AI 顺势出新题） | 不会的题问 AI，AI 顺势出新题强化；P1 必需功能完工 |

**总计约 7-10 个有效开发日**，按作者备考期间能投入的时间，约 **2 个日历周** 走完本地版。

**为什么从 6 片合并到 3 片**（vs v0.5）：
- 拍照、PDF、AI 出题本质同源：输入媒介不同但都走"上传/输入 → 多模态 LLM 解析 → 编辑确认 → 保存"。拆成三片是工程动作大于实际收益
- "PDF 批量导入"原描述的"批量"涵义（队列、并发、失败重试）在单用户场景不存在——就是个普通 PDF 上传
- 查重和加题强相关（每次新增题都要查重），合并到 v0.0.2 一气写完

**v0.0.1 的"最简表单建档"**：OnbC 对话式注册依赖 AI 能力（v0.0.3 才接），v0.0.1 阶段先用一个直白表单（NPDP / 考试日期 / 每天时长）走通建档。OnbC 在 AI 接好后回填，作为 v0.0.4+ 的内容。

**已从 P1 砍掉**：
- **简单归档**：作者备考期内大概率未考完 NPDP，归档零使用，P1.5 再加
- **催促打卡推送**：H5 没法主动 push，AI 主聊天里有催促语就够了，独立打卡逻辑 P1.5 再加
- **登录系统**：单用户 token 写死，多设备/多用户场景出现再做（v0.1.0+）

**VPS 部署时机**（独立于切片节奏）：
- 部署是阶段性里程碑事件，不强求每片都部署。原因：单用户、本地能跑、备考期间作者大部分时候在 mac 前
- 触发部署的两种典型场景：(a) 作者要从手机刷题（NPDP 通勤场景）；(b) P1 整体走完后做一次"上线发布"
- 默认建议：**v0.0.2 完成后部署一次**——题库已经能塞满，从手机刷题价值最大；v0.0.3 后再发一次完整版

**节奏底线**：每个切片必须**本地实际跑起来、作者实际用过**才算完成。不允许"代码写完没本地验证"或"本地起不来还往下做"。

## 11. 视觉风格

**风格定位**：温柔同伴 · 学习日记（neo-brutalist 厚黑边 + 米色纸 + 圆润气泡 + 手写中点缀）

**情感基调**：长期陪伴、低心理压力、像翻自己的笔记本。**不**是冷峻商业感，也**不**是软萌玩具感——靠厚黑边 + 立体偏移阴影把"温柔"装上"不是玩具"的骨架。

**Design tokens**（直接复用 `learn-or-die-linephoto/styles.css` 的变量，下面是关键值）：

| Token | 值 | 用途 |
|---|---|---|
| `--paper` | `#fafaf6` | 主背景（米色纸） |
| `--ink` | `#1a1a1a` | 文字 / 边框 / 主按钮底色 |
| `--ink-2 / --ink-3` | `#4a4a4a / #888` | 次级文字 |
| `--accent` | `#d94a3a` | 强调色（红，发送按钮、关键数据） |
| `--accent-2` | `#f4c542` | 高亮黄（学的徽章、highlight 笔触） |
| `--accent-3` | `#4a7eb8` | 中性蓝 |
| `--accent-4` | `#6ba368` | 完成绿 |
| 圆角 | box 8-14px / 气泡 14-22px / 按钮 22px / 手机壳 38px | 圆润但不软 |
| 边框 | 1.5-2.5px 实线 `#1a1a1a` | 厚黑边是核心识别符 |
| 立体阴影 | `4px 4px 0 #1a1a1a` | 关键卡片/手机壳/按钮——neo-brutalist 招牌 |

**字体策略**（关键决策，规避"长文本费眼"）：

| 角色 | 中文 | 英文/数字 |
|---|---|---|
| 标题（h1/h2） | PingFang SC / Noto Sans SC, 700 | Caveat 700（手写飘逸） |
| 强调（h3、按钮） | PingFang SC 700 | Kalam 700（手写但厚实） |
| 正文 | PingFang SC / Noto Sans SC, 400, 14-15px, line-height 1.5+ | Patrick Hand（手写印刷感） |
| 装饰/批注 | — | Caveat（红色 accent 用） |

**为什么混搭**：中文手写体（江城手书、霞鹜文楷等）在 14-16px 长段落下识别成本高（截图中作者已指出）；走系统中文字体保证一屏 AI 长回复也不费眼。英文字母数字总量小，走手写体可承担"温度"和"日记感"，不影响阅读。

**核心组件清单**（直接搬 styles.css 的 wf-* class，前端实现层把 wf- 前缀改成实际命名）：

| 线框图 class | 用途 | P1 落地优先级 |
|---|---|---|
| `wf-phone` / `wf-screen` | 移动屏壳（H5 模拟手机时用） | 不需要——H5 直接全屏 |
| `wf-box` / `wf-box-soft` / `wf-box-thick` / `wf-box-dashed` | 卡片层级 | P0（v0.0.1 必备） |
| `wf-btn` / `wf-btn-primary` / `wf-btn-accent` / `wf-btn-ghost` | 按钮 | P0 |
| `wf-chip` / `wf-chip-fill / blue / green / pink` | 标签 / 选项 | P0 |
| `wf-input` | 输入框 | P0 |
| `wf-prog` | 进度条 | P0 |
| `wf-check` / `wf-radio` | 选择控件 | P0 |
| `wf-hl` | 黄色 highlighter 笔触 | P0（高频用于强调） |
| `wf-underline` | 波浪下划线 | P1（次级强调） |
| `wf-squiggle` | 手绘 SVG 分隔线 | P1（点缀） |
| `wf-tabbar` | 底部 Tab Bar | P0 |
| `wf-sheet` | 底部 sheet（加题入口用） | P0 |
| `wf-stack` | 卡片叠层（多档案/上岸列表用） | P2（lite P1 仅一个档案，单卡） |
| `wf-img` 占位斜杠 / `wf-avatar` 占位脸 | 占位元素 | 不需要——P1 已有真实图/头像 |

**实现路径**：
- v0.0.1 用 Tailwind CSS 自定义主题映射这套 tokens（`tailwind.config.js` 里把 `--ink` `--paper` `--accent` 全部接进 `theme.extend.colors`）
- 字体文件：Caveat / Patrick Hand / Kalam 走 Google Fonts CDN 或自托管；中文系统字体不需要加载
- 不引入 shadcn/Material/Ant 等组件库——风格冲突，自己实现这十几个 class 即可
- 暗色模式 P1 不做（学习日记本就是米色纸感，暗色破坏氛围）

## 12. 与 v2 的关系

**不 fork v2**（CLAUDE.md 已强调）。lite 从空仓库起步，只装真正用到的依赖。

v2 的具体雷已在父级 CLAUDE.md 列出，复述要点：
- 禁用 `reactCompiler: true`
- dev 启动必带 `NODE_OPTIONS=--max-old-space-size=2048`
- skill 扫描时排除 `*.test.ts`（lite 不用 skill 体系，本条不适用）
- git config 用 noreply 邮箱

## 13. 下一步

- [x] 评审本 doc，v0.3 定稿
- [ ] 进 plan 阶段，按 v0.0.1 切片用 superpowers 的 writing-plans skill 切到任务级
- [ ] 启动 v0.0.1：建仓库 + CLAUDE.md 填充 Tech Stack/Quick Start/Structure + 部署管线打通
- [ ] 第一个 commit 之前先配 git local config（noreply 邮箱）
