import type { Language } from '../i18n';

/**
 * 产品迭代公告. 数据写死前端 (更新频率低不值得 db),
 * 已读状态用 localStorage 标记 (单设备粒度可接受).
 * 顺序: 最新在前.
 */

export type Announcement = {
  id: string;
  date: string;
  title: string;
  body: string;
  titleEn: string;
  bodyEn: string;
};

export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'v0.0.10.7-2026-05-29',
    date: '2026-05-29',
    title: '🎉 刷题宝 v0.0.10.7 小更新',
    body: `感谢各位反馈！这一轮主要修了你们提到的 2 个体验问题：

📚 教材识别更稳了
• 之前传教材失败说「额度用完」的，换了家免费的向量服务，再也不排队啦
• 章节名被切成「第三章 数」这种半截字，已修复
• 扫描版图片 PDF 提示更清楚了（虽然作者大大暂时还没钱开通批量识图 😅）

📅 日历选日期更顺手
• 月份切换旁边加了 « » 双箭头，一键跳整年（不用按 12 下了）
• 加了「📍 回到今天」按钮，再远也能一键回来

继续期待你们的反馈！右上角 💬 一键告诉我 🙏

— 作者大大：在瓶`,
    titleEn: '🎉 Quiz Buddy v0.0.10.7 Update',
    bodyEn: `Thanks for all the feedback! This update mainly fixes two experience issues you reported:

📚 Textbook recognition is more stable
• If textbook uploads previously failed with a "quota exhausted" message, we switched to a free embedding service, so it no longer queues there
• Chapter titles being cut off are fixed
• Scanned image PDFs now show a clearer message. Full backend OCR is not available yet.

📅 The date picker is easier to use
• Added « » next to month switching, so you can jump by year in one tap
• Added "📍 Today", so you can always return in one tap

Keep the feedback coming. Use 💬 in the top right.

- Author: Zaiping`,
  },
];

export function getAnnouncementCopy(a: Announcement, language: Language): Pick<Announcement, 'title' | 'body'> {
  if (language === 'en') {
    return { title: a.titleEn, body: a.bodyEn };
  }
  return { title: a.title, body: a.body };
}

const STORAGE_KEY = 'lrd_read_announcements';

export function getReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

export function markRead(id: string): void {
  const ids = Array.from(getReadIds());
  if (!ids.includes(id)) ids.push(id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function markAllRead(): void {
  const allIds = ANNOUNCEMENTS.map((a) => a.id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allIds));
}

export function getUnreadCount(): number {
  const read = getReadIds();
  return ANNOUNCEMENTS.filter((a) => !read.has(a.id)).length;
}

export function getLatestUnread(): Announcement | null {
  const read = getReadIds();
  for (const a of ANNOUNCEMENTS) {
    if (!read.has(a.id)) return a;
  }
  return null;
}
