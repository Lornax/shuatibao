import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type Profile } from '../api/client';
import { Box } from '../components/Box';
import { Button } from '../components/Button';
import { Layout } from '../components/Layout';
import { AutoAnnouncementPopup } from '../components/AnnouncementBell';
import { getLatestUnread, markRead } from '../utils/announcements';
import { formatProfileMeta, useLanguage } from '../i18n';

function dDay(examDate: string | null) {
  if (!examDate) return null;
  const days = Math.ceil((new Date(examDate).getTime() - Date.now()) / 86400000);
  return days >= 0 ? `D-${days}` : `+${-days}d`;
}

// 鼓励文案池. ProfileList 挂载时随机选一句 (刷新换一句, 停留期间不变).
const STARTER_QUOTES = [
  '不积跬步，无以至千里。先建第一个档案，迈出最关键的那一步。',
  '千里之行，始于足下。点新档案，把目标先写下来。',
  '学海无涯苦作舟。万事开头难，第一份档案最珍贵。',
  '合抱之木，生于毫末；九层之台，起于累土。从一个档案开始。',
  '世上无难事，只怕有心人。新建一个档案，给目标个具体的形状。',
  '书山有路勤为径。第一步走出去，山就不那么高了。',
  '学不可以已 —— 荀子。你已经选择不躺平了，剩下的就是开始。',
  '一日不读书，胸臆无佳想。建档案不为别的，就为留住「我要开始」这个念头。',
];

const ALL_ARCHIVED_QUOTES = [
  '{n} 个目标已落袋。问渠那得清如许？接下来想考点什么？',
  '恭喜完成 {n} 个备考。学如逆水行舟，下一站去哪？',
  '{n} 项已归档。会当凌绝顶，一览众山小。新山头要不要选一个？',
  '{n} 个档案完美收官。读书破万卷，下笔如有神。继续？',
  '{n} 个目标达成。书到用时方恨少，是时候开启新的旅程了吗？',
  '{n} 个考试都过完了。三人行必有我师，还想再学什么？',
  '{n} 项已沉淀。学而时习之，不亦说乎？下一个目标在哪？',
  '{n} 个档案归档了。少壮工夫老始成，趁现在再开一个？',
];

function pickQuote(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

export function ProfileList() {
  const [list, setList] = useState<Profile[] | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoAnnouncementId, setAutoAnnouncementId] = useState<string | null>(null);
  const nav = useNavigate();

  useEffect(() => {
    const a = getLatestUnread();
    if (a) setAutoAnnouncementId(a.id);
  }, []);

  function dismissAutoAnnouncement() {
    if (autoAnnouncementId) markRead(autoAnnouncementId);
    setAutoAnnouncementId(null);
  }

  async function reload() {
    try {
      const r = await api.listProfiles();
      setList(r);
    } catch (e) {
      setError(String(e));
    }
  }

  useEffect(() => {
    reload();
  }, []);

  const { active, archived } = useMemo(() => {
    if (!list) return { active: null as Profile[] | null, archived: [] as Profile[] };
    return {
      active: list.filter((p) => p.status === 'active'),
      archived: list.filter((p) => p.status !== 'active'),
    };
  }, [list]);

  // 每次组件挂载选一句, list 数据变化不重选 (避免操作后突然换文案)
  const starterQuote = useMemo(() => pickQuote(STARTER_QUOTES), []);
  const allArchivedQuote = useMemo(() => pickQuote(ALL_ARCHIVED_QUOTES), []);

  async function handleDelete(p: Profile) {
    if (!window.confirm(`删除档案「${p.examName}」？\n该档案下所有题目、答题记录、错题本都会一并删除（不可恢复）。`))
      return;
    try {
      await api.deleteProfile(p.id);
      setMenuOpenId(null);
      reload();
    } catch (e) {
      setError(String(e));
    }
  }

  async function handleArchive(p: Profile) {
    const action = p.status === 'active' ? '归档' : '取消归档';
    if (!window.confirm(`${action}档案「${p.examName}」？`)) return;
    try {
      await api.patchProfile(p.id, { status: p.status === 'active' ? 'archived' : 'active' });
      setMenuOpenId(null);
      reload();
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <>
    {autoAnnouncementId && <AutoAnnouncementPopup onClose={dismissAutoAnnouncement} />}
    <Layout title="我的备考">
      <div className="flex justify-end mb-3 gap-2">
        <Link to="/me">
          <Button variant="ghost">我的</Button>
        </Link>
        <Link to="/profiles/new">
          <Button variant="primary">+ 新档案</Button>
        </Link>
      </div>

      {error && (
        <Box variant="dashed" className="p-2 mb-2">
          <p className="font-cn text-xs text-accent">{error}</p>
        </Box>
      )}

      {list === null && <p className="font-cn text-sm text-ink-2">加载中...</p>}

      {list?.length === 0 && (
        <Box variant="dashed" className="p-5 text-center bg-chip-cream">
          <p className="font-cn text-sm leading-relaxed text-ink mb-3">{starterQuote}</p>
          <Link to="/profiles/new">
            <Button variant="primary">+ 新建第一个档案</Button>
          </Link>
        </Box>
      )}

      {list && list.length > 0 && active?.length === 0 && archived.length > 0 && (
        <Box variant="dashed" className="p-5 text-center bg-chip-green mb-3">
          <p className="font-cn text-sm leading-relaxed text-ink mb-3">
            {allArchivedQuote.replace('{n}', String(archived.length))}
          </p>
          <Link to="/profiles/new">
            <Button variant="primary">+ 开启下一段</Button>
          </Link>
        </Box>
      )}

      <div className="space-y-3">
        {active?.map((p) => (
          <ProfileCard
            key={p.id}
            profile={p}
            menuOpen={menuOpenId === p.id}
            onToggleMenu={() => setMenuOpenId(menuOpenId === p.id ? null : p.id)}
            onCloseMenu={() => setMenuOpenId(null)}
            onEdit={() => {
              setMenuOpenId(null);
              nav(`/profiles/${p.id}/edit`);
            }}
            onArchive={() => handleArchive(p)}
            onDelete={() => handleDelete(p)}
          />
        ))}
      </div>

      {archived.length > 0 && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setArchivedOpen((v) => !v)}
            className="font-cn text-sm text-ink-2 flex items-center gap-1 mb-2"
          >
            <span>已归档 ({archived.length})</span>
            <span className="font-handBold">{archivedOpen ? '▴' : '▾'}</span>
          </button>
          {archivedOpen && (
            <div className="space-y-3 opacity-75">
              {archived.map((p) => (
                <ProfileCard
                  key={p.id}
                  profile={p}
                  menuOpen={menuOpenId === p.id}
                  onToggleMenu={() => setMenuOpenId(menuOpenId === p.id ? null : p.id)}
                  onCloseMenu={() => setMenuOpenId(null)}
                  onEdit={() => {
                    setMenuOpenId(null);
                    nav(`/profiles/${p.id}/edit`);
                  }}
                  onArchive={() => handleArchive(p)}
                  onDelete={() => handleDelete(p)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </Layout>
    </>
  );
}

function ProfileCard({
  profile,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  onEdit,
  onArchive,
  onDelete,
}: {
  profile: Profile;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isArchived = profile.status !== 'active';
  const { language } = useLanguage();

  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) onCloseMenu();
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen, onCloseMenu]);

  return (
    <div ref={cardRef} className="relative">
      <Link to={`/profiles/${profile.id}`} className="block">
        <Box variant="thick" className={`p-3 pr-10 ${isArchived ? 'bg-paper' : ''}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="font-cn text-xs">
              {isArchived ? '已归档' : '主线'}
            </span>
            {dDay(profile.examDate) && <span className="font-cn text-xs">{dDay(profile.examDate)}</span>}
          </div>
          <div className="font-cn font-bold text-base">{profile.examName}</div>
          <div className="font-cn text-xs text-ink-2 mt-1">
            {formatProfileMeta(profile.target, profile.dailyMinutes, language)}
          </div>
        </Box>
      </Link>

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleMenu();
        }}
        aria-label="更多操作"
        className="absolute top-2 right-2 w-8 h-8 rounded-full border border-ink bg-white hover:bg-chip-cream flex items-center justify-center font-handBold text-base leading-none"
      >
        ⋯
      </button>

      {menuOpen && (
        <div className="absolute top-12 right-2 z-10 border-2 border-ink rounded-thick bg-white shadow-brutal-sm overflow-hidden min-w-[120px]">
          <button
            type="button"
            onClick={onEdit}
            className="block w-full px-3 py-2 font-cn text-sm text-left hover:bg-chip-cream border-b border-ink/20"
          >
            ✎ 编辑
          </button>
          <button
            type="button"
            onClick={onArchive}
            className="block w-full px-3 py-2 font-cn text-sm text-left hover:bg-chip-cream border-b border-ink/20"
          >
            {isArchived ? '↩ 取消归档' : '📦 归档'}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="block w-full px-3 py-2 font-cn text-sm text-left hover:bg-chip-pink text-accent"
          >
            🗑 删除
          </button>
        </div>
      )}
    </div>
  );
}
