import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, setToken } from '../api/client';
import { Box } from '../components/Box';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Layout } from '../components/Layout';

export function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!email.trim() || !password) return setError('邮箱和密码必填');
    setSubmitting(true);
    setError(null);
    try {
      const r = await api.login({ email: email.trim(), password });
      setToken(r.token);
      nav('/profiles', { replace: true });
    } catch (e) {
      setError(String(e).includes('invalid_credentials') ? '邮箱或密码错' : String(e));
      setSubmitting(false);
    }
  }

  return (
    <Layout title="登录">
      <div className="space-y-3">
        <p className="font-cn text-sm text-ink-2">
          欢迎回来。还没账号？<Link to="/register" className="underline">去注册</Link>
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
          <label className="font-cn font-bold text-sm block mb-1">密码</label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="6 字符以上"
            autoComplete="current-password"
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
          {submitting ? '登录中...' : '登录'}
        </Button>
      </div>
    </Layout>
  );
}
