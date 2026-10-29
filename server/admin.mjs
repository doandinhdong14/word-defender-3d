import { randomUUID } from 'node:crypto';
import express from 'express';
import { ApiError, PERMISSIONS, ROLES, requirePermission, validateGrant } from './permissions.mjs';
import { publicAccount } from './store.mjs';

const text = (value, max, label, min = 0) => {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) throw new ApiError(400, `${label} cần từ ${min} đến ${max} ký tự.`);
  return value.trim();
};
const pagination = query => {
  const page = Math.max(1, Math.min(100000, parseInt(query.page, 10) || 1));
  return { page, limit: 20, offset: (page - 1) * 20 };
};
function validateContent(input, old) {
  const type = input.type;
  if (!['lesson', 'announcement', 'event'].includes(type) || (old && type !== old.type)) throw new ApiError(400, 'Loại nội dung không hợp lệ.');
  const status = input.status;
  if (!['draft', 'published', 'archived'].includes(status)) throw new ApiError(400, 'Trạng thái nội dung không hợp lệ.');
  const result = { type, status, title: text(input.title, 120, 'Tiêu đề', 2), description: text(input.description ?? '', 500, 'Mô tả'), body: text(input.body ?? '', 10000, 'Nội dung'), words: [] };
  if (type === 'lesson') {
    if (!Array.isArray(input.words) || input.words.length > 5000) throw new ApiError(400, 'Bài học tối đa 5.000 từ.');
    if (status === 'published' && input.words.length === 0) throw new ApiError(400, 'Bài học cần có ít nhất một từ trước khi xuất bản.');
    const seen = new Set();
    result.words = input.words.map(word => {
      const english = text(word?.english, 100, 'Từ tiếng Anh', 1);
      const vietnamese = text(word?.vietnamese, 300, 'Nghĩa tiếng Việt', 1);
      const key = english.toLowerCase();
      if (seen.has(key)) throw new ApiError(400, `Từ bị trùng: ${english}`);
      seen.add(key);
      const prior = old?.words.find(w => w.english.toLowerCase() === key);
      return { ...prior, id: prior?.id ?? randomUUID(), english, vietnamese, acceptedAnswers: prior?.acceptedAnswers ?? [] };
    });
  } else if (status === 'published' && !result.body) throw new ApiError(400, 'Hãy nhập nội dung trước khi xuất bản.');
  return result;
}

export function adminRouter({ store, authenticate, origin }) {
  const router = express.Router();
  router.use(async (req, _res, next) => {
    try { req.actor = await authenticate(req); requirePermission(req.actor, 'admin.access'); next(); } catch (error) { next(error); }
  });
  router.use((req, _res, next) => {
    if (!['GET', 'HEAD'].includes(req.method) && req.headers.origin !== origin) return next(new ApiError(403, 'Nguồn yêu cầu không hợp lệ.'));
    next();
  });
  router.use(express.json({ limit: '2mb' }));
  const read = (permission, fn) => async (req, res) => { requirePermission(req.actor, permission); res.json(await fn(req)); };
  const write = (permission, fn) => async (req, res) => {
    const result = await store.transaction(async tx => {
      const actor = await tx.user(req.actor.id);
      if (!actor || actor.sessionVersion !== req.actor.sessionVersion) throw new ApiError(401, 'Phiên đăng nhập đã bị thu hồi.');
      requirePermission(actor, permission);
      return fn(req, tx, actor);
    });
    res.json(result ?? { success: true });
  };
  router.get('/metadata', read('admin.access', async () => ({ roles: ROLES, permissions: PERMISSIONS })));
  router.get('/overview', read('admin.access', async req => {
    const canUsers = req.actor.permissions.includes('users.read');
    const canContent = req.actor.permissions.includes('content.read');
    const canAudit = req.actor.permissions.includes('audit.read');
    const users = canUsers ? (await store.query(`SELECT count(*)::int AS total, count(*) FILTER (WHERE data->>'status'='active')::int AS active, count(*) FILTER (WHERE data->>'role' IN ('owner','admin'))::int AS admins FROM pempom_users`)).rows[0] : null;
    const content = canContent ? (await store.query(`SELECT count(*) FILTER(WHERE data->>'status'!='deleted')::int AS total, count(*) FILTER(WHERE data->>'status'='published')::int AS published, count(*) FILTER(WHERE data->>'status'='draft')::int AS drafts FROM pempom_content`)).rows[0] : null;
    const activity = canAudit ? (await store.query('SELECT data FROM pempom_audit ORDER BY at DESC, id DESC LIMIT 8')).rows.map(r => r.data) : [];
    return { users, content, activity };
  }));
  router.get('/users', read('users.read', async req => {
    const { page, limit, offset } = pagination(req.query);
    const q = String(req.query.q ?? '').slice(0, 120), role = String(req.query.role ?? ''), status = String(req.query.status ?? '');
    const where = `WHERE (email ILIKE $1 OR data->>'displayName' ILIKE $1) AND ($2='' OR data->>'role'=$2) AND ($3='' OR data->>'status'=$3)`;
    const args = [`%${q.replace(/[\\%_]/g, '\\$&')}%`, role, status];
    const rows = await store.query(`SELECT data FROM pempom_users ${where} ORDER BY data->>'createdAt' DESC, id LIMIT $4 OFFSET $5`, [...args, limit, offset]);
    const count = await store.query(`SELECT count(*)::int AS total FROM pempom_users ${where}`, args);
    return { items: rows.rows.map(r => publicAccount(r.data)), total: count.rows[0].total, page };
  }));
  router.patch('/users/:id', write('users.manage', async (req, tx, actor) => {
    const target = await tx.user(req.params.id);
    if (!target) throw new ApiError(404, 'Không tìm thấy người dùng.');
    if (target.role === 'owner') throw new ApiError(403, 'Không thể thay đổi chủ quản trị tại đây.');
    if (target.id === actor.id) throw new ApiError(400, 'Không thể tự sửa vai trò, quyền hoặc khóa tài khoản đang dùng.');
    if (actor.role !== 'owner' && target.permissions.some(p => !actor.permissions.includes(p))) throw new ApiError(403, 'Bạn không thể quản lý tài khoản có quyền cao hơn mình.');
    if (req.body.updatedAt !== target.updatedAt) throw new ApiError(409, 'Tài khoản vừa được cập nhật. Hãy tải lại danh sách.');
    const next = { ...target, updatedAt: new Date().toISOString() };
    if (Object.hasOwn(req.body, 'role') || Object.hasOwn(req.body, 'permissions')) {
      requirePermission(actor, 'roles.manage');
      next.role = req.body.role ?? target.role;
      next.permissions = validateGrant(actor, next.role, req.body.permissions);
    }
    if (Object.hasOwn(req.body, 'status')) {
      if (!['active', 'disabled'].includes(req.body.status)) throw new ApiError(400, 'Trạng thái không hợp lệ.');
      next.status = req.body.status;
      if (next.status !== target.status) next.sessionVersion++;
    }
    await tx.saveUser(next);
    await tx.log(actor, 'user.updated', target.id, { email: target.email, before: { role: target.role, status: target.status, permissions: target.permissions }, after: { role: next.role, status: next.status, permissions: next.permissions } });
    return { user: publicAccount(next) };
  }));
  router.post('/users/:id/revoke-sessions', write('users.manage', async (req, tx, actor) => {
    const target = await tx.user(req.params.id);
    if (!target) throw new ApiError(404, 'Không tìm thấy người dùng.');
    if (target.role === 'owner' || target.id === actor.id || (actor.role !== 'owner' && target.permissions.some(p => !actor.permissions.includes(p)))) throw new ApiError(403, 'Không thể thu hồi phiên của tài khoản này.');
    await tx.saveUser({ ...target, sessionVersion: target.sessionVersion + 1, updatedAt: new Date().toISOString() });
    await tx.log(actor, 'user.sessions_revoked', target.id, { email: target.email });
  }));
  router.get('/invitations', read('roles.manage', async () => ({ items: (await store.query('SELECT data FROM pempom_invitations ORDER BY email LIMIT 100')).rows.map(r => r.data) })));
  router.post('/invitations', write('roles.manage', async (req, tx, actor) => {
    const email = text(req.body.email, 254, 'Email', 5).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, 'Email không hợp lệ.');
    if (await tx.userByEmail(email)) throw new ApiError(409, 'Người dùng đã tồn tại. Hãy đổi quyền trong danh sách người dùng.');
    const role = req.body.role ?? 'admin';
    const permissions = validateGrant(actor, role, req.body.permissions);
    const invitation = { email, role, permissions, createdBy: actor.email, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 7 * 86400000).toISOString() };
    await tx.query('INSERT INTO pempom_invitations(email,data) VALUES($1,$2) ON CONFLICT(email) DO UPDATE SET data=$2', [email, JSON.stringify(invitation)]);
    await tx.log(actor, 'invitation.created', email, { role, permissions });
    return { invitation };
  }));
  router.delete('/invitations/:email', write('roles.manage', async (req, tx, actor) => {
    await tx.query('DELETE FROM pempom_invitations WHERE email=$1', [req.params.email.toLowerCase()]);
    await tx.log(actor, 'invitation.revoked', req.params.email.toLowerCase());
  }));
  router.get('/content', read('content.read', async req => {
    const { page, limit, offset } = pagination(req.query);
    const q = String(req.query.q ?? '').slice(0, 120), type = String(req.query.type ?? ''), status = String(req.query.status ?? '');
    const where = `WHERE data->>'title' ILIKE $1 AND ($2='' OR data->>'type'=$2) AND (($3='' AND data->>'status'!='deleted') OR data->>'status'=$3)`;
    const args = [`%${q.replace(/[\\%_]/g, '\\$&')}%`, type, status];
    const rows = await store.query(`SELECT data - 'words' - 'body' AS data FROM pempom_content ${where} ORDER BY data->>'updatedAt' DESC,id LIMIT $4 OFFSET $5`, [...args, limit, offset]);
    const count = await store.query(`SELECT count(*)::int AS total FROM pempom_content ${where}`, args);
    return { items: rows.rows.map(r => r.data), total: count.rows[0].total, page };
  }));
  router.get('/content/:id', read('content.read', async req => {
    const item = await store.content(req.params.id);
    if (!item) throw new ApiError(404, 'Không tìm thấy nội dung.');
    return { item };
  }));
  router.post('/content', write('content.write', async (req, tx, actor) => {
    const input = validateContent(req.body);
    if (input.status !== 'draft') requirePermission(actor, 'content.publish');
    const at = new Date().toISOString();
    const item = { ...input, id: `managed_${randomUUID()}`, revision: 1, createdAt: at, updatedAt: at, updatedBy: actor.email };
    await tx.saveContent(item);
    await tx.log(actor, 'content.created', item.id, { title: item.title, status: item.status, type: item.type });
    return { item };
  }));
  router.put('/content/:id', write('content.write', async (req, tx, actor) => {
    const old = await tx.content(req.params.id);
    if (!old) throw new ApiError(404, 'Không tìm thấy nội dung.');
    if (old.status === 'deleted') throw new ApiError(400, 'Hãy khôi phục nội dung trước khi chỉnh sửa.');
    if (req.body.revision !== old.revision) throw new ApiError(409, 'Nội dung đã được người khác sửa. Hãy tải lại trước khi lưu.');
    const input = validateContent(req.body, old);
    if (old.status === 'published' || input.status !== 'draft') requirePermission(actor, 'content.publish');
    const item = { ...old, ...input, revision: old.revision + 1, updatedAt: new Date().toISOString(), updatedBy: actor.email };
    await tx.saveContent(item);
    await tx.log(actor, 'content.updated', item.id, { title: item.title, before: old.status, after: item.status, revision: item.revision });
    return { item };
  }));
  router.delete('/content/:id', write('content.delete', async (req, tx, actor) => {
    const old = await tx.content(req.params.id);
    if (!old) throw new ApiError(404, 'Không tìm thấy nội dung.');
    if (old.status === 'published') requirePermission(actor, 'content.publish');
    if (req.body.revision !== old.revision) throw new ApiError(409, 'Nội dung đã thay đổi. Hãy tải lại danh sách.');
    await tx.saveContent({ ...old, status: 'deleted', revision: old.revision + 1, updatedAt: new Date().toISOString(), updatedBy: actor.email });
    await tx.log(actor, 'content.deleted', old.id, { title: old.title });
  }));
  router.post('/content/:id/restore', write('content.delete', async (req, tx, actor) => {
    const old = await tx.content(req.params.id);
    if (!old || old.status !== 'deleted') throw new ApiError(400, 'Nội dung không nằm trong thùng rác.');
    await tx.saveContent({ ...old, status: 'draft', revision: old.revision + 1, updatedAt: new Date().toISOString(), updatedBy: actor.email });
    await tx.log(actor, 'content.restored', old.id, { title: old.title });
  }));
  router.get('/audit', read('audit.read', async req => {
    const { page, limit, offset } = pagination(req.query);
    const q = `%${String(req.query.q ?? '').slice(0, 120).replace(/[\\%_]/g, '\\$&')}%`;
    const where = `WHERE (data->>'actorEmail' ILIKE $1 OR data->>'action' ILIKE $1 OR data->>'target' ILIKE $1)`;
    const rows = await store.query(`SELECT data FROM pempom_audit ${where} ORDER BY at DESC,id DESC LIMIT $2 OFFSET $3`, [q, limit, offset]);
    const count = await store.query(`SELECT count(*)::int AS total FROM pempom_audit ${where}`, [q]);
    return { items: rows.rows.map(r => r.data), total: count.rows[0].total, page };
  }));
  return router;
}
