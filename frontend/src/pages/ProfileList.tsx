import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nav = useNavigate();

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
        <Box variant="dashed" className="p-6 text-center">
          <p className="font-cn text-sm text-ink-2">还没有档案，点右上角新建一个</p>
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
            {profile.target ?? '无目标说明'} · 每天 {profile.dailyMinutes} 分钟
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
