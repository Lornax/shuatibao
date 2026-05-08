import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type WrongItem } from '../api/client';
import { Box } from '../components/Box';
import { Button } from '../components/Button';
import { Layout } from '../components/Layout';

export function WrongBook() {
  const { pid } = useParams<{ pid: string }>();
  const nav = useNavigate();
  const [list, setList] = useState<WrongItem[] | null>(null);

  useEffect(() => {
    if (!pid) return;
    api.wrongbook(pid).then(setList);
  }, [pid]);

  return (
    <Layout title="错题本" back={() => nav(`/profiles/${pid}`)}>
      {list === null && <p className="font-cn text-sm text-ink-2">加载中...</p>}
      {list?.length === 0 && (
        <Box variant="dashed" className="p-6 text-center">
          <p className="font-cn text-sm text-ink-2">还没有错题——要么没刷过，要么全对 🌟</p>
        </Box>
      )}
      <div className="space-y-3">
        {list?.map((it) => {
          const correctOption = it.options.find((o) => o.key === it.answer);
          const chosenOption = it.options.find((o) => o.key === it.last_chosen);
          return (
            <Box key={it.id} variant="thick" className="p-3">
              <p className="font-cn text-sm leading-relaxed mb-2">{it.stem}</p>
              <div className="font-cn text-xs space-y-1">
                <div>
                  <span className="text-accent">你选：</span>
                  {it.last_chosen}. {chosenOption?.text}
                </div>
                <div>
                  <span className="text-accent-4">正确：</span>
                  {it.answer}. {correctOption?.text}
                </div>
                {it.explanation && (
                  <div className="text-ink-2 mt-2 pt-2 border-t border-dashed border-ink-3">{it.explanation}</div>
                )}
                <div className="text-ink-3 text-[10px] mt-1">错过 {it.wrong_count} 次</div>
              </div>
            </Box>
          );
        })}
      </div>
      {list && list.length > 0 && (
        <div className="mt-4">
          <Button variant="primary" onClick={() => nav(`/profiles/${pid}/quiz`)} className="w-full justify-center">
            再练一遍 →
          </Button>
        </div>
      )}
    </Layout>
  );
}
