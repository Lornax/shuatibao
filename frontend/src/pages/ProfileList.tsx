import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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

  useEffect(() => {
    api.listProfiles().then(setList);
  }, []);

  return (
    <Layout title="我的备考">
      <div className="flex justify-end mb-3">
        <Link to="/profiles/new">
          <Button variant="primary">+ 新档案</Button>
        </Link>
      </div>

      {list === null && <p className="font-cn text-sm text-ink-2">加载中...</p>}
      {list?.length === 0 && (
        <Box variant="dashed" className="p-6 text-center">
          <p className="font-cn text-sm text-ink-2">还没有档案，点右上角新建一个</p>
        </Box>
      )}

      <div className="space-y-3">
        {list?.map((p) => (
          <Link key={p.id} to={`/profiles/${p.id}`} className="block">
            <Box variant="thick" className="p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-cn text-xs">主线</span>
                {dDay(p.examDate) && <span className="font-cn text-xs">{dDay(p.examDate)}</span>}
              </div>
              <div className="font-cn font-bold text-base">{p.examName}</div>
              <div className="font-cn text-xs text-ink-2 mt-1">
                {p.target ?? '无目标说明'} · 每天 {p.dailyMinutes} 分钟
              </div>
            </Box>
          </Link>
        ))}
      </div>
    </Layout>
  );
}
