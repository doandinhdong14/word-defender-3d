import React, { useState } from 'react';
import { useApp } from '../app/appStore';
import { db } from '../data/db';
import { exportBackupData, importBackupData } from '../data/backup';
import { PaperPanel } from '../components/PaperPanel';
import { StickerButton } from '../components/StickerButton';
import { ArrowLeft, Download, Upload, Trash2, Volume2, VolumeX, Eye, Sparkles, Coins, KeyRound, LogOut, ShieldCheck } from 'lucide-react';
import { changePassword, getSettingsId } from '../auth/authService';
import { useAuth } from '../auth/AuthContext';

export const SettingsPage: React.FC = () => {
  const { navigateTo, settings, refreshUserData, addTestCoins, wallet } = useApp();
  const { account, isAdmin, logout, refreshAccount } = useAuth();
  const [audioEnabled, setAudioEnabled] = useState(settings?.audioEnabled ?? true);
  const [reduceMotion, setReduceMotion] = useState(settings?.reduceMotion ?? false);
  const [msg, setMsg] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const saveSettings = async (audio: boolean, motion: boolean) => {
    setAudioEnabled(audio);
    setReduceMotion(motion);
    await db.settings.put({
      id: getSettingsId(account?.id),
      audioEnabled: audio,
      volume: 0.8,
      reduceMotion: motion,
      fontSize: 'normal',
      desktopReminderDismissed: false,
    });
    await refreshUserData();
    showMsg('Đã lưu cài đặt!');
  };

  const showMsg = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(null), 3000);
  };

  const handleExport = async () => {
    try {
      const json = await exportBackupData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pempom_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showMsg('Xuất file sao lưu thành công!');
    } catch (e: any) {
      showMsg('Lỗi xuất file: ' + e?.message);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const text = await file.text();
        await importBackupData(text);
        await refreshUserData();
        showMsg('Đã khôi phục dữ liệu sao lưu thành công!');
      } catch (err: any) {
        showMsg('Lỗi phục hồi: ' + err?.message);
      }
    }
  };

  const handleReset = async () => {
    if (window.confirm('CẢNH BÁO: Bạn có chắc chắn muốn xóa toàn bộ tiến trình học, điểm và xu?')) {
      if (window.confirm('Xác nhận lần 2: Hành động này KHÔNG THỂ HOÀN TÁC. Bạn có chắc không?')) {
        await db.delete();
        window.location.reload();
      }
    }
  };

  const handlePasswordChange = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      showMsg('Mật khẩu xác nhận chưa khớp.');
      return;
    }
    setChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await refreshAccount();
    } catch (caught) {
      showMsg(caught instanceof Error ? caught.message : 'Không thể đổi mật khẩu.');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div
      className="notebook-grid-bg app-page"
      style={{
        minHeight: '100vh',
        padding: '30px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div style={{ width: '100%', maxWidth: '700px' }}>
        <div style={{ marginBottom: '20px' }}>
          <StickerButton onClick={() => navigateTo('home')} icon={<ArrowLeft size={18} />}>
            Trang Chủ
          </StickerButton>
        </div>

        <PaperPanel>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 900, marginBottom: '6px' }}>
            Cài Đặt Trò Chơi
          </h1>
          <p style={{ color: 'var(--color-muted-ink)', marginBottom: '24px' }}>
            Quản lý âm thanh, giao diện và dữ liệu sao lưu cục bộ trên trình duyệt.
          </p>

          {msg && (
            <div
              style={{
                padding: '10px 16px',
                backgroundColor: '#E8F5E9',
                border: '1.5px solid #2E7D32',
                borderRadius: 'var(--radius-sm)',
                color: '#1B5E20',
                fontWeight: 700,
                marginBottom: '16px',
              }}
            >
              {msg}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="settings-account-card">
              <div className="settings-account-summary">
                <span className="settings-account-avatar">{account?.displayName.charAt(0).toLocaleUpperCase('vi-VN')}</span>
                <div>
                  <strong>{account?.displayName}</strong>
                  <span>{account?.email}</span>
                  <em><ShieldCheck size={13} /> {isAdmin ? 'Quản trị viên' : 'Người chơi'}</em>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {isAdmin && (
                  <StickerButton size="sm" variant="mint" onClick={() => navigateTo('admin')} icon={<ShieldCheck size={15} />}>
                    Quản lý người dùng
                  </StickerButton>
                )}
                <StickerButton size="sm" variant="danger" onClick={() => void logout()} icon={<LogOut size={15} />}>
                  Đăng xuất
                </StickerButton>
              </div>
            </div>

            {account?.authProvider === 'google' ? <p>Bạn đăng nhập bằng Google. Quản lý mật khẩu tại <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer">Tài khoản Google</a>.</p> : <form className="settings-password-form" onSubmit={handlePasswordChange}>
              <div>
                <div className="settings-section-label"><KeyRound size={18} /> Đổi mật khẩu</div>
                <p>Mật khẩu mới cần ít nhất 10 ký tự và kết hợp 3 nhóm ký tự.</p>
              </div>
              <div className="settings-password-grid">
                <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" placeholder="Mật khẩu hiện tại" required />
                <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" placeholder="Mật khẩu mới" minLength={10} maxLength={128} required />
                <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" placeholder="Nhập lại mật khẩu mới" minLength={10} maxLength={128} required />
              </div>
              <StickerButton size="sm" type="submit" disabled={changingPassword}>
                {changingPassword ? 'Đang đổi…' : 'Cập nhật mật khẩu'}
              </StickerButton>
            </form>}

            <div style={{ height: '1px', backgroundColor: 'var(--color-grid)' }} />

            {/* Audio Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {audioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                  <span>Âm Thanh Trận Đấu & Phát Âm Từ</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-muted-ink)' }}>
                  Bật hiệu ứng âm thanh bắn đạn, quái nổ và phát âm tiếng Anh
                </div>
              </div>
              <StickerButton
                size="sm"
                variant={audioEnabled ? 'primary' : 'default'}
                onClick={() => saveSettings(!audioEnabled, reduceMotion)}
              >
                {audioEnabled ? 'Đang Bật' : 'Đang Tắt'}
              </StickerButton>
            </div>

            <div style={{ height: '1px', backgroundColor: 'var(--color-grid)' }} />

            {/* Reduce Motion */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Eye size={18} />
                  <span>Giảm Chuyển Động (Reduce Motion)</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-muted-ink)' }}>
                  Hạn chế các hiệu ứng rung giật màn hình và pháo giấy
                </div>
              </div>
              <StickerButton
                size="sm"
                variant={reduceMotion ? 'primary' : 'default'}
                onClick={() => saveSettings(audioEnabled, !reduceMotion)}
              >
                {reduceMotion ? 'Đang Bật' : 'Đang Tắt'}
              </StickerButton>
            </div>

            {isAdmin && <>
              <div style={{ height: '1px', backgroundColor: 'var(--color-grid)' }} />

              {/* Backup & Restore */}
              <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: '4px' }}>
                Sao Lưu & Phục Hồi Dữ Liệu
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-muted-ink)', marginBottom: '12px' }}>
                Xuất file JSON để lưu giữ toàn bộ tiến trình học, ví xu và tủ đồ trên máy tính của bạn.
              </p>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <StickerButton size="sm" onClick={handleExport} icon={<Download size={16} />}>
                  Xuất File Sao Lưu (.json)
                </StickerButton>

                <label style={{ display: 'inline-block' }}>
                  <StickerButton
                    size="sm"
                    variant="mint"
                    icon={<Upload size={16} />}
                    onClick={() => document.getElementById('backup-upload')?.click()}
                  >
                    Nhập File Sao Lưu
                  </StickerButton>
                  <input
                    id="backup-upload"
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
              </div>

              <div style={{ height: '1px', backgroundColor: 'var(--color-grid)' }} />

            {/* Test Mode / Developer Tools */}
              <div
              style={{
                backgroundColor: '#FFFBEB',
                border: '1.5px dashed #D97706',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
              }}
            >
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#92400E', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Sparkles size={18} color="#D97706" />
                <span>Chế Độ Thử Nghiệm & Kiểm Thử (Test Mode)</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#78350F', marginBottom: '12px' }}>
                Số dư hiện tại: <strong>{(wallet?.balance || 0).toLocaleString()} xu</strong>. Bạn có thể nạp thêm 99,999 xu bất cứ lúc nào để thoải mái mua tướng, skin và test tính năng.
              </p>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <StickerButton
                  size="sm"
                  variant="accent"
                  onClick={async () => {
                    await addTestCoins(99999);
                    showMsg('Đã nạp thành công 99,999 xu vào tài khoản!');
                  }}
                  icon={<Coins size={16} />}
                >
                  Nạp +99.999 Xu Test
                </StickerButton>
              </div>
              </div>

              <div style={{ height: '1px', backgroundColor: 'var(--color-grid)' }} />

            {/* Reset Data */}
              <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--color-danger)', marginBottom: '4px' }}>
                Xóa Toàn Bộ Dữ Liệu Cục Bộ
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-muted-ink)', marginBottom: '12px' }}>
                Đặt lại toàn bộ tiến trình về trạng thái ban đầu (nhận lại 99,999 xu khởi đầu ở chế độ test).
              </p>

              <StickerButton variant="danger" size="sm" onClick={handleReset} icon={<Trash2 size={16} />}>
                Xóa Tiến Trình & Reset Trò Chơi
              </StickerButton>
              </div>
            </>}
          </div>
        </PaperPanel>
      </div>
    </div>
  );
};
