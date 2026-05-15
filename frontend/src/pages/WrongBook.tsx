import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type WrongItem } from '../api/client';
import { Box } from '../components/Box';
import { Button } from '../components/Button';
import { Layout } from '../components/Layout';

const STREAK_MASTER = 3;

export function WrongBook() {
  const { pid } = useParams<{ pid: string }>();
  const nav = useNavigate();
  const [list, setList] = useState<WrongItem[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!pid) return;
    try {
      const r = await api.wrongbook(pid);
      setList(r);
    } catch (e) {
      setError(String(e));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid]);

  async function handleRemove(qid: string) {
    if (!window.confirm('从错题本移除这道题？')) return;
    setBusyId(qid);
    try {
      await api.removeFromWrongbook(qid);
      load();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Layout title="错题本" back={() => nav(`/profiles/${pid}`)}>
      <Box variant="dashed" className="p-2 mb-3 bg-chip-cream">
        <p className="font-cn text-xs text-ink-2">
          错题本里的题会一直保留，直到你连续答对 {STREAK_MASTER} 次。蒙对的、印象深的题也可以在答题页主动加入。
        </p>
      </Box>

      {error && (
        <Box variant="dashed" className="p-2 mb-2 border-accent">
          <p className="font-cn text-xs text-accent">{error}</p>
        </Box>
      )}

      {list === null && <p className="font-cn text-sm text-ink-2">加载中...</p>}
      {list?.length === 0 && (
        <Box variant="dashed" className="p-6 text-center">
          <p className="font-cn text-sm text-ink-2">还没有错题——要么没刷过，要么全掌握 🌟</p>
        </Box>
      )}

      <div className="space-y-3">
        {list?.map((it) => {
          const correctOption = it.options.find((o) => o.key === it.answer);
          const chosenOption = it.last_chosen ? it.options.find((o) => o.key === it.last_chosen) : null;
          return (
            <Box key={it.id} variant="thick" className="p-3">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full border border-ink text-[10px] font-handBold leading-none ${
                    it.source === 'manual' ? 'bg-chip-blue' : 'bg-chip-pink'
                  }`}
                >
                  {it.source === 'manual' ? '主动加入' : '答错自动加入'}
                </span>
                <span className="font-cn text-[11px] text-ink-3">
                  答对 {it.correct_streak} / {STREAK_MASTER} 后自动移除
                </span>
              </div>
              <p className="font-cn text-sm leading-relaxed mb-2">{it.stem}</p>
              <div className="font-cn text-xs space-y-1">
                {chosenOption && (
                  <div>
                    <span className="text-accent">你选：</span>
                    {it.last_chosen}. {chosenOption.text}
                  </div>
                )}
                <div>
                  <span className="text-accent-4">正确：</span>
                  {it.answer}. {correctOption?.text}
                </div>
                {it.explanation && (
                  <div className="text-ink-2 mt-2 pt-2 border-t border-dashed border-ink-3">
                    {it.explanation}
                  </div>
                )}
                <div className="text-ink-3 text-[10px] mt-1">
                  {it.wrong_count > 0 ? `历史错过 ${it.wrong_count} 次` : '尚未在此档案答错过'}
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <Button
                  variant="ghost"
                  onClick={() => handleRemove(it.id)}
                  disabled={busyId === it.id}
                  className="text-xs"
                >
                  ✕ {busyId === it.id ? '移除中...' : '移除'}
                </Button>
              </div>
            </Box>
          );
        })}
      </div>
      {list && list.length > 0 && (
        <div className="mt-4">
          <Button
            variant="primary"
            onClick={() => nav(`/profiles/${pid}/quiz?mode=wrong`)}
            className="w-full justify-center"
          >
            再练一遍（只刷错题） →
          </Button>
        </div>
      )}
    </Layout>
  );
}
