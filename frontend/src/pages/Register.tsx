import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, setToken } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { LanguageToggle } from '../i18n';
import { PageStyles } from './Login';

/**
 * 注册页 · 沿用登录页 v2 设计
 */
export function Register() {
  const nav = useNavigate();
  const { refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
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
      if (msg.includes('email_taken')) setError('这个邮箱已注册过, 去登录吧');
      else setError(msg);
      setSubmitting(false);
    }
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-5 py-8"
      style={{
        background:
          'radial-gradient(circle at 100% 0%, #fff 0%, transparent 45%), radial-gradient(circle at 0% 100%, #f5e8d8 0%, transparent 50%), #faf5ec',
        color: '#2a1f15',
        fontFamily: "'LXGW WenKai TC', 'PingFang SC', system-ui, sans-serif",
      }}
    >
      <div className="w-full max-w-[360px] relative">
        <div className="absolute right-0 -top-1 z-10">
          <LanguageToggle compact />
        </div>
        <div className="float sticky-note">
          建档案<br />开始啃!
        </div>
        <div className="float book-deco" />
        <div className="float dot dot-red" />
        <div className="float dot dot-yellow" />

        <div className="text-center pt-4 relative">
          <div className="logo">刷</div>
          <h1 className="title">建一个账号</h1>
          <p className="subtitle">
            从今天开始, <span className="accent">一题一题</span>积累
          </p>
        </div>

        <div className="mt-7 flex flex-col gap-3.5">
          <div className="lod-field">
            <span className="lod-field-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16v16H4z" />
                <path d="M4 4l8 8 8-8" />
              </svg>
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="邮箱"
              autoComplete="email"
              className="lod-input"
            />
          </div>
          <div className="lod-field">
            <span className="lod-field-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
              </svg>
            </span>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="昵称"
              autoComplete="nickname"
              className="lod-input"
            />
          </div>
          <div className="lod-field">
            <span className="lod-field-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="11" width="16" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
            </span>
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="密码（至少 6 位）"
              autoComplete="new-password"
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
              }}
              className="lod-input"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="eye"
              aria-label="切换密码可见性"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                {showPw ? (
                  <>
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </>
                ) : (
                  <>
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                    <line x1="4" y1="4" x2="20" y2="20" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>

        {error && (
          <p className="text-center mt-3 text-sm" style={{ color: '#c14d2e' }}>
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="btn-primary mt-5"
        >
          {submitting ? '建账号中...' : '注册并登录'}
        </button>

        <div className="signup text-center mt-3.5 text-sm" style={{ color: '#6a5340' }}>
          已有账号？
          <Link to="/login" style={{ color: '#c14d2e', fontWeight: 600, marginLeft: 4 }}>
            去登录 →
          </Link>
        </div>

        <div className="footer mt-8 text-center text-xs" style={{ color: '#8a7560' }}>
          注册即同意 <span style={{ color: '#c14d2e' }}>《简单备考承诺》</span>
        </div>
      </div>

      <PageStyles />
    </div>
  );
}
