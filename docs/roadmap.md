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
| VPS 上线 · 手机可访问 | ✅ http://<your-vps-ip>:3001 |
| PDF 导入断点续传 | ✅ v0.0.8.2 |

**P1 验收 7 条全部达成。**

---

## Stage 2 · 下期迭代（用得安心 + 数据闭环）

**核心问题**：产品稳定可托付，能呈现学习节奏。

### A. 安全与数据保命（强烈优先）

- **数据备份** —
  - `GET /api/me/export`：一键导出当前用户全部档案 / 题库 / 错题 / 教材引用为 JSON
  - VPS systemd timer 每日 `pg_dump` 推 COS（用 `COS_BUCKET` env 指定），保留 7 天
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

### E. UI / 文案打磨（积累中）

- ProfileList 卡片再优化（当前比较朴素）
- 错题本/题库管理页跟 v2 视觉语言完全对齐
- Quiz 顶部进度条样式精修

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
