import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, setToken } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Box } from '../components/Box';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Layout } from '../components/Layout';

export function Register() {
  const nav = useNavigate();
  const { refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!email.trim()) return setError('邮箱必填');
    if (!nickname.trim()) return setError('昵称必填');
    if (password.length < 6) return setError('密码至少 6 位');
    setSubmitting(true);
    setError(null);
    try {
      const r = await api.register({
        email: email.trim(),
        nickname: nickname.trim(),
        password,
      });
      setToken(r.token);
      await refresh();
      nav('/profiles', { replace: true });
    } catch (e) {
      const msg = String(e);
      if (msg.includes('email_taken')) setError('这个邮箱已经注册过了，去登录');
      else setError(msg);
      setSubmitting(false);
    }
  }

  return (
    <Layout title="注册">
      <div className="space-y-3">
        <p className="font-cn text-sm text-ink-2">
          建一个账号开始备考。已有账号？<Link to="/login" className="underline">去登录</Link>
        </p>
        <div>
          <label className="font-cn font-bold text-sm block mb-1">邮箱</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="lornax@example.com"
            autoComplete="email"
          />
        </div>
        <div>
          <label className="font-cn font-bold text-sm block mb-1">昵称</label>
          <Input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="你想被叫什么"
            autoComplete="nickname"
          />
        </div>
        <div>
          <label className="font-cn font-bold text-sm block mb-1">密码</label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="6 字符以上"
            autoComplete="new-password"
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
          />
        </div>
        {error && (
          <Box variant="dashed" className="p-2 border-accent">
            <p className="font-cn text-xs text-accent break-words">{error}</p>
          </Box>
        )}
        <Button
          variant="primary"
          onClick={submit}
          disabled={submitting}
          className="w-full justify-center"
        >
          {submitting ? '建账号中...' : '注册并登录'}
        </Button>
      </div>
    </Layout>
  );
}
