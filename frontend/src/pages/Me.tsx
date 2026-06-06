import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, clearToken, type AuthUser } from '../api/client';
import { Box } from '../components/Box';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Layout } from '../components/Layout';

export function Me() {
  const nav = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [pwOpen, setPwOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

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

  async function changePassword() {
    setPwMsg(null);
    if (!currentPw) return setPwMsg({ kind: 'err', text: '请输入当前密码' });
    if (newPw.length < 6) return setPwMsg({ kind: 'err', text: '新密码至少 6 位' });
    if (newPw !== confirmPw) return setPwMsg({ kind: 'err', text: '两次输入的新密码不一致' });
    setPwSubmitting(true);
    try {
      await api.changePassword({ currentPassword: currentPw, newPassword: newPw });
      setPwMsg({ kind: 'ok', text: '密码已修改' });
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (e) {
      const msg = String(e);
      if (msg.includes('invalid_current_password')) setPwMsg({ kind: 'err', text: '当前密码错' });
      else setPwMsg({ kind: 'err', text: msg });
    } finally {
      setPwSubmitting(false);
    }
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

        <Box variant="soft" className="p-3">
          <button
            type="button"
            onClick={() => nav('/me/feedback')}
            className="w-full text-left font-cn text-sm font-bold flex items-center justify-between"
          >
            <span>📋 我的反馈</span>
            <span className="font-handBold">›</span>
          </button>
        </Box>

        <Box variant="soft" className="p-3">
          <button
            type="button"
            onClick={() => setPwOpen((v) => !v)}
            className="w-full text-left font-cn text-sm font-bold flex items-center justify-between"
          >
            <span>🔒 修改密码</span>
            <span className="font-handBold">{pwOpen ? '▴' : '▾'}</span>
          </button>
          {pwOpen && (
            <div className="mt-3 space-y-2">
              <div>
                <label className="font-cn text-xs text-ink-2 block mb-1">当前密码</label>
                <Input
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label className="font-cn text-xs text-ink-2 block mb-1">新密码（至少 6 位）</label>
                <Input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="font-cn text-xs text-ink-2 block mb-1">再输一次新密码</label>
                <Input
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              {pwMsg && (
                <p
                  className={`font-cn text-xs break-words ${
                    pwMsg.kind === 'ok' ? 'text-accent-4' : 'text-accent'
                  }`}
                >
                  {pwMsg.text}
                </p>
              )}
              <Button
                variant="primary"
                onClick={changePassword}
                disabled={pwSubmitting}
                className="w-full justify-center"
              >
                {pwSubmitting ? '保存中...' : '确认修改'}
              </Button>
            </div>
          )}
        </Box>

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
