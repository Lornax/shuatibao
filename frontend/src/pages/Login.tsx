import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, setToken } from '../api/client';
import { useAuth } from '../auth/AuthContext';

/**
 * 登录页 · 高保真 v2
 * 设计稿 learn-or-die-linephoto/登录页 · 高保真 v2.html
 *
 * 自包含样式，不用 Layout 包；只在此页和 Register 用 LXGW WenKai TC。
 */
export function Login() {
  const nav = useNavigate();
  const { refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!email.trim() || !password) return setError('邮箱和密码必填');
    setSubmitting(true);
    setError(null);
    try {
      const r = await api.login({ email: email.trim(), password });
      setToken(r.token);
      await refresh();
      nav('/profiles', { replace: true });
    } catch (e) {
      setError(String(e).includes('invalid_credentials') ? '邮箱或密码错' : String(e));
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-5 py-8" style={pageBg}>
      <div className="w-full max-w-[360px] relative">
        {/* 装饰元素 */}
        <div className="float sticky-note">
          D-?<br />加油!
        </div>
        <div className="float book-deco" />
        <div className="float dot dot-red" />
        <div className="float dot dot-yellow" />

        {/* hero */}
        <div className="text-center pt-4 relative">
          <div className="logo">学</div>
          <h1 className="title">学不死</h1>
          <p className="subtitle">
            和你一起, 把<span className="accent">那场考试</span>慢慢啃下来
          </p>
        </div>

        {/* form */}
        <div className="mt-7 flex flex-col gap-3.5">
          <FieldRow>
            <FieldIcon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
              </svg>
            </FieldIcon>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="账号 / 邮箱"
              autoComplete="email"
              className="lod-input"
            />
          </FieldRow>
          <FieldRow>
            <FieldIcon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="11" width="16" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
            </FieldIcon>
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="密码"
              autoComplete="current-password"
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
          </FieldRow>

          <div className="flex items-center justify-between text-sm px-1 mt-0.5" style={{ color: '#6a5340' }}>
            <label
              className="inline-flex items-center gap-2 cursor-pointer"
              onClick={() => setRemember((v) => !v)}
            >
              <span className={`check ${remember ? 'checked' : ''}`} />
              记住我
            </label>
            {/* 忘记密码 placeholder, 没邮箱/短信暂时不实现 */}
          </div>
        </div>

        {error && (
          <p className="text-center mt-3 text-sm" style={{ color: '#c14d2e' }}>
            {error}
          </p>
        )}

        {/* primary button */}
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="btn-primary mt-5"
        >
          {submitting ? '登录中...' : '登录'}
        </button>

        <div className="signup text-center mt-3.5 text-sm" style={{ color: '#6a5340' }}>
          还没有账号？
          <Link to="/register" style={{ color: '#c14d2e', fontWeight: 600, marginLeft: 4 }}>
            去注册 →
          </Link>
        </div>

        <div className="footer mt-8 text-center text-xs" style={{ color: '#8a7560' }}>
          © 学不死 · 一个慢慢啃下来的备考工具
        </div>
      </div>

      <PageStyles />
    </div>
  );
}

const pageBg: React.CSSProperties = {
  background:
    'radial-gradient(circle at 100% 0%, #fff 0%, transparent 45%), radial-gradient(circle at 0% 100%, #f5e8d8 0%, transparent 50%), #faf5ec',
  color: '#2a1f15',
  fontFamily: "'LXGW WenKai TC', 'PingFang SC', system-ui, sans-serif",
};

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="lod-field">{children}</div>;
}

function FieldIcon({ children }: { children: React.ReactNode }) {
  return <span className="lod-field-icon">{children}</span>;
}

/** Inline styles shared by Login + Register. Kept here so this page is
 *  fully self-contained and other pages keep their existing tokens. */
export function PageStyles() {
  return (
    <style>{`
      .float {
        position: absolute;
        border: 1.5px solid #2a1f15;
        box-shadow: 2px 3px 0 rgba(42,31,21,0.1);
        z-index: 0;
      }
      .float.sticky-note {
        background: #fef3c7;
        width: 60px; height: 60px;
        top: 16px; right: -4px;
        transform: rotate(8deg);
        border-radius: 4px;
        font-family: 'LXGW WenKai TC', cursive;
        font-size: 12px; color: #6a4f2a;
        padding: 8px; line-height: 1.3;
      }
      .float.book-deco {
        background: #d4e8d0;
        width: 50px; height: 64px;
        top: 0px; left: -4px;
        transform: rotate(-6deg);
        border-radius: 4px 8px 8px 4px;
        border-left: 4px solid #2a1f15;
      }
      .float.dot {
        width: 8px; height: 8px; border-radius: 50%;
        border: none; box-shadow: none;
      }
      .float.dot.dot-red { top: 96px; right: 36px; background: #c14d2e; }
      .float.dot.dot-yellow { top: 136px; left: 60px; background: #f5d97a; border: 1.5px solid #2a1f15; }

      .logo {
        width: 88px; height: 88px;
        margin: 0 auto 16px;
        background: #f5d97a;
        border-radius: 26px;
        border: 2px solid #2a1f15;
        box-shadow: 4px 5px 0 #2a1f15;
        display: flex; align-items: center; justify-content: center;
        font-family: 'LXGW WenKai TC', cursive;
        font-weight: 700;
        font-size: 52px;
        line-height: 1;
        color: #2a1f15;
        position: relative;
        transform: rotate(-3deg);
      }
      .logo::after {
        content: '✦';
        position: absolute;
        top: -10px; right: -10px;
        color: #c14d2e; font-size: 20px;
        transform: rotate(15deg);
      }
      .title {
        font-family: 'LXGW WenKai TC', cursive;
        font-size: 32px; font-weight: 700;
        color: #2a1f15;
        letter-spacing: 1px;
        margin: 0;
        line-height: 1.1;
      }
      .subtitle {
        font-size: 14px;
        color: #6a5340;
        margin-top: 8px;
        line-height: 1.55;
      }
      .subtitle .accent {
        color: #c14d2e;
        border-bottom: 1.5px solid #c14d2e;
        padding-bottom: 1px;
      }

      .lod-field {
        height: 52px; background: #fff;
        border: 2px solid #2a1f15; border-radius: 16px;
        box-shadow: 2px 3px 0 rgba(42,31,21,0.1);
        display: flex; align-items: center; padding: 0 16px; gap: 10px;
        transition: box-shadow 0.15s;
        position: relative; z-index: 1;
      }
      .lod-field:focus-within { box-shadow: 3px 4px 0 #c14d2e; }
      .lod-field-icon {
        width: 22px; height: 22px; color: #6a5340;
        display: inline-flex; flex-shrink: 0;
      }
      .lod-field-icon svg { width: 100%; height: 100%; }
      .lod-input {
        flex: 1; border: none; outline: none; background: transparent;
        font-family: 'LXGW WenKai TC', 'PingFang SC', sans-serif;
        font-size: 16px; color: #2a1f15; padding: 0;
        min-width: 0;
      }
      .lod-input::placeholder { color: #b8a78f; }
      .eye {
        border: none; background: transparent; cursor: pointer;
        color: #8a7560; width: 24px; height: 24px;
        display: flex; align-items: center; justify-content: center;
      }
      .eye svg { width: 22px; height: 22px; }
      .check {
        width: 18px; height: 18px;
        border: 1.5px solid #2a1f15; border-radius: 5px;
        background: #fff;
        box-shadow: 1px 2px 0 rgba(42,31,21,0.1);
        display: inline-flex; align-items: center; justify-content: center;
        flex-shrink: 0;
      }
      .check.checked { background: #c14d2e; position: relative; }
      .check.checked::after {
        content: ''; width: 8px; height: 4px;
        border-left: 2px solid #fff; border-bottom: 2px solid #fff;
        transform: rotate(-45deg) translate(1px, -1px);
      }

      .btn-primary {
        width: 100%;
        height: 54px;
        border-radius: 28px;
        border: 2px solid #2a1f15;
        font-family: 'LXGW WenKai TC', 'PingFang SC', sans-serif;
        font-size: 17px; font-weight: 600;
        background: #2a1f15;
        color: #faf5ec;
        box-shadow: 3px 4px 0 #c14d2e;
        cursor: pointer;
        transition: transform 0.1s, box-shadow 0.1s;
        position: relative;
        z-index: 1;
      }
      .btn-primary:active:not(:disabled) {
        transform: translate(3px, 4px);
        box-shadow: 0 0 0 #c14d2e;
      }
      .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    `}</style>
  );
}
