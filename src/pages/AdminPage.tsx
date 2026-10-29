import React, { useCallback, useEffect, useState } from 'react';
import { Activity, ArrowLeft, BookOpen, LayoutDashboard, RefreshCw, ShieldCheck, UsersRound } from 'lucide-react';
import { useApp } from '../app/appStore';
import { useAuth } from '../auth/AuthContext';
import { adminApi, type AuditEntry, type Metadata, type Overview } from '../admin/api';
import { AuditList, Notice, Pager, useAdminList } from '../admin/components';
import { UsersPanel } from '../admin/UsersPanel';
import { ContentPanel } from '../admin/ContentPanel';

function AuditPanel() {
  const [q, setQ] = useState(''), [page, setPage] = useState(1);
  const result = useAdminList<AuditEntry>(`/audit?${new URLSearchParams({ q, page: String(page) })}`);
  return <section className="adm-section"><div className="adm-section-heading"><div><h2>Nhật ký hoạt động</h2><p>Lưu người thực hiện, thời gian và thay đổi quyền / nội dung.</p></div></div>
    <input className="adm-audit-search" aria-label="Tìm nhật ký" placeholder="Tìm email, hành động hoặc đối tượng…" value={q} onChange={e => { setQ(e.target.value); setPage(1); }} />
    <Notice text={result.error} error />{result.loading ? <p className="adm-loading">Đang tải nhật ký…</p> : <AuditList items={result.items} />}
    <Pager page={page} total={result.total} onPage={setPage} disabled={result.loading} />
  </section>;
}

export const AdminPage: React.FC = () => {
  const { navigateTo } = useApp();
  const { account, hasPermission, refreshAccount } = useAuth();
  const [metadata, setMetadata] = useState<Metadata | null>(null), [overview, setOverview] = useState<Overview | null>(null);
  const [tab, setTab] = useState('overview'), [error, setError] = useState(''), [loading, setLoading] = useState(true), [version, setVersion] = useState(0);
  const permitted = hasPermission('admin.access');
  const load = useCallback(async () => {
    if (!permitted) { setLoading(false); return; }
    setError(''); setLoading(true);
    try {
      const [meta, next] = await Promise.all([adminApi<Metadata>('/metadata'), adminApi<Overview>('/overview')]);
      setMetadata(meta); setOverview(next);
    } catch (e) { setError(e instanceof Error ? e.message : 'Không thể tải dữ liệu quản trị.'); }
    finally { setLoading(false); }
  }, [permitted]);
  useEffect(() => { void load(); }, [load]);
  const changed = () => { void load(); };
  const refresh = () => { void refreshAccount(); void load(); setVersion(v => v + 1); };
  if (!permitted) return <div className="adm-shell"><section className="adm-section adm-access"><ShieldCheck size={38} /><h1>Trang quản trị</h1><p>{account?.authProvider === 'google' ? 'Tài khoản của bạn chưa được cấp quyền quản trị. Hãy liên hệ chủ quản trị.' : 'Hãy đăng nhập bằng Google với tài khoản được cấp quyền quản trị.'}</p><button className="adm-primary" onClick={() => navigateTo('account')}>Đến tài khoản</button></section></div>;
  const tabs = [
    { id: 'overview', label: 'Tổng quan', icon: <LayoutDashboard size={18} />, permission: 'admin.access' },
    { id: 'users', label: 'Người dùng & quyền', icon: <UsersRound size={18} />, permission: 'users.read' },
    { id: 'content', label: 'Nội dung', icon: <BookOpen size={18} />, permission: 'content.read' },
    { id: 'audit', label: 'Nhật ký', icon: <Activity size={18} />, permission: 'audit.read' },
  ].filter(t => hasPermission(t.permission));
  const activeTab = tabs.some(t => t.id === tab) ? tab : 'overview';
  return <div className="adm-shell">
    <header className="adm-header"><div><span className="adm-eyebrow">PEMPOM / ADMIN WORKSPACE</span><h1>Trung tâm quản trị<span className="adm-header-dot" /></h1><p>Quản lý cộng đồng, kiến thức và trải nghiệm học.</p></div><div className="adm-header-actions"><span className="adm-admin-chip"><ShieldCheck size={17} />{metadata?.roles[account!.role]?.label || 'Quản trị'}</span><button onClick={() => navigateTo('home')}><ArrowLeft size={16} /> Về game</button><button aria-label="Làm mới quản trị" disabled={loading} onClick={refresh}><RefreshCw size={17} /></button></div></header>
    <nav className="adm-tabs" aria-label="Mục quản trị">{tabs.map(t => <button key={t.id} aria-current={activeTab === t.id ? 'page' : undefined} className={activeTab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>{t.icon}{t.label}</button>)}</nav>
    <Notice text={error} error />
    {!metadata ? <p className="adm-loading">{loading ? 'Đang tải không gian quản trị…' : 'Chưa tải được dữ liệu. Nhấn làm mới để thử lại.'}</p> : <div key={version}>
      {activeTab === 'overview' && <>
        <div className="adm-stats">{overview?.users && <><article><UsersRound size={22} /><span>Người dùng</span><strong>{overview.users.total}</strong><small>{overview.users.active} đang hoạt động</small></article><article><ShieldCheck size={22} /><span>Quản trị viên</span><strong>{overview.users.admins}</strong><small>Gồm chủ quản trị và admin</small></article></>}{overview?.content && <><article><BookOpen size={22} /><span>Nội dung xuất bản</span><strong>{overview.content.published}</strong><small>{overview.content.total} nội dung tổng cộng</small></article><article><Activity size={22} /><span>Chờ hoàn thiện</span><strong>{overview.content.drafts}</strong><small>Bản nháp chưa công khai</small></article></>}</div>
        <div className="adm-overview-grid"><section className="adm-section"><div className="adm-section-heading"><div><h2>Bắt đầu quản lý</h2><p>Chọn công việc bạn cần thực hiện.</p></div></div><div className="adm-shortcuts">{tabs.filter(t => t.id !== 'overview').map(t => <button key={t.id} onClick={() => setTab(t.id)}>{t.icon}<span>{t.label}</span><span>→</span></button>)}</div><p className="adm-security-note">Quyền được kiểm tra trên máy chủ. Tài khoản chủ quản trị được bảo vệ khỏi việc tự khóa hoặc bị hạ quyền.</p></section>
          {hasPermission('audit.read') && <section className="adm-section"><div className="adm-section-heading"><h2>Hoạt động gần đây</h2><button onClick={() => setTab('audit')}>Xem tất cả</button></div><AuditList items={overview?.activity ?? []} /></section>}</div>
      </>}
      {activeTab === 'users' && <UsersPanel metadata={metadata} onChange={changed} />}
      {activeTab === 'content' && <ContentPanel onChange={changed} />}
      {activeTab === 'audit' && <AuditPanel />}
    </div>}
    <footer className="adm-footer"><span>pempom · Admin workspace</span><span>{account?.email}</span></footer>
  </div>;
};
