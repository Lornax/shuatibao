# 生图 Prompt 集合

给 Midjourney / 即梦 / 可灵 / Stable Diffusion 用。

整体视觉调性 — 跟产品 v2 设计语言一致：
- **暖色纸调**：米色 `#faf5ec` 背景，深棕 `#2a1f15` 主线条
- **红色点缀**：`#c14d2e`（产品 accent 色）
- **手作感**：粗黑边、布鲁特立体阴影、手写体或楷体字
- **不要**：3D 渲染、霓虹科技感、过度商业插画

---

## 01 · 封面主视觉 (`01-cover.png`)

```
A flat illustration of an open notebook on a wooden desk, warm afternoon light coming from a window, a cup of tea, scattered pens and sticky notes, a smartphone leaning against a stack of books displaying a study app interface, paper-like beige texture background #faf5ec, deep brown line work #2a1f15, brick-red accent #c14d2e for highlights, hand-drawn brutalist style with thick borders and offset shadows, no gradients, no glow, calm and warm, 16:9 wide composition, generous negative space on the right for title text
```

**中文备用**：
```
一张扁平插画 · 木质书桌上摊开一本笔记本 · 午后暖阳从窗外洒进来 · 一杯茶 · 散落的笔和便利贴 · 手机靠在一摞书旁边显示一个学习 App 界面 · 米色纸质质感背景 · 深棕色线条 · 砖红色作为点缀色 · 手绘布鲁特立体风格 · 粗边框 · 偏移阴影 · 不要渐变 · 不要发光效果 · 平静温暖 · 16:9 宽幅构图 · 右侧留白用于放标题
```

---

## 02 · 一个人备考的痛点 (`02-painpoint.png`)

```
A flat illustration of a person studying alone at night at a small desk, a single warm lamp, a clock showing late hours, scattered exam papers, a half-eaten snack, the person's posture shows quiet determination, not exhaustion or sadness, beige paper background #faf5ec, deep brown line work, single brick-red accent on a sticky note that reads "fight on", hand-drawn brutalist style, thick black borders, offset shadows, 16:9 wide composition
```

---

## 15 · Part 2 封面 — 给备考的你 (`15-hero.png`)

```
A flat illustration split into two halves: left side a person studying, right side the same person victorious holding an exam pass certificate, smooth transition between the two halves with a winding paper road connecting them, warm beige background #faf5ec, deep brown line work, brick-red accent on the certificate, hand-drawn brutalist style, no gradient, thick borders, generous negative space, 16:9 composition
```

---

## 04 · 产品三件事图解 (`04-three-pillars.png`，可选)

```
Three rounded squares side by side on a beige paper background, each containing a simple icon and a Chinese character label: left "档" (file) with a folder icon, middle "题" (question) with a checkmark in circle, right "聊" (chat) with a speech bubble icon, deep brown borders with offset red shadow, hand-drawn brutalist style, no gradient, no 3D, flat 2D, 16:9 with the three squares centered
```

---

## 17 · 核心闭环 (`17-loop.png`)

```
A circular flow diagram on beige paper #faf5ec, four nodes arranged in a circle with arrows between them, each node is a hand-drawn rounded rectangle with deep brown border and a single Chinese label: 建档, 加题, 刷题, 复盘, the arrows are drawn with slight hand-wobble, brick-red accent on the arrows, no 3D, no gradient, flat brutalist illustration style, 16:9
```

---

## 26 · 致谢页背景 (`26-thanks.png`)

```
A simple flat illustration of two hands shaking, warm beige background #faf5ec, deep brown line art, brick-red accent in the connecting space, hand-drawn brutalist style, thick borders, offset shadow, generous negative space, 16:9 composition, suitable as a background for "Thank you" text overlay
```

---

## 提示词参数建议

| 平台 | 推荐参数 |
|---|---|
| **Midjourney** | 末尾加 `--ar 16:9 --style raw --v 6` |
| **即梦 / Doubao** | "扁平插画"、"无渐变"、"手绘风" 强调一下 |
| **可灵** | 直接用中文版 prompt，参数选 16:9，质量"高" |
| **Stable Diffusion** | + 反向词：`3d, render, glow, neon, blurry, gradient` |

---

## 关键原则

1. **不要 AI 字体**：图里不要放中文字，让 AI 写字 99% 出错。文字在 HTML 里加。
2. **保持一致性**：6 张图最好用同一个 prompt 风格关键词（"flat illustration · beige paper · brutalist · hand-drawn"），换的只是主体内容。
3. **留白**：每张图都要留 30%+ 空间，方便 HTML 里叠文字。
4. **如果生图效果不好，截图也能用**：实际产品截图（题库 / 陪学对话）甚至比 AI 生图更打动人，因为真实。
