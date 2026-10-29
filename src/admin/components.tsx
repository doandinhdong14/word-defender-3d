import React, { useCallback, useEffect, useState } from 'react';
import { adminApi, actionLabels, type AuditEntry, type PageResult, type Metadata } from './api';

export function useAdminList<T>(path: string) {
  const [data, setData] = useState<PageResult<T>>({ items: [], total: 0, page: 1 });
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion(v => v + 1), []);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    const timer = window.setTimeout(() => {
      adminApi<PageResult<T>>(path).then(result => { if (active) setData(result); })
        .catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    }, 180);
    return () => { active = false; window.clearTimeout(timer); };
  }, [path, version]);
  return { ...data, loading, error, reload };
}

export function Pager({ page, total, onPage, disabled = false }: { page: number; total: number; onPage: (p: number) => void; disabled?: boolean }) {
  const pages = Math.max(1, Math.ceil(total / 20));
  return <div className="adm-pager"><span>{total} kết quả · Trang {page}/{pages}</span><div>
    <button type="button" disabled={disabled || page <= 1} onClick={() => onPage(page - 1)}>Trước</button>
    <button type="button" disabled={disabled || page >= pages} onClick={() => onPage(page + 1)}>Sau</button>
  </div></div>;
}

export function PermissionPicker({ metadata, value, onChange, allowed, disabled }: { metadata: Metadata; value: string[]; onChange: (p: string[]) => void; allowed: string[]; disabled?: boolean }) {
  return <fieldset className="adm-permissions" disabled={disabled}><legend>Quyền chi tiết</legend>{Object.entries(metadata.permissions).map(([key, label]) =>
    <label key={key}><input type="checkbox" checked={value.includes(key)} disabled={!allowed.includes(key)} onChange={e => onChange(e.target.checked ? [...value, key] : value.filter(p => p !== key))} /><span>{label}</span></label>
  )}</fieldset>;
}

export function AuditList({ items }: { items: AuditEntry[] }) {
  return <div className="adm-audit-list">{items.length === 0 ? <p className="adm-empty">Chưa có hoạt động.</p> : items.map(item => <article key={item.id}>
    <div className="adm-activity-dot" /><div><strong>{actionLabels[item.action] || item.action}</strong><p>{item.actorEmail}</p><small>{item.target}</small>
      {Object.keys(item.detail).length > 0 && <details><summary>Chi tiết thay đổi</summary><pre>{JSON.stringify(item.detail, null, 2)}</pre></details>}
    </div><time dateTime={item.at}>{new Date(item.at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</time>
  </article>)}</div>;
}

export function Notice({ text, error = false }: { text: string; error?: boolean }) {
  return text ? <p className={`adm-notice ${error ? 'error' : ''}`} role={error ? 'alert' : 'status'}>{text}</p> : null;
}
