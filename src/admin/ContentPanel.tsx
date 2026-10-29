import React, { useState } from 'react';
import { BookOpen, Copy, FilePlus2, Search, Trash2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { adminApi, type ManagedContent } from './api';
import { Notice, Pager, useAdminList } from './components';

export const typeLabels = { lesson: 'Bài học', announcement: 'Thông báo', event: 'Sự kiện' };
export const statusLabels = { draft: 'Bản nháp', published: 'Đã xuất bản', archived: 'Lưu trữ', deleted: 'Thùng rác' };
export function ContentPanel({ onChange }: { onChange: () => void }) {
  const { hasPermission } = useAuth();
  const [q, setQ] = useState(''), [type, setType] = useState(''), [status, setStatus] = useState(''), [page, setPage] = useState(1);
  const result = useAdminList<ManagedContent>(`/content?${new URLSearchParams({ q, type, status, page: String(page) })}`);
  const [editing, setEditing] = useState<ManagedContent | null>(null), [wordText, setWordText] = useState('');
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [preview, setPreview] = useState(false);
  const canWrite = hasPermission('content.write'), canPublish = hasPermission('content.publish'), canDelete = hasPermission('content.delete');
  const readOnly = !canWrite || Boolean(editing?.status === 'published' && !canPublish);
  const mutate = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true); setError(''); setMessage('');
    try { await action(); setMessage(success); setEditing(null); result.reload(); onChange(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Chưa lưu được nội dung.'); }
    finally { setBusy(false); }
  };
  const open = async (id?: string, duplicate = false) => {
    setError(''); setMessage(''); setPreview(false); setBusy(true);
    try {
      const item = id ? (await adminApi<{ item: ManagedContent }>(`/content/${encodeURIComponent(id)}`)).item : { id: '', type: 'lesson' as const, title: '', description: '', body: '', words: [], status: 'draft' as const, revision: 0, createdAt: '', updatedAt: '', updatedBy: '' };
      setEditing(duplicate ? { ...item, id: '', title: `${item.title.slice(0, 100)} (bản sao)`, status: 'draft', revision: 0 } : item);
      setWordText(item.words.map(w => `${w.english} | ${w.vietnamese}`).join('\n'));
    } catch (e) { setError(e instanceof Error ? e.message : 'Không thể mở nội dung.'); }
    finally { setBusy(false); }
  };
  const save = () => {
    if (!editing) return;
    let words: { english: string; vietnamese: string }[] = [];
    if (editing.type === 'lesson') {
      try { words = wordText.split(/\r?\n/).filter(line => line.trim()).map((line, index) => {
        const separator = line.includes('\t') ? '\t' : '|';
        const parts = line.split(separator);
        if (parts.length < 2 || !parts[0].trim() || !parts.slice(1).join(separator).trim()) throw new Error(`Dòng ${index + 1}: dùng định dạng english | tiếng Việt.`);
        return { english: parts[0].trim(), vietnamese: parts.slice(1).join(separator).trim() };
      }); } catch (e) { setError((e as Error).message); return; }
    }
    if (editing.status === 'published' && !window.confirm('Xuất bản thay đổi này cho tất cả người chơi?')) return;
    void mutate(() => adminApi(editing.id ? `/content/${encodeURIComponent(editing.id)}` : '/content', editing.id ? 'PUT' : 'POST', { ...editing, words }), editing.status === 'published' ? 'Đã xuất bản nội dung.' : 'Đã lưu nội dung.');
  };
  const wordCount = wordText.split(/\r?\n/).filter(s => s.trim()).length;
  return <section className="adm-section">
    <div className="adm-section-heading"><div><h2>Nội dung</h2><p>Bài học, thông báo và sự kiện xuất bản sẽ xuất hiện trong game.</p></div>{canWrite && <button className="adm-primary" disabled={busy} onClick={() => void open()}><FilePlus2 size={17} /> Tạo nội dung</button>}</div>
    <Notice text={error || result.error} error /><Notice text={message} />
    <div className="adm-filters"><label className="adm-search"><Search size={17} /><input aria-label="Tìm nội dung" placeholder="Tìm tiêu đề…" value={q} onChange={e => { setQ(e.target.value); setPage(1); }} /></label>
      <select aria-label="Lọc loại nội dung" value={type} onChange={e => { setType(e.target.value); setPage(1); }}><option value="">Mọi loại nội dung</option>{Object.entries(typeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
      <select aria-label="Lọc trạng thái nội dung" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">Mọi trạng thái</option>{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
    </div>
    <div className="adm-content-list" aria-busy={result.loading}>{result.items.map(item => <article key={item.id}>
      <span className="adm-content-icon"><BookOpen size={23} /></span><div className="adm-content-summary"><div><span className="adm-eyebrow">{typeLabels[item.type]}</span><span className={`adm-badge ${item.status}`}>{statusLabels[item.status]}</span></div><h3>{item.title}</h3><p>{item.description || 'Chưa có mô tả.'}</p><small>{item.updatedBy} · {new Date(item.updatedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} · v{item.revision}</small></div>
      <div className="adm-row-actions">{item.status === 'deleted' ? canDelete && <button disabled={busy} onClick={() => void mutate(() => adminApi(`/content/${encodeURIComponent(item.id)}/restore`, 'POST'), 'Đã khôi phục thành bản nháp.')}>Khôi phục</button> : <>
        <button disabled={busy} onClick={() => void open(item.id)}>{canWrite ? 'Mở / chỉnh sửa' : 'Xem nội dung'}</button>
        {canWrite && <button title="Nhân bản thành bản nháp" aria-label={`Nhân bản ${item.title}`} disabled={busy} onClick={() => void open(item.id, true)}><Copy size={16} /></button>}
        {canDelete && (item.status !== 'published' || canPublish) && <button className="adm-danger" aria-label={`Xóa ${item.title}`} disabled={busy} onClick={() => { if (window.confirm(`Chuyển "${item.title}" vào thùng rác?`)) void mutate(() => adminApi(`/content/${encodeURIComponent(item.id)}`, 'DELETE', { revision: item.revision }), 'Đã chuyển vào thùng rác.'); }}><Trash2 size={16} /></button>}
      </>}</div>
    </article>)}{!result.loading && !result.items.length && <p className="adm-empty">Không có nội dung phù hợp.</p>}{result.loading && <p className="adm-loading">Đang tải nội dung…</p>}</div>
    <Pager page={page} total={result.total} onPage={setPage} disabled={result.loading} />
    {editing && <form className="adm-editor" onSubmit={e => { e.preventDefault(); save(); }}>
      <div className="adm-section-heading"><div><h3>{editing.id ? 'Chi tiết nội dung' : 'Tạo nội dung mới'}</h3><p>{editing.id ? `Phiên bản ${editing.revision}` : 'Bắt đầu từ một bản nháp.'}</p></div><button type="button" disabled={busy} onClick={() => { if (readOnly || window.confirm('Đóng trình soạn thảo? Thay đổi chưa lưu sẽ mất.')) setEditing(null); }}>Đóng</button></div>
      {readOnly && <Notice text="Bạn có thể xem nội dung này. Để sửa nội dung đã xuất bản cần quyền xuất bản; bạn cũng có thể nhân bản thành bản nháp." />}
      <fieldset className="adm-editor-fields" disabled={busy || readOnly}>
        <div className="adm-form-row"><label>Loại nội dung<select disabled={Boolean(editing.id)} value={editing.type} onChange={e => setEditing({ ...editing, type: e.target.value as ManagedContent['type'] })}>{Object.entries(typeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label>Trạng thái<select value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value as ManagedContent['status'] })}><option value="draft">Bản nháp</option>{canPublish && <><option value="published">Đã xuất bản</option><option value="archived">Lưu trữ</option></>}</select></label></div>
        <label>Tiêu đề<input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} minLength={2} maxLength={120} required /></label>
        <label>Mô tả ngắn<textarea value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} maxLength={500} rows={2} /></label>
        {editing.type === 'lesson' ? <label>Từ vựng · {wordCount}/5.000 từ<span className="adm-help">Mỗi dòng: english | nghĩa tiếng Việt. Có thể dán hai cột từ Excel (phân cách bằng Tab).</span><textarea className="adm-word-editor" aria-label="Từ vựng bài học" value={wordText} onChange={e => setWordText(e.target.value)} rows={12} placeholder={'apple | quả táo\nbook | quyển sách'} /></label>
          : <label>Nội dung chi tiết<textarea value={editing.body} onChange={e => setEditing({ ...editing, body: e.target.value })} maxLength={10000} rows={9} placeholder="Viết nội dung để người chơi đọc…" /></label>}
      </fieldset>
      <div className="adm-actions"><button className="adm-primary" type="submit" disabled={busy || readOnly}>{busy ? 'Đang lưu…' : editing.status === 'published' ? 'Lưu & xuất bản' : 'Lưu nội dung'}</button><button type="button" onClick={() => setPreview(!preview)}>{preview ? 'Ẩn xem trước' : 'Xem trước'}</button></div>
      {preview && <article className="adm-preview"><span className="adm-eyebrow">XEM TRƯỚC · {typeLabels[editing.type]}</span><h2>{editing.title || 'Tiêu đề nội dung'}</h2><p>{editing.description}</p><div className="adm-preformatted">{editing.type === 'lesson' ? wordText : editing.body}</div></article>}
    </form>}
  </section>;
}
