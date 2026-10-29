import React, { useEffect, useState } from 'react';
import { Search, ShieldCheck, UserPlus } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import type { UserRole } from '../auth/types';
import { adminApi, type AdminUser, type Invitation, type Metadata } from './api';
import { Notice, Pager, PermissionPicker, useAdminList } from './components';

export function UsersPanel({ metadata, onChange }: { metadata: Metadata; onChange: () => void }) {
  const { account, hasPermission } = useAuth();
  const [q, setQ] = useState(''), [roleFilter, setRoleFilter] = useState(''), [statusFilter, setStatusFilter] = useState(''), [page, setPage] = useState(1);
  const result = useAdminList<AdminUser>(`/users?${new URLSearchParams({ q, role: roleFilter, status: statusFilter, page: String(page) })}`);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [role, setRole] = useState<UserRole>('player'), [permissions, setPermissions] = useState<string[]>([]), [status, setStatus] = useState('active');
  const [message, setMessage] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [inviteEmail, setInviteEmail] = useState(''), [inviteRole, setInviteRole] = useState<UserRole>('admin'), [invites, setInvites] = useState<Invitation[]>([]);
  const canRoles = hasPermission('roles.manage'), canManage = hasPermission('users.manage');
  const allowed = account?.permissions ?? [];
  const loadInvites = () => { if (canRoles) void adminApi<{ items: Invitation[] }>('/invitations').then(r => setInvites(r.items)).catch(e => setError(e.message)); };
  useEffect(loadInvites, [canRoles]);
  const mutate = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true); setError(''); setMessage('');
    try { await fn(); setMessage(success); setSelected(null); result.reload(); loadInvites(); onChange(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Chưa lưu được thay đổi.'); }
    finally { setBusy(false); }
  };
  const edit = (user: AdminUser) => { setSelected(user); setRole(user.role); setPermissions(user.permissions); setStatus(user.status); setError(''); setMessage(''); };
  return <section className="adm-section">
    <div className="adm-section-heading"><div><h2>Người dùng</h2><p>Tài khoản Google đã đăng nhập vào hệ thống. Quyền thay đổi có hiệu lực ngay trên server.</p></div><span className="adm-count">{result.total} tài khoản</span></div>
    <Notice text={error || result.error} error /><Notice text={message} />
    <div className="adm-filters"><label className="adm-search"><Search size={17} /><input aria-label="Tìm người dùng" placeholder="Tìm tên hoặc email…" value={q} onChange={e => { setQ(e.target.value); setPage(1); }} /></label>
      <select aria-label="Lọc vai trò" value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}><option value="">Mọi vai trò</option>{Object.entries(metadata.roles).map(([key, r]) => <option key={key} value={key}>{r.label}</option>)}</select>
      <select aria-label="Lọc trạng thái tài khoản" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}><option value="">Mọi trạng thái</option><option value="active">Hoạt động</option><option value="disabled">Đã khóa</option></select>
    </div>
    <div className="adm-table-wrap" aria-busy={result.loading}><table className="adm-table"><thead><tr><th>Người dùng</th><th>Vai trò</th><th>Trạng thái</th><th>Đăng nhập gần nhất</th><th>Thao tác</th></tr></thead><tbody>
      {result.items.map(user => <tr key={user.id}><td><div className="adm-person"><span>{user.displayName[0]?.toUpperCase()}</span><div><strong>{user.displayName} {user.id === account?.id && <small>(Bạn)</small>}</strong><small>{user.email}</small></div></div></td>
        <td><span className={`adm-badge ${user.role}`}>{metadata.roles[user.role]?.label}</span><small className="adm-block">{user.permissions.length} quyền</small></td>
        <td><span className={`adm-badge ${user.status}`}>{user.status === 'active' ? 'Hoạt động' : 'Đã khóa'}</span></td>
        <td>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—'}</td>
        <td><button disabled={!canManage || busy || user.role === 'owner' || user.id === account?.id || (account?.role !== 'owner' && user.permissions.some(p => !allowed.includes(p)))} onClick={() => edit(user)}>Quản lý</button></td></tr>)}
    </tbody></table>{!result.loading && result.items.length === 0 && <p className="adm-empty">Không có tài khoản phù hợp.</p>}{result.loading && <p className="adm-loading">Đang tải người dùng…</p>}</div>
    <Pager page={page} total={result.total} onPage={setPage} disabled={result.loading} />
    {selected && <form className="adm-editor" onSubmit={e => { e.preventDefault(); if (window.confirm(`Lưu thay đổi quyền và trạng thái cho ${selected.email}?`)) void mutate(() => adminApi(`/users/${encodeURIComponent(selected.id)}`, 'PATCH', { updatedAt: selected.updatedAt, status, ...(canRoles ? { role, permissions } : {}) }), 'Đã cập nhật người dùng.'); }}>
      <div className="adm-section-heading"><div><h3>Quản lý {selected.displayName}</h3><p>{selected.email}</p></div><button type="button" disabled={busy} onClick={() => setSelected(null)}>Đóng</button></div>
      <div className="adm-form-row"><label>Vai trò<select value={role} disabled={!canRoles || busy} onChange={e => { const next = e.target.value as UserRole; setRole(next); setPermissions(metadata.roles[next].permissions); }}>{Object.entries(metadata.roles).filter(([key]) => key !== 'owner').map(([key, r]) => <option key={key} value={key}>{r.label}</option>)}</select></label>
        <label>Trạng thái<select value={status} disabled={busy} onChange={e => setStatus(e.target.value)}><option value="active">Hoạt động</option><option value="disabled">Đã khóa</option></select></label></div>
      <PermissionPicker metadata={metadata} value={permissions} onChange={setPermissions} allowed={allowed} disabled={!canRoles || busy} />
      <div className="adm-actions"><button className="adm-primary" disabled={busy} type="submit"><ShieldCheck size={16} />{busy ? 'Đang lưu…' : 'Lưu quyền & trạng thái'}</button>
        <button type="button" className="adm-danger" disabled={busy} onClick={() => { if (window.confirm(`Đăng xuất ${selected.email} khỏi tất cả thiết bị?`)) void mutate(() => adminApi(`/users/${encodeURIComponent(selected.id)}/revoke-sessions`, 'POST'), 'Đã thu hồi tất cả phiên đăng nhập.'); }}>Thu hồi mọi phiên đăng nhập</button></div>
    </form>}
    {canRoles && <section className="adm-invitations"><h3><UserPlus size={19} /> Cấp quyền theo email</h3><p>Dành cho người chưa đăng nhập lần đầu. Quyền có hiệu lực khi họ đăng nhập Google bằng đúng email trong 7 ngày. Hãy tự gửi đường dẫn website cho họ.</p>
      <form className="adm-form-row" onSubmit={e => { e.preventDefault(); void mutate(async () => { await adminApi('/invitations', 'POST', { email: inviteEmail, role: inviteRole }); setInviteEmail(''); }, 'Đã lưu quyền chờ.'); }}>
        <label>Email Google<input type="email" required maxLength={254} placeholder="nguoidung@gmail.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} /></label>
        <label>Vai trò<select value={inviteRole} onChange={e => setInviteRole(e.target.value as UserRole)}>{Object.entries(metadata.roles).filter(([key, r]) => key !== 'owner' && r.permissions.every(p => allowed.includes(p))).map(([key, r]) => <option key={key} value={key}>{r.label}</option>)}</select></label>
        <button className="adm-primary" disabled={busy} type="submit">Cấp quyền chờ</button>
      </form>
      {invites.map(invite => <div className="adm-invite" key={invite.email}><div><strong>{invite.email}</strong><small>{metadata.roles[invite.role].label} · Hết hạn {new Date(invite.expiresAt).toLocaleDateString('vi-VN')}</small></div><button disabled={busy} onClick={() => { if (window.confirm(`Hủy quyền chờ của ${invite.email}?`)) void mutate(() => adminApi(`/invitations/${encodeURIComponent(invite.email)}`, 'DELETE'), 'Đã hủy quyền chờ.'); }}>Hủy</button></div>)}
    </section>}
  </section>;
}
