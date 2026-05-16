import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, clearToken, type AuthUser } from '../api/client';
import { Box } from '../components/Box';
import { Button } from '../components/Button';
import { Layout } from '../components/Layout';

export function Me() {
  const nav = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api
      .me()
      .then((r) => setUser(r.user))
      .catch((e) => setErr(String(e)));
  }, []);

  function logout() {
    if (!window.confirm('退出登录？')) return;
    clearToken();
    nav('/login', { replace: true });
  }

  return (
    <Layout title="我的" back={() => nav('/profiles')}>
      <div className="space-y-3">
        {err && (
          <Box variant="dashed" className="p-2 border-accent">
            <p className="font-cn text-xs text-accent">{err}</p>
          </Box>
        )}

        {user ? (
          <Box variant="thick" className="p-3 bg-chip-cream">
            <p className="font-cn text-xs text-ink-3 mb-1">昵称</p>
            <p className="font-cn text-base font-bold mb-2">{user.nickname}</p>
            <p className="font-cn text-xs text-ink-3 mb-1">邮箱</p>
            <p className="font-cn text-sm text-ink">{user.email}</p>
            {user.createdAt && (
              <p className="font-cn text-[11px] text-ink-3 mt-2">
                注册于 {new Date(user.createdAt).toLocaleDateString('zh-CN')}
              </p>
            )}
          </Box>
        ) : (
          <p className="font-cn text-sm text-ink-2">加载中...</p>
        )}

        <Button variant="ghost" onClick={logout} className="w-full justify-center">
          <span className="text-accent">退出登录</span>
        </Button>

        <Box variant="dashed" className="p-2">
          <p className="font-cn text-[11px] text-ink-3">
            提示：你账号下的档案、题库、错题、AI 陪学历史都是私有的，登录其他账号看不到。
          </p>
        </Box>
      </div>
    </Layout>
  );
}
