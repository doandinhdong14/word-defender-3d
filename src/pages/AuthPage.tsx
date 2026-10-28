import React, { useMemo, useState } from 'react';
import { Eye, EyeOff, KeyRound, LockKeyhole, LogIn, ShieldCheck, UserPlus } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { validatePassword } from '../auth/authService';
import { PaperPanel } from '../components/PaperPanel';
import { StickerButton } from '../components/StickerButton';
import { getAssetUrl } from '../utils/assetUrl';

type AuthMode = 'login' | 'register';

export const AuthPage: React.FC = () => {
  const { hasAccounts, login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>(hasAccounts ? 'login' : 'register');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
            Tài khoản và dữ liệu được lưu cục bộ trong trình duyệt này.
          </p>
        </PaperPanel>
      </div>
    </div>
  );
};
