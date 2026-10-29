import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { OAuth2Client } from 'google-auth-library';
import { PGlite } from '@electric-sql/pglite';
import { createStore } from './store.mjs';
import { createApp } from './app.mjs';
import { ROLES } from './permissions.mjs';

test('server admin integration with real SQL storage and Google identity boundary', async t => {
  const store = await createStore({ database: new PGlite(), ownerEmail: 'owner@example.com' });
  const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  let nonce, claims;
  const oauth = new OAuth2Client('test-client', 'test-secret');
  const oauthClient = {
    generateAuthUrl(params) { nonce = params.nonce; return oauth.generateAuthUrl(params); },
    async getToken() { return { tokens: { id_token: 'test-identity' } }; },
    async verifyIdToken() { return { getPayload: () => ({ ...claims, nonce, email_verified: true }) }; },
  };
  server.on('request', createApp({ store, oauthClient, env: { APP_URL: origin, OWNER_EMAIL: 'owner@example.com', SESSION_SECRET: 'test-secret-persistent-and-at-least-32-characters', GOOGLE_CLIENT_ID: 'test-client', GOOGLE_CLIENT_SECRET: 'test-secret' } }));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await store.close(); });
  const request = (path, cookie = '', method = 'GET', body, extra = {}) => fetch(origin + path, { method, redirect: 'manual', headers: { cookie, ...(method !== 'GET' ? { Origin: origin } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...extra }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  const login = async (id, email) => {
    claims = { sub: id, email, name: id };
    const start = await request('/api/auth/google/start');
    const flow = start.headers.get('set-cookie').split(';')[0];
    const state = new URL(start.headers.get('location')).searchParams.get('state');
    const callback = await request(`/api/auth/google/callback?code=test-code&state=${state}`, flow);
    return callback.headers.getSetCookie().find(c => c.startsWith('pempom_session='))?.split(';')[0] ?? '';
  };
  const asJson = async (...args) => { const response = await request(...args); return { status: response.status, body: await response.json() }; };
  const owner = await login('owner', 'owner@example.com');
  let player = await login('player', 'player@example.com');
  const editor = await login('editor', 'editor@example.com');

  await t.test('only configured verified owner gains ownership; ordinary users cannot enter admin', async () => {
    assert.equal((await asJson('/api/auth/session', owner)).body.account.role, 'owner');
    assert.equal((await asJson('/api/auth/session', player)).body.account.role, 'player');
    assert.equal((await asJson('/api/admin/users')).status, 401);
    assert.equal((await asJson('/api/admin/users', player)).status, 403);
    assert.equal((await asJson('/api/admin/users', owner + 'tampered')).status, 401);
    assert.equal((await asJson('/api/admin/users', owner)).body.total, 3);
    assert.equal((await asJson('/api/admin/overview', owner)).body.users.total, 3);
    assert.ok((await asJson('/api/admin/content', owner)).body.items.length >= 3);
    assert.ok((await asJson('/api/admin/metadata', owner)).body.permissions['roles.manage']);
  });
  await t.test('protects owner and self from role changes and blocks cross-origin writes', async () => {
    const target = await store.user('google:owner');
    assert.equal((await asJson('/api/admin/users/google%3Aowner', owner, 'PATCH', { updatedAt: target.updatedAt, role: 'player' })).status, 403);
    assert.equal((await asJson('/api/admin/invitations', owner, 'POST', { email: 'no@example.com', role: 'admin' }, { Origin: 'https://evil.invalid' })).status, 403);
  });
  await t.test('role changes take effect for existing sessions and editors cannot publish or change users', async () => {
    const target = await store.user('google:editor');
    assert.equal((await asJson('/api/admin/users/google%3Aeditor', owner, 'PATCH', { updatedAt: target.updatedAt, role: 'editor' })).status, 200);
    assert.equal((await asJson('/api/auth/session', editor)).body.account.role, 'editor');
    assert.equal((await asJson('/api/admin/users', editor)).status, 403);
    assert.equal((await asJson('/api/admin/content', editor, 'POST', { type: 'announcement', title: 'Editor post', body: 'Hello', status: 'published' })).status, 403);
    assert.equal((await asJson('/api/admin/content', editor, 'POST', { type: 'announcement', title: 'Editor draft', body: 'Hello', status: 'draft' })).status, 200);
  });
  await t.test('custom grants cannot escalate beyond actor permissions or assign owner', async () => {
    const limited = await login('limited', 'limited@example.com');
    const target = await store.user('google:limited');
    const perms = ['admin.access', 'users.read', 'users.manage', 'roles.manage'];
    assert.equal((await asJson('/api/admin/users/google%3Alimited', owner, 'PATCH', { updatedAt: target.updatedAt, role: 'admin', permissions: perms })).status, 200);
    assert.equal((await asJson('/api/admin/invitations', limited, 'POST', { email: 'escalate@example.com', role: 'admin' })).status, 403);
    assert.equal((await asJson('/api/admin/invitations', limited, 'POST', { email: 'escalate@example.com', role: 'owner' })).status, 400);
    assert.equal((await asJson('/api/admin/users/google%3Alimited', limited, 'PATCH', { updatedAt: (await store.user('google:limited')).updatedAt, status: 'disabled' })).status, 400);
    assert.equal((await asJson('/api/admin/audit', limited)).status, 403);
  });
  await t.test('revoke and disable invalidate old cookies; enabling does not restore revoked sessions', async () => {
    assert.equal((await asJson('/api/admin/users/google%3Aplayer/revoke-sessions', owner, 'POST')).status, 200);
    assert.equal((await asJson('/api/auth/session', player)).body.account, null);
    player = await login('player', 'player@example.com');
    assert.ok((await asJson('/api/auth/session', player)).body.account);
    let target = await store.user('google:player');
    assert.equal((await asJson('/api/admin/users/google%3Aplayer', owner, 'PATCH', { updatedAt: target.updatedAt, status: 'disabled' })).status, 200);
    assert.equal((await asJson('/api/auth/session', player)).body.account, null);
    assert.equal(await login('player', 'player@example.com'), '');
    target = await store.user('google:player');
    assert.equal((await asJson('/api/admin/users/google%3Aplayer', owner, 'PATCH', { updatedAt: target.updatedAt, status: 'active' })).status, 200);
    assert.equal((await asJson('/api/auth/session', player)).body.account, null);
  });
  await t.test('email grants apply only to a verified matching identity, can be revoked and expire', async () => {
    assert.equal((await asJson('/api/admin/invitations', owner, 'POST', { email: 'Invited@Example.com', role: 'editor' })).status, 200);
    const invited = await login('invited', 'invited@example.com');
    assert.deepEqual((await asJson('/api/auth/session', invited)).body.account.permissions, ROLES.editor.permissions);
    assert.equal((await asJson('/api/admin/invitations', owner)).body.items.length, 0);
    await asJson('/api/admin/invitations', owner, 'POST', { email: 'revoked@example.com', role: 'admin' });
    await asJson('/api/admin/invitations/revoked%40example.com', owner, 'DELETE');
    const revoked = await login('revoked', 'revoked@example.com');
    assert.equal((await asJson('/api/auth/session', revoked)).body.account.role, 'player');
    await asJson('/api/admin/invitations', owner, 'POST', { email: 'expired@example.com', role: 'admin' });
    await store.query(`UPDATE pempom_invitations SET data=jsonb_set(data,'{expiresAt}','"2000-01-01T00:00:00Z"') WHERE email=$1`, ['expired@example.com']);
    assert.equal((await asJson('/api/auth/session', await login('expired', 'expired@example.com'))).body.account.role, 'player');
  });
  await t.test('content draft, publish, revision conflicts, delete and restore control public visibility', async () => {
    const draft = { type: 'lesson', title: 'New lesson', description: 'Vocabulary', body: '', status: 'draft', words: [{ english: 'apple', vietnamese: 'quả táo' }] };
    const created = await asJson('/api/admin/content', editor, 'POST', draft);
    assert.equal(created.status, 200);
    let item = created.body.item;
    const id = item.id;
    assert.ok(!(await asJson('/api/content')).body.items.some(c => c.id === id));
    assert.equal((await asJson(`/api/admin/content/${id}`, owner, 'PUT', { ...item, status: 'published' })).status, 200);
    assert.ok((await asJson('/api/content')).body.items.some(c => c.id === id));
    assert.equal((await asJson(`/api/admin/content/${id}`, owner, 'PUT', item)).status, 409);
    item = (await asJson(`/api/admin/content/${id}`, owner)).body.item;
    assert.equal((await asJson(`/api/admin/content/${id}`, editor, 'PUT', { ...item, status: 'draft' })).status, 403);
    assert.equal((await asJson(`/api/admin/content/${id}`, owner, 'DELETE', { revision: item.revision })).status, 200);
    assert.ok(!(await asJson('/api/content')).body.items.some(c => c.id === id));
    assert.equal((await asJson(`/api/admin/content/${id}/restore`, owner, 'POST')).status, 200);
    assert.equal((await asJson(`/api/admin/content/${id}`, owner)).body.item.status, 'draft');
    assert.ok(!(await asJson('/api/content')).body.items.some(c => c.id === id));
    assert.ok(!(await asJson('/api/content')).body.items.some(c => Object.hasOwn(c, 'updatedBy')));
  });
  await t.test('validates payloads, uses bounded search and preserves SQL against injection', async () => {
    const body = { type: 'lesson', title: 'Bad lesson', status: 'published', words: [{ english: 'apple', vietnamese: 'táo' }, { english: 'APPLE', vietnamese: 'táo' }] };
    assert.equal((await asJson('/api/admin/content', owner, 'POST', body)).status, 400);
    const search = await asJson(`/api/admin/users?q=${encodeURIComponent("' OR 1=1 --")}`, owner);
    assert.equal(search.status, 200); assert.equal(search.body.total, 0);
    assert.ok((await asJson('/api/admin/users', owner)).body.total > 0);
    const audit = (await asJson('/api/admin/audit', owner)).body;
    assert.ok(audit.items.some(item => item.action.startsWith('content.')));
    assert.ok(audit.items.length <= 20);
    assert.equal(JSON.stringify(audit).includes('test-secret'), false);
  });
});
