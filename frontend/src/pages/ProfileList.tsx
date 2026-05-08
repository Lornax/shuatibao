import { useEffect, useState } from 'react';
import { api, type Profile } from '../api/client';
import { Box } from '../components/Box';

export function ProfileList() {
  const [list, setList] = useState<Profile[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listProfiles().then(setList).catch((e) => setError(String(e)));
  }, []);

  if (error) return <Box variant="dashed" className="p-4">错误：{error}</Box>;
  if (!list) return <p className="font-cn text-ink-2">加载中...</p>;
  return (
    <div>
      <p className="font-cn text-sm text-ink-2 mb-2">档案数：{list.length}</p>
    </div>
  );
}
