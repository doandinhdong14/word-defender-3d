import React, { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, KeyRound, LockKeyhole, LogIn, ShieldCheck, UserPlus } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { validatePassword } from '../auth/authService';
import { PaperPanel } from '../components/PaperPanel';
import { StickerButton } from '../components/StickerButton';
import { getAssetUrl } from '../utils/assetUrl';

type AuthMode = 'login' | 'register';

const googleErrors: Record<string, string> = {
  cancelled: 'Bạn đã hủy đăng nhập Google. Bạn có thể thử lại bất cứ lúc nào.',
  invalid_state: 'Phiên đăng nhập Google đã hết hạn hoặc không hợp lệ. Hãy thử lại.',
  not_configured: 'Đăng nhập Google chưa được cấu hình. Vui lòng thử lại sau.',
  google_failed: 'Chưa đăng nhập được bằng Google. Vui lòng thử lại.',
};

export const AuthPage: React.FC = () => {
  const { hasAccounts, login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>(hasAccounts ? 'login' : 'register');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(() => {
    const code = new URLSearchParams(window.location.search).get('auth_error');
    return code ? googleErrors[code] || googleErrors.google_failed : null;
  });
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [googleStarting, setGoogleStarting] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/auth/config', { signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(config => setGoogleEnabled(config?.googleEnabled === true))
      .catch(() => {});
    const url = new URL(window.location.href);
    if (url.searchParams.has('auth_error')) {
      url.searchParams.delete('auth_error');
      window.history.replaceState(null, '', url);
    }
    return () => controller.abort();
  }, []);
  const [submitting, setSubmitting] = useState(false);
  const passwordErrors = useMemo(() => validatePassword(password, email), [password, email]);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setError(null);

    if (mode === 'register' && password !== confirmPassword) {
      setError('Mật khẩu xác nhận chưa khớp.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register({ displayName, email, password });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-shell notebook-grid-bg">
      <div className="auth-layout">
        <section className="auth-intro" aria-labelledby="auth-title">
          <div className="auth-brand">
            <img src={getAssetUrl('/pempom.svg')} alt="" className="auth-logo" />
            <span>pempom</span>
          </div>
          <h1 id="auth-title">Một tài khoản nhỏ.<br />Cả thế giới chờ bạn.</h1>
          <p>
            Đăng nhập để giữ riêng tiến trình học, xu và tủ đồ của bạn trên thiết bị này.
          </p>
          <div className="auth-security-list">
            <div><ShieldCheck size={19} /><span>Giữ tiến trình và bộ trang bị của riêng bạn</span></div>
            <div><LockKeyhole size={19} /><span>Tích lũy xu qua từng trận chiến</span></div>
            <div><KeyRound size={19} /><span>Mở quà mỗi ngày, nhận thêm niềm vui</span></div>
          </div>
        </section>

        <PaperPanel className="auth-card" foldedCorner>
          <div className="auth-tabs" role="tablist" aria-label="Tài khoản">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={mode === 'login' ? 'active' : ''}
              onClick={() => switchMode('login')}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              className={mode === 'register' ? 'active' : ''}
              onClick={() => switchMode('register')}
            >
              Đăng ký
            </button>
          </div>

          <div className="auth-card-heading">
            <span className="auth-eyebrow">{mode === 'login' ? 'CHÀO MỪNG TRỞ LẠI' : 'TẠO HỒ SƠ MỚI'}</span>
            <h2>{mode === 'login' ? 'Tiếp tục học cùng pempom' : 'Bắt đầu hành trình'}</h2>
            <p>
              {mode === 'login'
                ? 'Nhập thông tin tài khoản của bạn để tiếp tục.'
                : 'Tạo tài khoản để bắt đầu cuộc phiêu lưu của bạn.'}
            </p>
          </div>

          {googleEnabled && (
            <div className="auth-google-section">
              <button type="button" className="auth-google-button" disabled={googleStarting || submitting} onClick={() => {
                setGoogleStarting(true);
                window.location.assign('/api/auth/google/start');
              }}>
                <svg aria-hidden="true" viewBox="0 0 48 48" width="20" height="20">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6C44.4 38.04 46.98 31.87 46.98 24.55Z" />
                  <path fill="#FBBC05" d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.73-6C30.02 37.65 27.26 38.5 24 38.5c-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
                </svg>
                {googleStarting ? 'Đang chuyển đến Google…' : 'Tiếp tục với Google'}
              </button>
              <div className="auth-divider"><span>hoặc dùng email</span></div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            {mode === 'register' && (
              <label>
                <span>Tên hiển thị</span>
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  autoComplete="name"
                  minLength={2}
                  maxLength={50}
                  placeholder="Ví dụ: Minh Anh"
                  required
                />
              </label>
            )}

            <label>
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                maxLength={254}
                placeholder="ban@example.com"
                required
              />
            </label>

            <label>
              <span>Mật khẩu</span>
              <div className="auth-password-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  maxLength={128}
                  placeholder={mode === 'login' ? 'Nhập mật khẩu' : 'Tối thiểu 10 ký tự'}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </label>

            {mode === 'register' && (
              <>
                <label>
                  <span>Xác nhận mật khẩu</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    maxLength={128}
                    placeholder="Nhập lại mật khẩu"
                    required
                  />
                </label>
                <div className={`password-meter ${password.length === 0 ? '' : passwordErrors.length === 0 ? 'strong' : 'weak'}`}>
                  <div className="password-meter-track"><span /></div>
                  <span>{password.length === 0 ? 'Dùng ít nhất 10 ký tự và 3 nhóm ký tự.' : passwordErrors[0] || 'Mật khẩu đạt yêu cầu.'}</span>
                </div>
              </>
            )}

            {error && <div className="auth-error" role="alert">{error}</div>}

            <StickerButton
              type="submit"
              variant="primary"
              size="lg"
              disabled={submitting || (mode === 'register' && passwordErrors.length > 0)}
              icon={mode === 'login' ? <LogIn size={20} /> : <UserPlus size={20} />}
              style={{ width: '100%' }}
            >
              {submitting ? 'Đang xử lý…' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
            </StickerButton>
          </form>

          <p className="auth-local-note">
            Google xác thực danh tính của bạn. Tiến trình game được lưu trong trình duyệt này.
          </p>
        </PaperPanel>
      </div>
    </div>
  );
};
