# 学不死 lite · 产品演进路线

三阶段视角 — 当下、近期、远期。每一阶段的核心问题不同：能不能用 → 用得安不安心 → 能不能长大。

---

## Stage 1 · 现阶段（MVP 可用）✅

**核心问题**：作者本人能不能在 H5 上完整跑通备考流程。

| 模块 | 状态 |
|---|---|
| 档案 / 多用户 / 注册登录 | ✅ v0.7.0 |
| 4 种加题：拍照 / 手输 / PDF / AI 出题 | ✅ v0.2 |
| 查重提醒 ≥0.85 | ✅ v0.2 |
| 今日刷题 + 错题本 | ✅ v0.3.1 |
| 题目页问 AI + 教材 RAG | ✅ v0.5 |
| AI 陪学 Tab（独立对话） | ✅ v0.4 |
| 视觉打磨（v2 设计语言 · 霞鹜文楷 · 红影） | ✅ v0.8.0 |
| VPS 上线 · 手机可访问 | ✅ http://82.156.139.33:3001 |
| PDF 导入断点续传 | ✅ v0.0.8.2 |

**P1 验收 7 条全部达成。**

---

## Stage 2 · 下期迭代（用得安心 + 数据闭环）

**核心问题**：产品稳定可托付，能呈现学习节奏。

### A. 安全与数据保命（强烈优先）

- **数据备份** —
  - `GET /api/me/export`：一键导出当前用户全部档案 / 题库 / 错题 / 教材引用为 JSON
  - VPS systemd timer 每日 `pg_dump` 推 COS（已有 `zp1-1428145534` bucket），保留 7 天
- **HTTPS** — 装 Caddy + Let's Encrypt 自动续证，需要先备好域名（腾讯云 `.top` / `.xyz` 几块钱一年即可）。当前 HTTP 登录密码明文走公网。

### B. 学习节奏可视化（用户新提）

- **答题时长统计** — 每条 attempt 已经有时间字段（如果没有就加 `duration_ms`），档案详情顶部新增 **进度条**
  - 维度 1：今日已学时长 / `daily_minutes` 目标
  - 维度 2：今日刷题数 / `daily_questions` 目标（新增字段）
  - 用户可以在档案里二选一作为主目标
- **本周节奏热力图** — 7 个小方块，颜色深浅表示当日刷题数（参考 GitHub contribution）

### C. 同类问题顺手收尾

- **教材 PDF 上传也支持断点续传** — `textbook-worker.ts` 是同款"重启标 failed"逻辑，复用刚才 import-jobs 的套路：textbook 表把已切片 `chapters/pages` 持久化、`processed_chapter_idx` 字段记进度、selfHeal 改 resume。约 30 分钟。
- **手机端真实回测**（task #26）— 被动观察，遇到 bug 反馈。

### D. AI 教练风格可选（用户提）

当前 prompt 默认 **"严格教练"** 风格：拒绝离题陪聊、不顺着拖延、表扬具体不空。

后期让用户在档案设置里选教练风格：

- **严格教练**（当前默认）— 拉回备考主线，针对拖延坚定推动
- **温柔同伴** — 多共情、节奏慢一点
- **段子手** — 用幽默化解压力
- **冷静学者** — 偏知识深度，少情绪
- **可自定义** — 用户写一段自我设定的 system prompt 附加段

实现：profile 表加 `coach_style` enum + 可选 `coach_prompt_addon` 文本，buildStudySystemPrompt 按 style 套不同的"严格度"段落。

### F. 分享（用户提）

- **分享软件**：登录页 / 我的页加 "邀请朋友" 按钮，生成带 logo + slogan 的分享卡片
  - 微信分享（如果做 PWA + 标记 og:tags）
  - 复制链接 + 二维码下载到本地（最低门槛）
- **分享题包**：题库管理选中 N 道 → 导出为 JSON 链接 → 朋友点链接能一键复制到自己档案
  - 一种轻量"题包市场"前身，给 Stage 3 的交易市场探路
  - 实现：question/share 端点生成短码 → 接收方 import

### G. 支持其他题型（用户提）

当前只支持单选。要扩到：
- **判断题** (True/False)：options 固定 `[T, F]`，schema 不动只是 UI 简化
- **多选题** (multi-choice)：answer 字段从 string 改成 string[]，Quiz 页改成多选 checkbox
- **简答题** (short answer)：answer 是文本，AI 评判用户答案对错（语义匹配 + 相似度）
- **填空题** (fill blank)：题干含 `___` 占位符，answer 是关键词数组

工作量：
- schema 加 `question_type` enum: 'single' | 'multi' | 'judge' | 'short' | 'blank'
- 拍照识题 / PDF 解析的 LLM prompt 要按类型分发
- Quiz 答题 UI 按类型渲染不同控件
- 评判逻辑要按类型走（短答用 LLM 判分）

按价值排序: 判断题 (1 天) → 多选 (2 天) → 简答 (3 天，需 LLM 评判) → 填空 (2 天)

### E. UI / 文案打磨（积累中）

- ProfileList 卡片再优化（当前比较朴素）
- 错题本/题库管理页跟 v2 视觉语言完全对齐
- Quiz 顶部进度条样式精修

### F. 开放设计问题 · 陪学入库 conversationContext 边界

**背景**：v0.0.10 实装了「AI 陪学发图问题 → 讨论 → 一键加入题库」流程。入库时前端把"该用户图片消息之后的对话"作为 conversationContext 喂给视觉模型，让它综合教材标准 + 师生讨论给出最终答案/解析（解决用户跟 AI 讨论后纠正倾向性答案的场景，如波士顿矩阵现金牛策略）。

**当前实现（best-effort 启发式）**：
- 起点：用户那条带图消息之后
- 终点：遇到下一条带图的用户消息 OR 累计 8 条，取先到的
- 兜底：QuestionConfirm 确认页本就允许用户校对/编辑所有字段，AI 偏了能纠正

**问题**：分界基于"用户拍下一张图 = 在问新题"的假设，但用户可能拍其他知识点的图、可能拍一图后纯文字闲聊很久不发新图。conversationContext 容易夹带噪音。

**4 个候选方案**（积累真实使用数据后再决定）：
1. **维持现状 + 靠确认页兜底**（已实现）：启发式分段，确认页是用户最后一道关
2. **入库前弹浮层让用户反勾不相关消息**：默认全勾，给用户一次干预机会。比手动勾选省事，比全自动多一步
3. **AI 二次筛**：先让模型读上下文判断"哪些是讨论本题"，再用筛后的喂识题。准但慢且贵
4. **强制用户勾选**：操作重 + 容易勾错，已被否

**触发研究的信号**：
- 用户反馈"入库的答案/解析跟讨论结论不符"频次 ≥ 3 次/周
- 或在数据中看到 conversationContext 长度经常 > 4 条但识题答案明显跑偏

记于 2026-05-21（lornax & Claude 讨论）。

### G. v0.0.10.1 待办（陪学体验深化 + 成本优化）

用户 2026-05-21 提出, 等回来后单独开版本做完这 4 条。

1. **入库成功 marker 消息**: 一道题入库后, 在对话框正中央插一条灰色细字 "✓ 上述题目已加入题库"。给用户完成感闭环, 同时给 AI 一个天然的"题目分隔线", 比"下一张图分界"启发式可靠。
   - schema: `study_chat_messages` 加 `is_note boolean default false`
   - link-question 端点入库成功后自动 insert 一条 `role='assistant', isNote=true` 的 marker 消息
   - 前端 Bubble: isNote=true → 居中灰色小字样式 (不是普通气泡)
   - conversationContext 收集: 遇到 isNote 截断

2. **chatStudy 前过滤已入库段, 省 token**: 入库段 (从那条带图 user 消息 → 讨论 → marker) 在 chatStudy 发送 history 时全部抹掉, 模型看不到, 前端仍能完整展示 (db 数据不动)。预期单档案可问题数涨 2-3 倍。
   - 过滤规则: 找到 user role + linkedQuestionId 非空的消息, 排除该消息及其后续到 isNote 消息 (含) 之间所有消息
   - 在 study-chat POST handler 拼 history 时实施

3. **会话长度告警**: 后端算 history 总字符数, response 带 `tokenWarn: 'yellow' | 'red' | null`. 前端 chip 提示。
   - 黄色阈值: ≥ 14000 字 (≈ 70% qwen-vl-max 窗口)
   - 红色阈值: ≥ 18000 字 (≈ 90%)
   - 提示文案: "对话太长 AI 可能记不全, 建议点下方清空重新打招呼"

4. **主 fallback 顺序对调, coding plan 优先**: 当前 `withFallback(client, MODEL_VISION, codingClient, FB_VISION, ...)` 主走按 token 计费, coding plan 只兜底, 没用上套餐优势。对调成 `withFallback(codingClient, FB_VISION, client, MODEL_VISION, ...)` 主走 coding plan (包月不按 token), 按 token key 兜底保命。
   - 改动: ai/client.ts 里所有 withFallback 调用 (5 处) 调换前 2 个 + 后 2 个参数
   - 前置: 确认 VPS .env 里 DASHSCOPE_CODING_API_KEY 已设
   - 见 memory: `feedback_dashscope_plan.md`

记于 2026-05-21（lornax & Claude 讨论）。

---

## Stage 3 · 远期方向（产品长大）

**核心问题**：单人工具 → 社区/市场 / 专家级 AI 教练。

### 1. 交易市场 + 社交广场（原线框图已规划）

参考 `learn-or-die-linephoto/` 早期线框图。

- **市场**：题包 / 错题本 / 学习计划上架与采购，作者署名 + 分润
- **广场**：上岸墙、备考日志、关注/动态
- **审核**：UGC 内容审核体系
- 数据模型预留：`Question.source = 'market'` + `sourceMeta` jsonb 已有

### 2. 专家级 AI 教练 / 超级助理

针对市面上热门考试做"垂直专家"角色，比 system prompt 更深：

- **候选考试**（按受众规模）：考研 / 公考 / CPA / 法考 / 教资 / NPDP / PMP / 软考
- **专家化路径**：
  - 教材库（全套教材 RAG 预加载，用户开通即用）
  - 真题库（近 5 年真题 + 解析预加载）
  - 模考 prompt（专家级 mock，按知识点比例）
  - 错题归因 prompt（不是泛泛说"再练练"，能定位到"你在 XX 知识点的迷惑项识别能力弱"）
- **商业模式**：按考试订阅 / 按陪考天数 / freemium（核心免费 + 专家解析付费）

### 3. 产品长大需要补什么 — 留白脑暴

待业务跑起来后定期回看：
- 学习社群（备考小组、互相督促）
- 真人教练入驻（人 + AI 协同）
- 移动 App（Taro 转小程序，再考虑原生）
- 数据洞察（用户备考画像、群体节奏对比）
- 与第三方学习/打卡工具打通（如番茄钟 API、Notion）

---

## 当前 Tech Debt（不阻塞 MVP，下期顺手清）

- `docs/design.md` 第 7 章 "AI 陪学 Tab" 标记为 TODO，实际 v0.4 已完成，docs 没更新
- `task #89 v0.6.2: 教材 reprocess` 实际已完成（cleanChapterTitle + reprocess endpoint），task list 没关
- VPS `/opt/learn-or-die-lite/public/assets/` 累积 10+ 历史 bundle 文件，可清
- `learn-or-die-lite/CLAUDE.md` 的 Tech Debt 区块需要同步更新
