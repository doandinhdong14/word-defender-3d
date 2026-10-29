import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { OAuth2Client } from 'google-auth-library';
import { createApp } from './app.mjs';

async function fixture(t, options = {}) {
  let timestamp = Date.now();
  let nonce;
  let exchanges = 0;
  const real = new OAuth2Client('test-client', 'test-secret');
  const oauthClient = {
    generateAuthUrl(params) { nonce = params.nonce; return real.generateAuthUrl(params); },
    async getToken(params) { exchanges++; assert.ok(params.codeVerifier); assert.equal(params.code, 'valid-code'); return { tokens: { id_token: 'verified-by-provider' } }; },
    async verifyIdToken(params) {
      assert.equal(params.audience, 'test-client');
      return { getPayload: () => ({ sub: 'stable-subject', email: 'pilot@example.com', email_verified: true, name: 'Pilot Google', nonce, ...options.claims }) };
    },
  };
  // Bind a known available port before creating the app so APP_URL stays exact.
  const { createServer } = await import('node:http');
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  server.on('request', createApp({ env: { APP_URL: origin, SESSION_SECRET: 'test-secret-with-at-least-32-characters', GOOGLE_CLIENT_ID: 'test-client', GOOGLE_CLIENT_SECRET: 'test-secret' }, oauthClient, now: () => timestamp }));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const request = (path, init = {}) => fetch(origin + path, { redirect: 'manual', ...init });
  async function start() {
    const response = await request('/api/auth/google/start');
    return { response, url: new URL(response.headers.get('location')), cookie: response.headers.get('set-cookie').split(';')[0] };
  }
  return { request, start, origin, advance(ms) { timestamp += ms; }, exchanges: () => exchanges };
}

test('Google flow uses PKCE and creates a signed HttpOnly session; logout clears it', async t => {
  const f = await fixture(t);
  const { response, url, cookie } = await f.start();
  assert.match(response.headers.get('set-cookie'), /HttpOnly/);
  assert.match(response.headers.get('set-cookie'), /SameSite=Lax/);
  assert.equal(url.origin, 'https://accounts.google.com');
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.ok(url.searchParams.get('code_challenge'));
  assert.equal(url.searchParams.get('scope'), 'openid email profile');
  assert.equal(url.searchParams.get('redirect_uri'), `${f.origin}/api/auth/google/callback`);
  const callback = await f.request(`/api/auth/google/callback?code=valid-code&state=${url.searchParams.get('state')}`, { headers: { cookie } });
  assert.equal(callback.headers.get('location'), `${f.origin}/?auth=google`);
  const session = callback.headers.getSetCookie().find(c => c.startsWith('pempom_session=')).split(';')[0];
  const identity = await (await f.request('/api/auth/session', { headers: { cookie: session } })).json();
  assert.equal(identity.account.id, 'google:stable-subject');
  assert.equal(identity.account.role, 'player');
  assert.equal(identity.account.authProvider, 'google');
  assert.equal((await f.request('/api/auth/logout', { method: 'POST', headers: { origin: 'https://attacker.example' } })).status, 403);
  const logout = await f.request('/api/auth/logout', { method: 'POST', headers: { origin: f.origin, cookie: session } });
  assert.equal(logout.status, 204);
  assert.match(logout.headers.get('set-cookie'), /Expires=Thu, 01 Jan 1970/);
  f.advance(12 * 60 * 60 * 1000 + 1);
  assert.equal((await (await f.request('/api/auth/session', { headers: { cookie: session } })).json()).account, null);
});

test('missing, mismatched, expired and tampered state cannot exchange a code', async t => {
  const f = await fixture(t);
  const { url, cookie } = await f.start();
  for (const headers of [{}, { cookie }, { cookie: cookie + 'tampered' }]) {
    const response = await f.request('/api/auth/google/callback?code=valid-code&state=wrong', { headers });
    assert.match(response.headers.get('location'), /auth_error=invalid_state$/);
  }
  f.advance(11 * 60 * 1000);
  const expired = await f.request(`/api/auth/google/callback?code=valid-code&state=${url.searchParams.get('state')}`, { headers: { cookie } });
  assert.match(expired.headers.get('location'), /auth_error=invalid_state$/);
  assert.equal(f.exchanges(), 0);
});

test('denied consent returns a recoverable error without a session', async t => {
  const f = await fixture(t);
  const { url, cookie } = await f.start();
  const response = await f.request(`/api/auth/google/callback?error=access_denied&state=${url.searchParams.get('state')}`, { headers: { cookie } });
  assert.match(response.headers.get('location'), /auth_error=cancelled$/);
  assert.equal(f.exchanges(), 0);
});

for (const claims of [{ nonce: 'wrong-nonce' }, { email_verified: false }]) {
  test(`rejects untrusted identity claims: ${JSON.stringify(claims)}`, async t => {
    const f = await fixture(t, { claims });
    const { url, cookie } = await f.start();
    const response = await f.request(`/api/auth/google/callback?code=valid-code&state=${url.searchParams.get('state')}`, { headers: { cookie } });
    assert.match(response.headers.get('location'), /auth_error=google_failed$/);
    assert.ok(!response.headers.getSetCookie().some(c => c.startsWith('pempom_session=')));
  });
}

test('invalid session signatures return no identity and unknown API routes return JSON', async t => {
  const f = await fixture(t);
  const response = await f.request('/api/auth/session', { headers: { cookie: 'pempom_session=forged.signature' } });
  assert.deepEqual(await response.json(), { account: null });
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal((await f.request('/api/missing')).status, 404);
});

test('production refuses insecure or missing persistent configuration', () => {
  assert.throws(() => createApp({ env: { NODE_ENV: 'production' } }), /Production requires/);
});
