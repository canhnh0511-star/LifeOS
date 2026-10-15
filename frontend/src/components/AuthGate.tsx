import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { api, isDemo } from '../api';
import { ApiError, ErrorCode } from '../api/errors';
import { Logo } from './primitives';

type Phase = 'checking' | 'signed-out' | 'signed-in' | 'failed';

/** Real mode only: shows sign-in/register until `GET /me` succeeds. The demo (mock) never has accounts and skips this. */
export function AuthGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>(isDemo ? 'signed-in' : 'checking');
  const [reason, setReason] = useState('');
  useEffect(() => {
    if (isDemo) return;
    let alive = true;
    api.getMe()
      .then(() => { if (alive) setPhase('signed-in'); })
      .catch((e: unknown) => {
        if (!alive) return;
        if (e instanceof ApiError && e.code === ErrorCode.unauthenticated) setPhase('signed-out');
        else { setReason(e instanceof Error ? e.message : 'Không kết nối được máy chủ.'); setPhase('failed'); }
      });
    return () => { alive = false; };
  }, []);
  if (phase === 'signed-in') return <>{children}</>;
  if (phase === 'checking') return <div className="loading-shell"><div className="loader"/><p>Đang kiểm tra phiên đăng nhập...</p></div>;
  if (phase === 'failed') return <div className="auth-screen"><div className="auth-card"><Logo/><p role="alert" className="auth-error">{reason}</p><button className="btn btn-primary" onClick={() => window.location.reload()}>Thử lại</button></div></div>;
  return <AuthForm onDone={() => setPhase('signed-in')}/>;
}

function AuthForm({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [fields, setFields] = useState<Record<string, string>>({});
  const register = mode === 'register';
  const submit = async (e: FormEvent) => {
    e.preventDefault(); if (busy) return;
    setBusy(true); setError(''); setFields({});
    try {
      if (register) await api.register({ email: email.trim(), password, displayName: displayName.trim(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
      else await api.login({ email: email.trim(), password });
      onDone();
    } catch (err) {
      if (err instanceof ApiError) { const f = err.fields ?? {}; setFields(f); setError(Object.keys(f).length ? '' : err.message); }
      else setError('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally { setBusy(false); }
  };
  const field = (name: string) => fields[name] ? <small className="field-error" role="alert">{fields[name]}</small> : null;
  return <div className="auth-screen"><div className="auth-card">
    <Logo/>
    <h1>{register ? 'Tạo tài khoản' : 'Đăng nhập'}</h1>
    <form onSubmit={submit} className="form-stack">
      {register && <label>Tên hiển thị <input value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={60} required autoComplete="nickname"/>{field('displayName')}</label>}
      <label>Email <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus autoComplete="email"/>{field('email')}</label>
      <label>Mật khẩu <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={register ? 10 : undefined} maxLength={72} autoComplete={register ? 'new-password' : 'current-password'}/>{field('password')}</label>
      {register && <p className="form-note">Mật khẩu từ 10 đến 72 ký tự.</p>}
      {error && <p role="alert" className="auth-error">{error}</p>}
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Đang xử lý...' : register ? 'Tạo tài khoản' : 'Đăng nhập'}</button>
    </form>
    <button type="button" className="btn btn-quiet" onClick={() => { setMode(register ? 'login' : 'register'); setError(''); setFields({}); }}>{register ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}</button>
  </div></div>;
}
