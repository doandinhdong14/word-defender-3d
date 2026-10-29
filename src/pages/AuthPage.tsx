import React, { useEffect, useState } from 'react';
import { useApp } from '../app/appStore';
import { PaperPanel } from '../components/PaperPanel';

const googleErrors: Record<string, string> = {
  cancelled: 'Bạn đã hủy đăng nhập Google. Bạn có thể thử lại bất cứ lúc nào.',
  invalid_state: 'Phiên đăng nhập Google đã hết hạn hoặc không hợp lệ. Hãy thử lại.',
  not_configured: 'Đăng nhập Google chưa được cấu hình. Vui lòng thử lại sau.',
  google_failed: 'Chưa đăng nhập được bằng Google. Vui lòng thử lại.',
  account_disabled: 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.',
};

export const AuthPage: React.FC = () => {
  const { navigateTo } = useApp();
  const [error] = useState<string | null>(() => {
    const code = new URLSearchParams(window.location.search).get('auth_error');
    return code ? googleErrors[code] || googleErrors.google_failed : null;
  });
  const [googleEnabled, setGoogleEnabled] = useState<boolean | null>(null);
  const [googleStarting, setGoogleStarting] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setGoogleEnabled(null);
    fetch('/api/auth/config', { signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(config => { if (!controller.signal.aborted) setGoogleEnabled(config?.googleEnabled === true); })
      .catch(() => { if (!controller.signal.aborted) setGoogleEnabled(false); });
    const url = new URL(window.location.href);
    if (url.searchParams.has('auth_error')) {
      url.searchParams.delete('auth_error');
      window.history.replaceState(null, '', url);
    }
    return () => controller.abort();
  }, [retry]);

  return (
    <div className="auth-shell notebook-grid-bg">
      <div className="auth-layout">
        <section className="auth-intro" aria-labelledby="auth-title">
          <h1 id="auth-title">Tài khoản</h1>
        </section>
        <PaperPanel className="auth-card google-only-auth">
          <h2>Đăng nhập bằng Google</h2>
          <p>Đăng nhập để dùng thêm tướng, map, bộ từ, nhập tài liệu và nhận phần thưởng.</p>
          <div className="auth-google-section">
            <button type="button" className="auth-google-button" disabled={!googleEnabled || googleStarting} onClick={() => {
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
          </div>
          {error && <div className="auth-error" role="alert">{error}</div>}
          {googleEnabled === null && <p role="status">Đang kiểm tra kết nối Google…</p>}
          {googleEnabled === false && (
            <div className="notice">
              <p>Đăng nhập Google tạm thời chưa khả dụng. Bạn vẫn có thể chơi miễn phí.</p>
              <button className="text-button" onClick={() => setRetry(value => value + 1)}>Thử kết nối lại</button>
            </div>
          )}
          <p className="auth-local-note">Chơi miễn phí với bộ từ, tướng và map cơ bản. Tiến trình và phần thưởng của tài khoản được lưu trên trình duyệt này.</p>
          <button className="secondary-button" onClick={() => navigateTo('prepare')}>Chơi miễn phí không cần đăng nhập</button>
        </PaperPanel>
      </div>
    </div>
  );
};
