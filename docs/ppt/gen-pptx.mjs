// 生成 deck.pptx — 26 张 16:9 slide
// 跑法: cd docs/ppt && npm install && node gen-pptx.mjs
// 截图丢进 images/ 后再跑一次, 图片会自动嵌入

import pptxgen from 'pptxgenjs';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMG = (name) => {
  const p = join(__dirname, 'images', name);
  return existsSync(p) ? p : null;
};

// 调色板
const C = {
  paper: 'FAF5EC',
  paperWarm: 'FEF3C7',
  ink: '2A1F15',
  ink2: '6A5340',
  ink3: '8A7560',
  accent: 'C14D2E',
  accent2: 'F5D97A',
  accent3: '4A7EB8',
  accent4: '6BA368',
  chipBlue: 'DDE7EF',
  chipGreen: 'DFECDB',
  chipPink: 'FCE0D5',
  chipCream: 'FEF3C7',
};

const FONT_CN = '霞鹜文楷 TC';
const FONT_CN_FALLBACK = 'PingFang SC';

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE'; // 13.333" × 7.5"
pres.title = '学不死 lite · 路演';
pres.author = 'Lornax';
pres.company = '学不死 lite';

// 通用 slide 母版: 米色背景 + 右下角页码
pres.defineSlideMaster({
  title: 'BASE',
  background: { color: C.paper },
  objects: [
    { rect: { x: 0, y: 0, w: 13.333, h: 0.15, fill: { color: C.accent } } },
    { text: {
        text: '',
        options: {
          placeholder: 'footer',
          x: 12.5, y: 7.1, w: 0.7, h: 0.3,
          fontSize: 10, fontFace: FONT_CN, color: C.ink3, align: 'right',
        },
      },
    },
  ],
  slideNumber: { x: 12.5, y: 7.1, w: 0.7, h: 0.3, fontSize: 10, color: C.ink3, fontFace: FONT_CN },
});

// helper: 加 title
function addTitle(slide, text) {
  slide.addText(text, {
    x: 0.5, y: 0.35, w: 12.3, h: 0.9,
    fontSize: 32, bold: true,
    fontFace: FONT_CN,
    color: C.ink,
  });
}

// helper: 加圆角矩形 box
function addBox(slide, opts) {
  const { x, y, w, h, bg = 'FFFFFF', borderColor = C.ink, borderWidth = 1.5, shadow = true } = opts;
  const shapeOpts = {
    x, y, w, h,
    fill: { color: bg },
    line: { color: borderColor, width: borderWidth },
  };
  if (shadow) {
    shapeOpts.shadow = { type: 'outer', color: C.ink, blur: 0, offset: 3, angle: 45, opacity: 0.15 };
  }
  slide.addShape(pres.ShapeType.roundRect, { ...shapeOpts, rectRadius: 0.08 });
}

// helper: box 里加文字
function addBoxText(slide, x, y, w, h, lines, opts = {}) {
  const items = Array.isArray(lines) ? lines : [{ text: lines }];
  slide.addText(items.map((l) => ({ text: l.text, options: l.options || {} })), {
    x, y, w, h,
    fontFace: FONT_CN,
    color: C.ink,
    fontSize: 14,
    valign: 'top',
    paraSpaceAfter: 4,
    ...opts,
  });
}

// helper: 截图槽 - 9:16 手机比例 (尺寸: 2.1 × 3.73)
function addPhoneScreenshot(slide, x, y, imgName, fallbackText) {
  const w = 2.1, h = 3.73;
  const path = IMG(imgName);
  if (path) {
    slide.addImage({ path, x, y, w, h, sizing: { type: 'contain', w, h } });
  } else {
    addBox(slide, { x, y, w, h, bg: 'F0E6D0', borderColor: C.ink3, borderWidth: 1, shadow: false });
    slide.addText(fallbackText || '手机截图\n9:16 槽位', {
      x, y, w, h, fontSize: 12, fontFace: FONT_CN, color: C.ink3, align: 'center', valign: 'middle',
    });
  }
}

// helper: 普通图片槽 (任意比例)
function addImage(slide, x, y, w, h, imgName, fallbackText) {
  const path = IMG(imgName);
  if (path) {
    slide.addImage({ path, x, y, w, h, sizing: { type: 'contain', w, h } });
  } else {
    addBox(slide, { x, y, w, h, bg: 'F0E6D0', borderColor: C.ink3, borderWidth: 1, shadow: false });
    slide.addText(fallbackText || '图片占位', {
      x, y, w, h, fontSize: 12, fontFace: FONT_CN, color: C.ink3, align: 'center', valign: 'middle',
    });
  }
}

// ===== Slide 01: 封面 =====
{
  const s = pres.addSlide({ masterName: 'BASE' });
  s.addText('学不死', {
    x: 0.5, y: 2.4, w: 12.3, h: 1.4,
    fontSize: 80, bold: true, fontFace: FONT_CN, color: C.ink, align: 'center',
  });
  s.addText('lite', {
    x: 0.5, y: 3.4, w: 12.3, h: 1.2,
    fontSize: 72, bold: true, fontFace: FONT_CN, color: C.accent, align: 'center',
  });
  s.addText('一个 H5 备考陪跑工具', {
    x: 0.5, y: 4.7, w: 12.3, h: 0.5,
    fontSize: 24, fontFace: FONT_CN, color: C.ink2, align: 'center',
  });
  addBox(s, { x: 4.5, y: 5.4, w: 4.3, h: 0.6, bg: C.paper, borderColor: C.accent, borderWidth: 2 });
  s.addText('4 天 · 从 0 到 1 · 一个人 · 一直在线', {
    x: 4.5, y: 5.4, w: 4.3, h: 0.6,
    fontSize: 18, fontFace: FONT_CN, color: C.accent, align: 'center', valign: 'middle',
  });
  s.addText('Lornax · 2026-05 · 备考 NPDP 期间', {
    x: 0.5, y: 6.4, w: 12.3, h: 0.4,
    fontSize: 14, fontFace: FONT_CN, color: C.ink3, align: 'center',
  });
}

// ===== Slide 02: 为什么做这个 =====
{
  const s = pres.addSlide({ masterName: 'BASE' });
  addTitle(s, '为什么做这个？');
  s.addText('一个人备考的真痛点 ↓', {
    x: 0.5, y: 1.3, w: 12.3, h: 0.4, fontSize: 16, fontFace: FONT_CN, color: C.ink2,
  });
  const boxY = 2.0, boxH = 2.5, boxW = 4.0;
  // 没人催
  addBox(s, { x: 0.5, y: boxY, w: boxW, h: boxH, bg: C.chipPink });
  s.addText('📵 没人催', { x: 0.7, y: boxY + 0.2, w: boxW - 0.4, h: 0.6, fontSize: 22, bold: true, fontFace: FONT_CN, color: C.ink });
  s.addText('一个人备考没人 push，今天看了没看全靠自觉', { x: 0.7, y: boxY + 1.0, w: boxW - 0.4, h: 1.3, fontSize: 14, fontFace: FONT_CN, color: C.ink });
  // 看不进
  addBox(s, { x: 4.7, y: boxY, w: boxW, h: boxH, bg: C.chipCream });
  s.addText('📖 看不进', { x: 4.9, y: boxY + 0.2, w: boxW - 0.4, h: 0.6, fontSize: 22, bold: true, fontFace: FONT_CN, color: C.ink });
  s.addText('真题刷完答案过一遍，明天再做又错同一道', { x: 4.9, y: boxY + 1.0, w: boxW - 0.4, h: 1.3, fontSize: 14, fontFace: FONT_CN, color: C.ink });
  // 没策略
  addBox(s, { x: 8.9, y: boxY, w: boxW, h: boxH, bg: C.chipBlue });
  s.addText('🤔 没策略', { x: 9.1, y: boxY + 0.2, w: boxW - 0.4, h: 0.6, fontSize: 22, bold: true, fontFace: FONT_CN, color: C.ink });
  s.addText('错题积压，距考还剩 N 天，今天先做什么？', { x: 9.1, y: boxY + 1.0, w: boxW - 0.4, h: 1.3, fontSize: 14, fontFace: FONT_CN, color: C.ink });

  addBox(s, { x: 0.5, y: 5.0, w: 12.3, h: 1.4, bg: C.chipCream });
  s.addText('想造个工具', { x: 0.7, y: 5.2, w: 11.9, h: 0.5, fontSize: 18, bold: true, fontFace: FONT_CN, color: C.accent });
  s.addText('让自己更专心备考 NPDP — 顺手做成可分享给别人的产品。', { x: 0.7, y: 5.7, w: 11.9, h: 0.6, fontSize: 16, fontFace: FONT_CN, color: C.ink });
}

// ===== Slide 03: v2 教训 =====
{
  const s = pres.addSlide({ masterName: 'BASE' });
  addTitle(s, '上一代 v2 的教训');
  // 左栏 - 3 个坑
  const leftX = 0.5, leftW = 6.0;
  const pinkBoxes = [
    { y: 1.5, t: '🧨 reactCompiler 吃 88G', d: 'v2 dashboard Next 16 + reactCompiler:true，两次拖死 macOS' },
    { y: 3.2, t: '🦠 fork 来的复杂度', d: '从 we-assistant fork，带了一堆不需要的渠道 / skills / sqlite 路径污染' },
    { y: 4.9, t: '💥 iLink 22 秒 OOM', d: 'VPS 4G 默认堆，启动后 22s 崩，根因到现在没查清' },
  ];
  for (const b of pinkBoxes) {
    addBox(s, { x: leftX, y: b.y, w: leftW, h: 1.5, bg: C.chipPink });
    s.addText(b.t, { x: leftX + 0.2, y: b.y + 0.15, w: leftW - 0.4, h: 0.5, fontSize: 18, bold: true, fontFace: FONT_CN, color: C.ink });
    s.addText(b.d, { x: leftX + 0.2, y: b.y + 0.7, w: leftW - 0.4, h: 0.7, fontSize: 13, fontFace: FONT_CN, color: C.ink });
  }
  // 右栏 - lite 的决定
  const rightX = 6.8, rightW = 6.0;
  s.addText('lite 的决定', { x: rightX, y: 1.5, w: rightW, h: 0.6, fontSize: 22, bold: true, fontFace: FONT_CN, color: C.accent });
  s.addText([
    { text: '• 从空项目起步，', options: {} },
    { text: '不 fork 任何骨架', options: { bold: true } },
    { text: '\n• 不带微信渠道、不开 React Compiler', options: { bold: false } },
    { text: '\n• dev 启动必带 --max-old-space-size=2048 当保险丝', options: {} },
    { text: '\n• 每加一个依赖、每带一个模块都问"现在真的需要它吗"', options: {} },
  ], { x: rightX, y: 2.1, w: rightW, h: 3.5, fontSize: 15, fontFace: FONT_CN, color: C.ink, paraSpaceAfter: 6 });
  s.addText('"不抄复杂度"是开发的第一件事', { x: rightX, y: 5.7, w: rightW, h: 0.5, fontSize: 18, bold: true, fontFace: FONT_CN, color: C.accent });
}

// ===== Slide 04: 三件事 =====
{
  const s = pres.addSlide({ masterName: 'BASE' });
  s.addText('学不死 lite 只做三件事', { x: 0.5, y: 0.5, w: 12.3, h: 0.8, fontSize: 32, bold: true, fontFace: FONT_CN, color: C.ink, align: 'center' });
  const items = [
    { x: 1.0, bg: C.chipBlue, icon: '📋', title: '档案', desc1: '每个考试一个档案', desc2: '填考试日期、每天投入' },
    { x: 4.95, bg: C.chipGreen, icon: '📚', title: '题库', desc1: '4 种加题方式', desc2: '查重 / 错题本 / 教材 RAG' },
    { x: 8.9, bg: C.chipPink, icon: '🤖', title: 'AI 陪学', desc1: '知道你的真实状态', desc2: '给具体行动，不泛泛而谈' },
  ];
  for (const it of items) {
    addBox(s, { x: it.x, y: 2.0, w: 3.4, h: 3.6, bg: it.bg });
    s.addText(it.icon, { x: it.x, y: 2.2, w: 3.4, h: 1.0, fontSize: 64, align: 'center' });
    s.addText(it.title, { x: it.x, y: 3.4, w: 3.4, h: 0.6, fontSize: 26, bold: true, fontFace: FONT_CN, color: C.ink, align: 'center' });
    s.addText(`${it.desc1}\n${it.desc2}`, { x: it.x + 0.2, y: 4.2, w: 3.0, h: 1.2, fontSize: 14, fontFace: FONT_CN, color: C.ink, align: 'center' });
  }
  s.addText('不做的：社交 · 市场 · 付费 · 小程序 · UGC 审核 · 用户画像可视化', {
    x: 0.5, y: 6.0, w: 12.3, h: 0.5, fontSize: 14, fontFace: FONT_CN, color: C.ink2, align: 'center',
  });
}

// ===== Slide 05: 开发原则 =====
{
  const s = pres.addSlide({ masterName: 'BASE' });
  addTitle(s, '开发原则 · 四条铁律');
  const items = [
    { x: 0.5, y: 1.5, title: '🧭 约束先行', desc: '新项目第一件事：写 CLAUDE.md。没有规范的工作空间不动手。' },
    { x: 6.8, y: 1.5, title: '👀 可视化原型在前', desc: '写代码前先做 HTML 原型给自己看，让产品决策发生在写代码前。' },
    { x: 0.5, y: 3.7, title: '📐 Superpowers 流程', desc: 'brainstorming → design doc → plan → TDD → code review。不跳步。' },
    { x: 6.8, y: 3.7, title: '🚧 红线必先问', desc: '删文件 / 改 .env / git push / DB schema 变更 — 即使 auto-accept 也必须停下来确认。' },
  ];
  for (const it of items) {
    addBox(s, { x: it.x, y: it.y, w: 6.0, h: 1.9, bg: 'FFFFFF' });
    s.addText(it.title, { x: it.x + 0.2, y: it.y + 0.15, w: 5.6, h: 0.5, fontSize: 18, bold: true, fontFace: FONT_CN, color: C.ink });
    s.addText(it.desc, { x: it.x + 0.2, y: it.y + 0.7, w: 5.6, h: 1.1, fontSize: 14, fontFace: FONT_CN, color: C.ink });
  }
  s.addText('"好产品的第一步是逻辑透明，功能完美其次"', { x: 0.5, y: 6.0, w: 12.3, h: 0.5, fontSize: 16, bold: true, fontFace: FONT_CN, color: C.accent, align: 'center' });
}

// ===== Slide 06: Tech Stack =====
{
  const s = pres.addSlide({ masterName: 'BASE' });
  addTitle(s, 'Tech Stack · 全景');
  const cards = [
    { x: 0.5, y: 1.5, bg: C.chipBlue, title: '后端', desc: 'Hono · Drizzle ORM · PostgreSQL 15' },
    { x: 0.5, y: 3.0, bg: C.chipGreen, title: '前端', desc: 'Vite · React 18 · TS · Tailwind · Router 6' },
    { x: 0.5, y: 4.5, bg: C.chipPink, title: 'AI', desc: 'Qwen-VL · Qwen-Max · DeepSeek-V3 · text-embedding-v3\n通过 dashscope OpenAI 兼容端点统一调用' },
    { x: 6.8, y: 1.5, bg: C.chipCream, title: '存储 / 部署', desc: '腾讯云 COS (北京) · VPS 4 核 3.6G · systemd' },
    { x: 6.8, y: 3.0, bg: 'FFFFFF', title: '测试', desc: 'vitest · 94 个集成测试 · 真 DB 不 mock' },
    { x: 6.8, y: 4.5, bg: C.ink, title: '一句话', desc: '所有 AI 走一个 key，所有数据走一个库，\n所有静态走一个 bucket。简单到能一个人维护。', invert: true },
  ];
  for (const c of cards) {
    addBox(s, { x: c.x, y: c.y, w: 6.0, h: 1.4, bg: c.bg });
    s.addText(c.title, { x: c.x + 0.2, y: c.y + 0.15, w: 5.6, h: 0.5, fontSize: 17, bold: true, fontFace: FONT_CN, color: c.invert ? C.paper : C.ink });
    s.addText(c.desc, { x: c.x + 0.2, y: c.y + 0.7, w: 5.6, h: 0.7, fontSize: 13, fontFace: FONT_CN, color: c.invert ? C.paper : C.ink });
  }
}

// ===== Slide 07: 多用户演进 =====
{
  const s = pres.addSlide({ masterName: 'BASE' });
  addTitle(s, '多用户演进 · Schema 早预留的回报');
  const items = [
    { v: 'v0.0.1 — 单用户起步', d: 'SEED_USER_ID 写死，但 schema 所有表都加 user_id 字段并 NOT NULL' },
    { v: 'v0.0.7.0 — 引入 JWT 多用户', d: 'bcryptjs + hono/jwt HS256。数据迁移：0 行 — user_id 早就在那儿' },
    { v: 'v0.0.7.3 — 登录页 v2 高保真', d: '基于参考 HTML 改造，霞鹜文楷 + 红影 brutal 风' },
  ];
  let y = 1.6;
  for (const it of items) {
    s.addShape(pres.ShapeType.ellipse, { x: 0.5, y: y + 0.1, w: 0.35, h: 0.35, fill: { color: C.accent }, line: { color: C.ink, width: 1.5 } });
    s.addText(it.v, { x: 1.0, y: y, w: 11.5, h: 0.5, fontSize: 18, bold: true, fontFace: FONT_CN, color: C.ink });
    s.addText(it.d, { x: 1.0, y: y + 0.55, w: 11.5, h: 0.5, fontSize: 14, fontFace: FONT_CN, color: C.ink2 });
    y += 1.4;
  }
  addBox(s, { x: 0.5, y: 5.9, w: 12.3, h: 1.0, bg: C.chipCream });
  s.addText('punchline：Schema 预留多花 0.5 小时，迁移省了 3 小时。"为可能的未来留 1 个字段"是值得的。', {
    x: 0.7, y: 6.0, w: 11.9, h: 0.8, fontSize: 15, fontFace: FONT_CN, color: C.ink, valign: 'middle',
  });
}

// ===== Slide 08: 视觉风格 =====
{
  const s = pres.addSlide({ masterName: 'BASE' });
  addTitle(s, '视觉风格 · 让备考工具不冷');
  // 左栏文字 (调色板/字体/阴影)
  addBox(s, { x: 0.5, y: 1.5, w: 7.4, h: 1.6, bg: C.paper });
  s.addText('调色板', { x: 0.7, y: 1.6, w: 7.0, h: 0.5, fontSize: 18, bold: true, fontFace: FONT_CN, color: C.ink });
  const colors = [C.paper, C.ink, C.accent, C.accent2, C.accent3, C.accent4];
  colors.forEach((cc, i) => {
    s.addShape(pres.ShapeType.roundRect, {
      x: 0.7 + i * 0.7, y: 2.15, w: 0.5, h: 0.5,
      fill: { color: cc }, line: { color: C.ink, width: 1 }, rectRadius: 0.05,
    });
  });
  s.addText('米纸 / 深棕 / 砖红 / 蜜黄 / 靛蓝 / 苔绿', { x: 0.7, y: 2.7, w: 7.0, h: 0.4, fontSize: 12, fontFace: FONT_CN, color: C.ink2 });

  addBox(s, { x: 0.5, y: 3.3, w: 7.4, h: 1.3, bg: 'FFFFFF' });
  s.addText('字体', { x: 0.7, y: 3.4, w: 7.0, h: 0.5, fontSize: 18, bold: true, fontFace: FONT_CN, color: C.ink });
  s.addText('霞鹜文楷 TC · LXGW WenKai', { x: 0.7, y: 3.9, w: 7.0, h: 0.4, fontSize: 22, fontFace: FONT_CN, color: C.ink });
  s.addText('中文优先选择，手写感强但可读性高', { x: 0.7, y: 4.3, w: 7.0, h: 0.3, fontSize: 11, fontFace: FONT_CN, color: C.ink2 });

  addBox(s, { x: 0.5, y: 4.8, w: 7.4, h: 1.4, bg: 'FFFFFF' });
  s.addText('阴影', { x: 0.7, y: 4.9, w: 7.0, h: 0.4, fontSize: 18, bold: true, fontFace: FONT_CN, color: C.ink });
  s.addText('brutal-red: 3px 4px 0 #c14d2e（主按钮）\nbrutal-sm: 2px 2px 0 #2a1f15（卡片）', {
    x: 0.7, y: 5.3, w: 7.0, h: 0.85, fontSize: 13, fontFace: FONT_CN, color: C.ink,
  });

  // 右栏 9:16 截图
  addPhoneScreenshot(s, 9.5, 1.8, '08-login.png', '登录页\n截 /login');
}

// ===== Slide 09: 踩坑 1 PDF =====
{
  const s = pres.addSlide({ masterName: 'BASE' });
  addTitle(s, 'PDF 同步阻塞 → 异步任务模型');
  // 角标
  s.addShape(pres.ShapeType.rect, { x: 11.5, y: 0.3, w: 1.3, h: 0.5, fill: { color: C.accent }, line: { color: C.ink, width: 1.5 } });
  s.addText('坑 #1', { x: 11.5, y: 0.3, w: 1.3, h: 0.5, fontSize: 14, bold: true, fontFace: FONT_CN, color: C.paper, align: 'center', valign: 'middle' });

  addBox(s, { x: 0.5, y: 1.5, w: 6.0, h: 2.0, bg: C.chipPink });
  s.addText('🚨 症状', { x: 0.7, y: 1.6, w: 5.6, h: 0.5, fontSize: 18, bold: true, fontFace: FONT_CN, color: C.ink });
  s.addText('导入 100+ 题真题，单次 LLM 输出超 8K token 被截断\nHTTP 网关 60s 超时直接断开', {
    x: 0.7, y: 2.1, w: 5.6, h: 1.3, fontSize: 14, fontFace: FONT_CN, color: C.ink,
  });

  addBox(s, { x: 0.5, y: 3.7, w: 6.0, h: 1.5, bg: C.chipCream });
  s.addText('🔬 根因', { x: 0.7, y: 3.8, w: 5.6, h: 0.5, fontSize: 18, bold: true, fontFace: FONT_CN, color: C.ink });
  s.addText('把所有题塞一次 LLM 调用太贪婪 — 既慢又脆', {
    x: 0.7, y: 4.3, w: 5.6, h: 0.8, fontSize: 14, fontFace: FONT_CN, color: C.ink,
  });

  addBox(s, { x: 6.8, y: 1.5, w: 6.0, h: 3.7, bg: C.chipGreen });
  s.addText('🛠️ 解法', { x: 7.0, y: 1.6, w: 5.6, h: 0.5, fontSize: 18, bold: true, fontFace: FONT_CN, color: C.ink });
  s.addText([
    { text: '• 按字符切 chunk（1200 字/批）\n' },
    { text: '• chunk 在 ' }, { text: '题号边界', options: { bold: true } }, { text: '对齐，无字符丢失\n' },
    { text: '• setImmediate 后台跑 worker\n' },
    { text: '• 每个 chunk 做完就写库 → 进度可见\n' },
    { text: '• 失败时已识别的 candidates 保留\n' },
    { text: '• 1.5s 轮询，前端展示批次进度' },
  ], { x: 7.0, y: 2.1, w: 5.6, h: 3.0, fontSize: 13, fontFace: FONT_CN, color: C.ink });
}

// ===== Slide 10: 踩坑 2 重启打断 =====
{
  const s = pres.addSlide({ masterName: 'BASE' });
  addTitle(s, '服务重启打断 worker → 断点续传');
  s.addShape(pres.ShapeType.rect, { x: 11.5, y: 0.3, w: 1.3, h: 0.5, fill: { color: C.accent }, line: { color: C.ink, width: 1.5 } });
  s.addText('坑 #2', { x: 11.5, y: 0.3, w: 1.3, h: 0.5, fontSize: 14, bold: true, fontFace: FONT_CN, color: C.paper, align: 'center', valign: 'middle' });

  addBox(s, { x: 0.5, y: 1.5, w: 6.0, h: 3.7, bg: C.chipPink });
  s.addText('🚨 真实场景', { x: 0.7, y: 1.6, w: 5.6, h: 0.5, fontSize: 18, bold: true, fontFace: FONT_CN, color: C.ink });
  s.addText([
    { text: '用户上传 PDF 跑到 chunk 14/41。\n' },
    { text: '我同时部署代码 → systemd restart。\n' },
    { text: 'worker 进程被 SIGTERM 杀掉。\n' },
    { text: 'selfHealOnBoot 把 running job 标 failed("server_restart")。\n\n' },
    { text: '用户看到："AI 调用失败"', options: { color: C.accent, bold: true } },
  ], { x: 0.7, y: 2.1, w: 5.6, h: 3.0, fontSize: 13, fontFace: FONT_CN, color: C.ink });

  addBox(s, { x: 6.8, y: 1.5, w: 6.0, h: 2.4, bg: C.chipGreen });
  s.addText('🛠️ 修复（v0.0.8.2）', { x: 7.0, y: 1.6, w: 5.6, h: 0.5, fontSize: 18, bold: true, fontFace: FONT_CN, color: C.ink });
  s.addText([
    { text: '• 把 chunks 数组写进 db (jsonb)\n' },
    { text: '• worker 从 doneChunks 读出起点\n' },
    { text: '• candidates 持久化累积\n' },
    { text: '• selfHealOnBoot 改成 setImmediate 续跑，不再标 failed' },
  ], { x: 7.0, y: 2.1, w: 5.6, h: 1.7, fontSize: 13, fontFace: FONT_CN, color: C.ink });

  addBox(s, { x: 6.8, y: 4.1, w: 6.0, h: 1.1, bg: C.chipCream });
  s.addText('启示', { x: 7.0, y: 4.15, w: 5.6, h: 0.4, fontSize: 14, bold: true, fontFace: FONT_CN, color: C.ink });
  s.addText('进程内 in-memory map 是定时炸弹。所有 worker 状态必须能从 db 单方面恢复。', {
    x: 7.0, y: 4.55, w: 5.6, h: 0.55, fontSize: 12, fontFace: FONT_CN, color: C.ink,
  });
}

// ===== Slide 11: 踩坑 3 章节正则 =====
{
  const s = pres.addSlide({ masterName: 'BASE' });
  addTitle(s, '章节识别 147 个 · 真实是 7 个');
  s.addShape(pres.ShapeType.rect, { x: 11.5, y: 0.3, w: 1.3, h: 0.5, fill: { color: C.accent }, line: { color: C.ink, width: 1.5 } });
  s.addText('坑 #3', { x: 11.5, y: 0.3, w: 1.3, h: 0.5, fontSize: 14, bold: true, fontFace: FONT_CN, color: C.paper, align: 'center', valign: 'middle' });

  addBox(s, { x: 0.5, y: 1.5, w: 6.0, h: 1.5, bg: C.chipPink });
  s.addText('🚨 用户反馈', { x: 0.7, y: 1.6, w: 5.6, h: 0.5, fontSize: 18, bold: true, fontFace: FONT_CN, color: C.ink });
  s.addText('"我上传一本教材，怎么识别出来 147 章？"', { x: 0.7, y: 2.1, w: 5.6, h: 0.8, fontSize: 14, fontFace: FONT_CN, color: C.ink });

  addBox(s, { x: 0.5, y: 3.2, w: 6.0, h: 1.9, bg: C.chipCream });
  s.addText('🔬 根因', { x: 0.7, y: 3.3, w: 5.6, h: 0.5, fontSize: 18, bold: true, fontFace: FONT_CN, color: C.ink });
  s.addText('贪婪正则 [^\\n]{0,80} 把"第 N 章"后面 80 字的正文都吞掉，每个 chunk 里都"匹配"出一个新章节。', {
    x: 0.7, y: 3.8, w: 5.6, h: 1.2, fontSize: 13, fontFace: FONT_CN, color: C.ink,
  });

  addBox(s, { x: 6.8, y: 1.5, w: 6.0, h: 2.6, bg: C.chipGreen });
  s.addText('🛠️ 解法', { x: 7.0, y: 1.6, w: 5.6, h: 0.5, fontSize: 18, bold: true, fontFace: FONT_CN, color: C.ink });
  addBox(s, { x: 7.0, y: 2.1, w: 5.6, h: 1.9, bg: '1F1410', borderColor: C.ink, shadow: false });
  s.addText([
    { text: 'function ', options: { color: 'FF9A6C' } },
    { text: 'cleanChapterTitle(raw) {\n', options: { color: 'F5D97A' } },
    { text: '  // 只保留 "第 N 章" + ≤20 中文字符\n', options: { color: '8A7560', italic: true } },
    { text: '  const m = raw.match(/第[一二三...]+章[^\\n]{0,20}/);\n', options: { color: 'F5D97A' } },
    { text: '  return m?.[0]?.trim();\n}', options: { color: 'F5D97A' } },
  ], { x: 7.1, y: 2.15, w: 5.4, h: 1.8, fontSize: 11, fontFace: 'Menlo' });

  // 147 → 7 对比
  addBox(s, { x: 6.8, y: 4.2, w: 6.0, h: 1.0, bg: 'FFFFFF' });
  s.addText('147', { x: 7.0, y: 4.25, w: 1.5, h: 0.7, fontSize: 36, bold: true, fontFace: FONT_CN, color: C.accent, align: 'center' });
  s.addText('之前', { x: 7.0, y: 4.85, w: 1.5, h: 0.3, fontSize: 10, fontFace: FONT_CN, color: C.ink2, align: 'center' });
  s.addText('→', { x: 8.6, y: 4.4, w: 1.0, h: 0.5, fontSize: 24, fontFace: FONT_CN, color: C.accent, align: 'center', valign: 'middle' });
  s.addText('7', { x: 9.8, y: 4.25, w: 1.5, h: 0.7, fontSize: 36, bold: true, fontFace: FONT_CN, color: C.accent4, align: 'center' });
  s.addText('之后', { x: 9.8, y: 4.85, w: 1.5, h: 0.3, fontSize: 10, fontFace: FONT_CN, color: C.ink2, align: 'center' });
}

// ===== Slide 12: 踩坑 4 登录跳转 =====
{
  const s = pres.addSlide({ masterName: 'BASE' });
  addTitle(s, '登录后页面不跳转 · 异步 race');
  s.addShape(pres.ShapeType.rect, { x: 11.5, y: 0.3, w: 1.3, h: 0.5, fill: { color: C.accent }, line: { color: C.ink, width: 1.5 } });
  s.addText('坑 #4', { x: 11.5, y: 0.3, w: 1.3, h: 0.5, fontSize: 14, bold: true, fontFace: FONT_CN, color: C.paper, align: 'center', valign: 'middle' });

  addBox(s, { x: 0.5, y: 1.5, w: 6.0, h: 1.5, bg: C.chipPink });
  s.addText('🚨 症状', { x: 0.7, y: 1.6, w: 5.6, h: 0.5, fontSize: 18, bold: true, fontFace: FONT_CN, color: C.ink });
  s.addText('输入完账号密码点登录，页面不动。手动刷新一下才进去。', { x: 0.7, y: 2.1, w: 5.6, h: 0.8, fontSize: 14, fontFace: FONT_CN, color: C.ink });

  addBox(s, { x: 0.5, y: 3.2, w: 6.0, h: 2.0, bg: C.chipCream });
  s.addText('🔬 根因', { x: 0.7, y: 3.3, w: 5.6, h: 0.5, fontSize: 18, bold: true, fontFace: FONT_CN, color: C.ink });
  s.addText('setToken → navigate("/") → RequireAuth 看到 user 还是 null → 弹回登录页。token 已经写了，但 AuthContext 的 user 还没 refetch 完。', {
    x: 0.7, y: 3.8, w: 5.6, h: 1.3, fontSize: 13, fontFace: FONT_CN, color: C.ink,
  });

  addBox(s, { x: 6.8, y: 1.5, w: 6.0, h: 2.4, bg: C.chipGreen });
  s.addText('🛠️ 解法', { x: 7.0, y: 1.6, w: 5.6, h: 0.5, fontSize: 18, bold: true, fontFace: FONT_CN, color: C.ink });
  addBox(s, { x: 7.0, y: 2.1, w: 5.6, h: 1.7, bg: '1F1410', borderColor: C.ink, shadow: false });
  s.addText([
    { text: 'async function ', options: { color: 'FF9A6C' } },
    { text: 'login() {\n', options: { color: 'F5D97A' } },
    { text: '  setToken(jwt);\n', options: { color: 'F5D97A' } },
    { text: '  await refresh();  ', options: { color: 'F5D97A' } },
    { text: '// 等 me() 拉完 user\n', options: { color: '8A7560', italic: true } },
    { text: '  navigate("/");  ', options: { color: 'F5D97A' } },
    { text: '// 这时 RequireAuth 才不会弹\n}', options: { color: '8A7560', italic: true } },
  ], { x: 7.1, y: 2.15, w: 5.4, h: 1.6, fontSize: 11, fontFace: 'Menlo' });

  addBox(s, { x: 6.8, y: 4.1, w: 6.0, h: 1.2, bg: C.chipCream });
  s.addText('更深的启示', { x: 7.0, y: 4.15, w: 5.6, h: 0.4, fontSize: 14, bold: true, fontFace: FONT_CN, color: C.ink });
  s.addText('"状态写了" ≠ "状态生效"。所有同步跳转前 await 异步 prerequisite。', {
    x: 7.0, y: 4.55, w: 5.6, h: 0.7, fontSize: 12, fontFace: FONT_CN, color: C.ink,
  });
}

// ===== Slide 13: AI Prompt 设计 =====
{
  const s = pres.addSlide({ masterName: 'BASE' });
  addTitle(s, 'AI Prompt 设计 · 状态注入 + 行为约束');
  s.addText('让 AI 拿真实数据说话，不靠瞎猜', { x: 0.5, y: 1.3, w: 12.3, h: 0.4, fontSize: 14, fontFace: FONT_CN, color: C.ink2 });

  addBox(s, { x: 0.5, y: 1.8, w: 12.3, h: 4.2, bg: '1F1410', borderColor: C.ink, shadow: false });
  s.addText([
    { text: 'function ', options: { color: 'FF9A6C' } },
    { text: 'buildStudySystemPrompt(profile, stats) {\n', options: { color: 'F5D97A' } },
    { text: '  return [\n', options: { color: 'F5D97A' } },
    { text: '    `你是 ${profile.examName} 备考的 AI 陪学助手。`,\n', options: { color: 'AED7A5' } },
    { text: '    `今天是 ${cnDate}。`,\n', options: { color: 'AED7A5' } },
    { text: '    `下面是用户最新的学习状态：`,\n', options: { color: 'AED7A5' } },
    { text: '    `- 距离考试：${stats.daysUntilExam} 天`,\n', options: { color: 'AED7A5' } },
    { text: '    `- 题库总数：${stats.totalQuestions} · 错题本：${stats.wrongbookCount}`,\n', options: { color: 'AED7A5' } },
    { text: '    `- 上次答题：${stats.daysSinceLastAttempt} 天前`,\n', options: { color: 'AED7A5' } },
    { text: '    `原则：`,\n', options: { color: 'AED7A5' } },
    { text: '    `- 控制 200 字内`,\n', options: { color: 'AED7A5' } },
    { text: '    `- 给具体可执行建议 ("今天先刷错题本 10 道")`,\n', options: { color: 'AED7A5' } },
    { text: '    `- 错题本 > 20 道 → 优先清积压`,\n', options: { color: 'AED7A5' } },
    { text: '    `- 距考 < 30 天 → 冲刺策略；> 60 天 → 节奏稳定`,\n', options: { color: 'AED7A5' } },
    { text: '  ].join(', options: { color: 'F5D97A' } },
    { text: "'\\n'", options: { color: 'AED7A5' } },
    { text: ');\n}', options: { color: 'F5D97A' } },
  ], { x: 0.7, y: 1.95, w: 11.9, h: 4.0, fontSize: 11, fontFace: 'Menlo' });

  s.addText('"对话即数据看板" — 这是我们这次的关键发明', {
    x: 0.5, y: 6.2, w: 12.3, h: 0.5, fontSize: 18, bold: true, fontFace: FONT_CN, color: C.accent, align: 'center',
  });
}

// ===== Slide 14: 数据规模 =====
{
  const s = pres.addSlide({ masterName: 'BASE' });
  s.addText('4 天的产出', { x: 0.5, y: 0.5, w: 12.3, h: 0.8, fontSize: 32, bold: true, fontFace: FONT_CN, color: C.ink, align: 'center' });

  const row1 = [
    { num: '4', label: '天' },
    { num: '9', label: '数据表' },
    { num: '94', label: '集成测试' },
    { num: '30', label: '版本号' },
  ];
  row1.forEach((it, i) => {
    const x = 0.5 + i * 3.1;
    addBox(s, { x, y: 2.0, w: 2.9, h: 1.6, bg: 'FFFFFF' });
    s.addText(it.num, { x, y: 2.15, w: 2.9, h: 1.0, fontSize: 56, bold: true, fontFace: FONT_CN, color: C.accent, align: 'center' });
    s.addText(it.label, { x, y: 3.15, w: 2.9, h: 0.4, fontSize: 13, fontFace: FONT_CN, color: C.ink2, align: 'center' });
  });

  const row2 = [
    { num: '4', label: '加题方式', bg: C.chipBlue },
    { num: '4', label: 'LLM 模型', bg: C.chipGreen },
    { num: '1', label: '人', bg: C.chipPink },
    { num: '∞', label: '咖啡', bg: C.chipCream },
  ];
  row2.forEach((it, i) => {
    const x = 0.5 + i * 3.1;
    addBox(s, { x, y: 4.0, w: 2.9, h: 1.6, bg: it.bg });
    s.addText(it.num, { x, y: 4.15, w: 2.9, h: 1.0, fontSize: 56, bold: true, fontFace: FONT_CN, color: C.accent, align: 'center' });
    s.addText(it.label, { x, y: 5.15, w: 2.9, h: 0.4, fontSize: 13, fontFace: FONT_CN, color: C.ink2, align: 'center' });
  });

  s.addText('接下来 — 让我们看看用户能拿这玩意儿干什么', {
    x: 0.5, y: 6.2, w: 12.3, h: 0.5, fontSize: 14, fontFace: FONT_CN, color: C.ink2, align: 'center', italic: true,
  });
}

// ===== Slide 15: Part 2 封面 =====
{
  const s = pres.addSlide({ masterName: 'BASE' });
  addBox(s, { x: 5.5, y: 1.5, w: 2.3, h: 0.55, bg: C.accent, borderColor: C.ink, borderWidth: 2 });
  s.addText('PART 2', { x: 5.5, y: 1.5, w: 2.3, h: 0.55, fontSize: 16, bold: true, fontFace: FONT_CN, color: C.paper, align: 'center', valign: 'middle' });

  s.addText('给一个人备考的你', { x: 0.5, y: 2.5, w: 12.3, h: 1.2, fontSize: 60, bold: true, fontFace: FONT_CN, color: C.ink, align: 'center' });
  s.addText('把资料喂进来 · 系统帮你刷、催、复盘\n最后拿结果', {
    x: 0.5, y: 4.0, w: 12.3, h: 1.5, fontSize: 22, fontFace: FONT_CN, color: C.ink2, align: 'center',
  });
}

// ===== Slide 16: 谁该用 =====
{
  const s = pres.addSlide({ masterName: 'BASE' });
  addTitle(s, '谁该用？');
  s.addText('你只要符合一个就行 ↓', { x: 0.5, y: 1.3, w: 12.3, h: 0.4, fontSize: 14, fontFace: FONT_CN, color: C.ink2 });

  const items = [
    { x: 0.5, bg: C.chipBlue, title: '📚 有真题', desc: '手里囤了一堆历年真题 PDF / 拍照 / 自己整理的题目，但没用起来' },
    { x: 4.7, bg: C.chipGreen, title: '📖 有教材', desc: '教材厚厚一本，问题不知道去哪页找答案' },
    { x: 8.9, bg: C.chipPink, title: '🎯 想靠自己', desc: '不想报班 / 报班贵 / 想自学但缺一个不掉链子的搭子' },
  ];
  for (const it of items) {
    addBox(s, { x: it.x, y: 2.0, w: 3.9, h: 3.0, bg: it.bg });
    s.addText(it.title, { x: it.x + 0.2, y: 2.2, w: 3.5, h: 0.6, fontSize: 22, bold: true, fontFace: FONT_CN, color: C.ink });
    s.addText(it.desc, { x: it.x + 0.2, y: 2.9, w: 3.5, h: 2.0, fontSize: 14, fontFace: FONT_CN, color: C.ink });
  }

  addBox(s, { x: 0.5, y: 5.4, w: 12.3, h: 1.2, bg: C.chipCream });
  s.addText('NPDP · CPA · 法考 · PMP · 软考 · 考研 · 公考 — 任何选择题为主的考试都能用', {
    x: 0.7, y: 5.4, w: 11.9, h: 1.2, fontSize: 18, bold: true, fontFace: FONT_CN, color: C.ink, align: 'center', valign: 'middle',
  });
}

// ===== Slide 17: 核心闭环 =====
{
  const s = pres.addSlide({ masterName: 'BASE' });
  addTitle(s, '核心闭环 · 一个人也能跑完');
  const steps = [
    { x: 0.5, bg: C.chipBlue, icon: '📋', title: '建档', desc: '考试名 + 日期' },
    { x: 3.6, bg: C.chipGreen, icon: '📚', title: '加题', desc: '4 种入口' },
    { x: 6.7, bg: C.chipPink, icon: '✏️', title: '刷题', desc: '错题自动收' },
    { x: 9.8, bg: C.chipCream, icon: '🤖', title: '复盘', desc: 'AI 陪聊' },
  ];
  for (let i = 0; i < steps.length; i++) {
    const it = steps[i];
    addBox(s, { x: it.x, y: 2.5, w: 3.0, h: 2.4, bg: it.bg });
    s.addText(it.icon, { x: it.x, y: 2.7, w: 3.0, h: 0.8, fontSize: 48, align: 'center' });
    s.addText(it.title, { x: it.x, y: 3.6, w: 3.0, h: 0.5, fontSize: 22, bold: true, fontFace: FONT_CN, color: C.ink, align: 'center' });
    s.addText(it.desc, { x: it.x, y: 4.1, w: 3.0, h: 0.4, fontSize: 12, fontFace: FONT_CN, color: C.ink2, align: 'center' });
    if (i < steps.length - 1) {
      s.addText('→', { x: it.x + 2.9, y: 3.0, w: 0.7, h: 1.4, fontSize: 32, color: C.accent, align: 'center', valign: 'middle' });
    }
  }
  s.addText('AI 自始至终陪着 — 拍照识题、PDF 整理、教材引用、错题分析', {
    x: 0.5, y: 5.8, w: 12.3, h: 0.5, fontSize: 18, bold: true, fontFace: FONT_CN, color: C.accent, align: 'center',
  });
}

// ===== Slide 18: 4 种加题 =====
{
  const s = pres.addSlide({ masterName: 'BASE' });
  addTitle(s, '4 种加题方式');
  // 左侧 2x2 卡片
  const cards = [
    { x: 0.5, y: 1.6, bg: C.chipPink, icon: '📷', title: '拍照识题', desc: '真题书直接拍 · AI 识别 · 编辑确认' },
    { x: 5.0, y: 1.6, bg: C.chipBlue, icon: '✍️', title: '手输', desc: '想自己整理就一道一道敲' },
    { x: 0.5, y: 3.9, bg: C.chipGreen, icon: '📁', title: 'PDF 导入', desc: '真题 PDF 一次传 · AI 切批后台解析' },
    { x: 5.0, y: 3.9, bg: C.chipCream, icon: '🎲', title: 'AI 出题', desc: '给知识点 · AI 出新题' },
  ];
  for (const c of cards) {
    addBox(s, { x: c.x, y: c.y, w: 4.0, h: 2.0, bg: c.bg });
    s.addText(c.icon, { x: c.x, y: c.y + 0.15, w: 4.0, h: 0.7, fontSize: 32, align: 'center' });
    s.addText(c.title, { x: c.x, y: c.y + 0.9, w: 4.0, h: 0.5, fontSize: 18, bold: true, fontFace: FONT_CN, color: C.ink, align: 'center' });
    s.addText(c.desc, { x: c.x + 0.2, y: c.y + 1.4, w: 3.6, h: 0.5, fontSize: 12, fontFace: FONT_CN, color: C.ink2, align: 'center' });
  }
  // 右侧手机截图
  addPhoneScreenshot(s, 10.0, 1.7, '18-add-menu.png', '加题菜单');
}

// ===== Slide 19: 拍照识题特写 =====
{
  const s = pres.addSlide({ masterName: 'BASE' });
  addTitle(s, '拍照识题 · 真题书秒变题库');
  // 3 张手机截图横排
  const phones = [
    { x: 1.2, img: '19-ocr-1.png', caption: '1️⃣ 拍照', sub: '手机直接调用相机' },
    { x: 5.6, img: '19-ocr-2.png', caption: '2️⃣ AI 识别', sub: 'qwen-vl-max 看图出 JSON' },
    { x: 10.0, img: '19-ocr-3.png', caption: '3️⃣ 编辑确认', sub: '没识别出答案能让 AI 解' },
  ];
  for (const p of phones) {
    addPhoneScreenshot(s, p.x, 1.4, p.img, p.caption);
    s.addText(p.caption, { x: p.x - 0.5, y: 5.3, w: 3.1, h: 0.4, fontSize: 14, bold: true, fontFace: FONT_CN, color: C.ink, align: 'center' });
    s.addText(p.sub, { x: p.x - 0.5, y: 5.7, w: 3.1, h: 0.4, fontSize: 11, fontFace: FONT_CN, color: C.ink2, align: 'center' });
  }
}

// ===== Slide 20: PDF 异步 =====
{
  const s = pres.addSlide({ masterName: 'BASE' });
  addTitle(s, 'PDF 异步导入 · 一次传完不丢');
  // 左侧三条
  const lines = [
    { y: 1.5, bg: C.chipGreen, title: '✅ 100+ 题一次传完', desc: '按 chunk 分批解析，进度条实时更新' },
    { y: 3.1, bg: C.chipBlue, title: '✅ 离开页面不丢', desc: '任务在后台跑，关浏览器回来还能看进度' },
    { y: 4.7, bg: C.chipPink, title: '✅ 服务重启自动续', desc: 'v0.0.8.2 起 — 进程崩了也能从断点续传' },
  ];
  for (const l of lines) {
    addBox(s, { x: 0.5, y: l.y, w: 9.0, h: 1.4, bg: l.bg });
    s.addText(l.title, { x: 0.7, y: l.y + 0.15, w: 8.5, h: 0.5, fontSize: 18, bold: true, fontFace: FONT_CN, color: C.ink });
    s.addText(l.desc, { x: 0.7, y: l.y + 0.7, w: 8.5, h: 0.6, fontSize: 13, fontFace: FONT_CN, color: C.ink });
  }
  addPhoneScreenshot(s, 10.0, 1.7, '20-pdf.png', 'PDF 进度页');
}

// ===== Slide 21: 题库 + 查重 =====
{
  const s = pres.addSlide({ masterName: 'BASE' });
  addTitle(s, '题库管理 · 查重 · 错题本');
  const lines = [
    { y: 1.5, bg: C.chipPink, title: '🔍 查重提醒', desc: '每道新题算 1024 维 embedding · 余弦相似度 ≥0.85 弹出新旧对比' },
    { y: 3.1, bg: C.chipGreen, title: '❌ 错题本自动归档', desc: '答错自动进 · 连续答对 3 次自动移除 · 也支持手动标"未掌握"' },
    { y: 4.7, bg: C.chipBlue, title: '🛠️ 批量管理', desc: '多选 · 批量删 · 一键清空 · 题目克隆' },
  ];
  for (const l of lines) {
    addBox(s, { x: 0.5, y: l.y, w: 9.0, h: 1.4, bg: l.bg });
    s.addText(l.title, { x: 0.7, y: l.y + 0.15, w: 8.5, h: 0.5, fontSize: 18, bold: true, fontFace: FONT_CN, color: C.ink });
    s.addText(l.desc, { x: 0.7, y: l.y + 0.7, w: 8.5, h: 0.6, fontSize: 13, fontFace: FONT_CN, color: C.ink });
  }
  addPhoneScreenshot(s, 10.0, 1.7, '21-library.png', '题库管理');
}

// ===== Slide 22: AI 陪学 =====
{
  const s = pres.addSlide({ masterName: 'BASE' });
  addTitle(s, 'AI 陪学 · 知道你的真实状态');
  s.addText('不是泛泛而谈，是看着真实数据回答', { x: 0.5, y: 1.4, w: 9.0, h: 0.4, fontSize: 16, fontFace: FONT_CN, color: C.ink2 });
  s.addText([
    { text: '"你错题本有 28 道积压了"\n' },
    { text: '"距考还剩 23 天，建议先冲错题"\n' },
    { text: '"上次刷题是 3 天前，今天先来 10 道暖暖"\n' },
    { text: '"已经连续 5 天答对率 80%+ 了，节奏不错"' },
  ], { x: 0.5, y: 1.9, w: 9.0, h: 2.0, fontSize: 14, fontFace: FONT_CN, color: C.ink, paraSpaceAfter: 4, bullet: { type: 'bullet' } });

  addBox(s, { x: 0.5, y: 4.2, w: 9.0, h: 2.4, bg: C.chipCream });
  s.addText('核心 prompt', { x: 0.7, y: 4.3, w: 8.6, h: 0.5, fontSize: 16, bold: true, fontFace: FONT_CN, color: C.ink });
  s.addText('把真实学习状态注入 system 提示，给 AI 5 条硬约束（字数 / 决策树 / 口吻），不让它说"加油哦"这种废话。\n初期默认"严格教练"风格：不陪聊离题、不顺着拖延、表扬具体不空。', {
    x: 0.7, y: 4.8, w: 8.6, h: 1.7, fontSize: 13, fontFace: FONT_CN, color: C.ink,
  });

  addPhoneScreenshot(s, 10.0, 1.7, '22-coach.png', 'AI 陪学对话');
}

// ===== Slide 23: 教材 RAG =====
{
  const s = pres.addSlide({ masterName: 'BASE' });
  addTitle(s, '教材 RAG · 答案带页码');
  const lines = [
    { y: 1.5, bg: C.chipCream, title: '📤 上传 PDF 教材', desc: '≤50 MB · 一档案多本 · 异步解析 · 按章节切片 · 批量 embedding' },
    { y: 3.1, bg: C.chipBlue, title: '🎯 AI 回答自动引用', desc: '问问题 / 出新题 / 错题分析 全程带「第 X 章 · 第 Y 页」' },
    { y: 4.7, bg: C.chipGreen, title: '🧠 不止找答案，是找出处', desc: '所有引用都来自你上传的教材，可追溯。不让 AI 编概念。' },
  ];
  for (const l of lines) {
    addBox(s, { x: 0.5, y: l.y, w: 9.0, h: 1.4, bg: l.bg });
    s.addText(l.title, { x: 0.7, y: l.y + 0.15, w: 8.5, h: 0.5, fontSize: 18, bold: true, fontFace: FONT_CN, color: C.ink });
    s.addText(l.desc, { x: 0.7, y: l.y + 0.7, w: 8.5, h: 0.6, fontSize: 13, fontFace: FONT_CN, color: C.ink });
  }
  addPhoneScreenshot(s, 10.0, 1.7, '23-rag.png', '教材引用');
}

// ===== Slide 24: 试用 =====
{
  const s = pres.addSlide({ masterName: 'BASE' });
  s.addText('现在就能试', { x: 0.5, y: 0.5, w: 12.3, h: 0.8, fontSize: 32, bold: true, fontFace: FONT_CN, color: C.ink, align: 'center' });

  addBox(s, { x: 0.5, y: 2.0, w: 7.5, h: 1.7, bg: 'FFFFFF' });
  s.addText('🌐 网址', { x: 0.7, y: 2.15, w: 7.0, h: 0.4, fontSize: 18, bold: true, fontFace: FONT_CN, color: C.ink });
  s.addText('http://82.156.139.33:3001', { x: 0.7, y: 2.6, w: 7.0, h: 0.5, fontSize: 20, fontFace: 'Menlo', color: C.accent });
  s.addText('手机浏览器直接打开（电脑也行）', { x: 0.7, y: 3.15, w: 7.0, h: 0.4, fontSize: 12, fontFace: FONT_CN, color: C.ink2 });

  addBox(s, { x: 0.5, y: 4.0, w: 7.5, h: 1.8, bg: C.chipCream });
  s.addText('🔑 试用账号', { x: 0.7, y: 4.15, w: 7.0, h: 0.4, fontSize: 18, bold: true, fontFace: FONT_CN, color: C.ink });
  s.addText('账号：lornax@local', { x: 0.7, y: 4.65, w: 7.0, h: 0.4, fontSize: 16, fontFace: 'Menlo', color: C.ink });
  s.addText('密码：123123', { x: 0.7, y: 5.05, w: 7.0, h: 0.4, fontSize: 16, fontFace: 'Menlo', color: C.ink });
  s.addText('或者点"注册"自己开一个', { x: 0.7, y: 5.45, w: 7.0, h: 0.3, fontSize: 12, fontFace: FONT_CN, color: C.ink2 });

  // 二维码槽
  addImage(s, 9.0, 2.0, 3.8, 3.8, '24-qrcode.png', '二维码占位\n用 qrencode 或 cli.im 生成');

  s.addText('⚠️ 当前 HTTP 明文，仅作 demo 用；下一版上 HTTPS', {
    x: 0.5, y: 6.2, w: 12.3, h: 0.4, fontSize: 12, fontFace: FONT_CN, color: C.ink3, align: 'center', italic: true,
  });
}

// ===== Slide 25: 下一步 =====
{
  const s = pres.addSlide({ masterName: 'BASE' });
  addTitle(s, '下一步 · 三阶段规划');
  const stages = [
    { x: 0.5, bg: C.chipGreen, t: 'Stage 1 · 现在 ✅', d: 'MVP 跑通：建档 + 4 种加题 + 刷题闭环 + AI 陪学 + 教材 RAG + 多用户\n7 条 P1 验收全部达成' },
    { x: 4.7, bg: C.chipCream, t: 'Stage 2 · 下期', d: '• 数据备份 + HTTPS\n• 学习时长/题数 进度条\n• 本周节奏热力图\n• 教材也支持断点续传\n• 教练风格可选' },
    { x: 8.9, bg: C.chipBlue, t: 'Stage 3 · 远期', d: '• 交易市场 + 社交广场\n• 专家级 AI 教练\n• NPDP / CPA / 法考 / 考研\n• 移动端 Taro 小程序' },
  ];
  for (const st of stages) {
    addBox(s, { x: st.x, y: 1.6, w: 3.9, h: 4.0, bg: st.bg });
    s.addText(st.t, { x: st.x + 0.2, y: 1.75, w: 3.5, h: 0.5, fontSize: 18, bold: true, fontFace: FONT_CN, color: C.ink });
    s.addText(st.d, { x: st.x + 0.2, y: 2.4, w: 3.5, h: 3.0, fontSize: 13, fontFace: FONT_CN, color: C.ink, paraSpaceAfter: 4 });
  }
  addBox(s, { x: 0.5, y: 5.9, w: 12.3, h: 0.9, bg: C.accent });
  s.addText('"专家级 AI 教练"是远期重点 — 不止做 prompt，做考试垂直化的真知识储备', {
    x: 0.7, y: 5.9, w: 11.9, h: 0.9, fontSize: 16, bold: true, fontFace: FONT_CN, color: C.paper, align: 'center', valign: 'middle',
  });
}

// ===== Slide 26: 致谢 =====
{
  const s = pres.addSlide({ masterName: 'BASE' });
  s.addText('一起来 ☕️', { x: 0.5, y: 1.8, w: 12.3, h: 1.3, fontSize: 72, bold: true, fontFace: FONT_CN, color: C.ink, align: 'center' });
  s.addText([
    { text: '你的反馈是 ', options: {} },
    { text: 'v0.0.8.3', options: { color: C.accent, fontFace: 'Menlo' } },
    { text: ' 的需求。\n', options: {} },
    { text: '用一阵子，把卡到你的地方告诉我，我们一起把它磨成你顺手的工具。', options: {} },
  ], { x: 0.5, y: 3.3, w: 12.3, h: 1.5, fontSize: 22, fontFace: FONT_CN, color: C.ink2, align: 'center' });

  // tags
  const tags = [
    { x: 3.5, bg: C.chipBlue, text: '微信群 / 反馈渠道' },
    { x: 6.0, bg: C.chipGreen, text: 'GitHub: Lornax/learn-or-die-lite' },
    { x: 9.5, bg: C.chipPink, text: '2026-05' },
  ];
  for (const t of tags) {
    addBox(s, { x: t.x, y: 5.3, w: 2.3, h: 0.5, bg: t.bg, borderWidth: 1, shadow: false });
    s.addText(t.text, { x: t.x, y: 5.3, w: 2.3, h: 0.5, fontSize: 11, fontFace: FONT_CN, color: C.ink, align: 'center', valign: 'middle' });
  }

  s.addText('Made with ☕ by Lornax · 备考路上不孤单', {
    x: 0.5, y: 6.5, w: 12.3, h: 0.4, fontSize: 12, fontFace: FONT_CN, color: C.ink3, align: 'center',
  });
}

// 保存
const outPath = join(__dirname, 'deck.pptx');
await pres.writeFile({ fileName: outPath });
console.log(`✓ 生成完成: ${outPath}`);
console.log(`  共 26 张 slide, 16:9 widescreen`);
console.log(`  把截图按 README 文件名放进 images/ 后再跑一次即可更新`);
