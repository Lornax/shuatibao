import { useState } from 'react';
import {
  ANNOUNCEMENTS,
  getAnnouncementCopy,
  getReadIds,
  getUnreadCount,
  markAllRead,
} from '../utils/announcements';
import { useLanguage } from '../i18n';

/**
 * 铃铛入口 (放 Layout 顶栏 💬 反馈旁边).
 * - 未读数 badge 显示在右上
 * - 点击弹模态展示所有公告 (最新在上)
 * - 关闭模态时把所有公告标已读
 */
export function AnnouncementBell() {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(getUnreadCount());
  const [readIds, setReadIds] = useState(getReadIds());

  function openModal() {
    setOpen(true);
  }
  function closeModal() {
    markAllRead();
    setReadIds(getReadIds());
    setUnread(0);
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={openModal}
        className="relative border-2 border-ink rounded-thick px-2 py-1 text-sm font-cn bg-white hover:bg-chip-cream"
        aria-label="公告"
        title="作者公告"
      >
        🔔
        {unread > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 bg-accent text-white rounded-full text-[10px] font-bold w-4 h-4 flex items-center justify-center border border-ink"
            aria-label={`${unread} 条未读`}
          >
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div
          onClick={closeModal}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-paper border-2 border-ink rounded-thick w-full max-w-md max-h-[80vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-paper border-b-2 border-ink px-4 py-3 flex items-center justify-between">
              <h3 className="font-handBold text-xl">🔔 作者公告</h3>
              <button
                onClick={closeModal}
                className="font-handBold text-2xl leading-none"
                aria-label="关闭"
              >
                ×
              </button>
            </div>
            <div className="p-4 space-y-4">
              {ANNOUNCEMENTS.length === 0 ? (
                <p className="font-cn text-sm text-ink-3 text-center py-8">还没有公告</p>
              ) : (
                ANNOUNCEMENTS.map((a) => {
                  const isUnread = !readIds.has(a.id);
                  const copy = getAnnouncementCopy(a, language);
                  return (
                    <article
                      key={a.id}
                      className={`border-2 border-ink rounded-thick p-3 ${
                        isUnread ? 'bg-chip-cream' : 'bg-white'
                      }`}
                    >
                      <header className="mb-2 flex items-baseline justify-between gap-2">
                        <h4 className="font-handBold text-base flex-1 leading-tight">{copy.title}</h4>
                        <time className="font-cn text-[11px] text-ink-3 shrink-0">{a.date}</time>
                      </header>
                      <p className="font-cn text-sm whitespace-pre-wrap leading-relaxed text-ink">
                        {copy.body}
                      </p>
                    </article>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * 登录后首页 (ProfileList) 调用: 自动弹最新一条未读公告.
 * 用户点 "知道啦" 后标已读, 之后只能通过铃铛查看历史.
 */
export function AutoAnnouncementPopup({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-paper border-2 border-ink rounded-thick w-full max-w-sm max-h-[80vh] overflow-y-auto"
      >
        <AutoAnnouncementContent onClose={onClose} />
      </div>
    </div>
  );
}

function AutoAnnouncementContent({ onClose }: { onClose: () => void }) {
  const { language } = useLanguage();
  const latest = ANNOUNCEMENTS[0];
  if (!latest) return null;
  const copy = getAnnouncementCopy(latest, language);
  return (
    <>
      <div className="border-b-2 border-ink px-4 py-3 flex items-baseline justify-between gap-2">
        <h3 className="font-handBold text-xl flex-1 leading-tight">{copy.title}</h3>
        <time className="font-cn text-[11px] text-ink-3 shrink-0">{latest.date}</time>
      </div>
      <p className="font-cn text-sm whitespace-pre-wrap leading-relaxed p-4 text-ink">
        {copy.body}
      </p>
      <div className="border-t-2 border-ink px-4 py-3 text-center">
        <button
          onClick={onClose}
          className="border-2 border-ink rounded-thick px-6 py-2 text-sm font-cn bg-accent text-white"
        >
          知道啦 👍
        </button>
        <p className="font-cn text-[11px] text-ink-3 mt-2">关掉之后可以在右上角 🔔 铃铛里再看</p>
      </div>
    </>
  );
}
