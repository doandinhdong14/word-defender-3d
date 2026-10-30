import express from 'express';
import { createHmac, randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { OAuth2Client } from 'google-auth-library';
import { adminRouter } from './admin.mjs';
import { paymentsRouter } from './payments.mjs';
import { ApiError } from './permissions.mjs';
import { publicAccount } from './store.mjs';

const SESSION_MS = 12 * 60 * 60 * 1000;
const FLOW_MS = 10 * 60 * 1000;

export function createApp({ env = process.env, oauthClient, payOSClient, now = Date.now, store } = {}) {
  const app = express();
  app.disable('x-powered-by');
  const production = env.NODE_ENV === 'production';
  const origin = new URL(env.APP_URL || 'http://127.0.0.1:5173').origin;
  if (production && (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32 || !env.APP_URL?.startsWith('https://'))) {
    throw new Error('Production requires HTTPS APP_URL and SESSION_SECRET (at least 32 characters).');
  }
  if (!store) throw new Error('A persistent user/content store is required.');
  const secret = env.SESSION_SECRET || randomBytes(48).toString('base64url');
  const secure = origin.startsWith('https:');
  const sessionName = secure ? '__Host-pempom_session' : 'pempom_session';
  const flowName = secure ? '__Host-pempom_oauth' : 'pempom_oauth';
  const cookieOptions = { httpOnly: true, secure, sameSite: 'lax', path: '/' };
  const configured = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  const redirectUri = `${origin}/api/auth/google/callback`;
  const google = oauthClient || new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, redirectUri);

  function sign(payload) {
    const value = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `${value}.${createHmac('sha256', secret).update(value).digest('base64url')}`;
  }
  function readCookie(req, name, purpose) {
    try {
      const value = req.headers.cookie?.split(';').map(v => v.trim()).find(v => v.startsWith(`${name}=`))?.slice(name.length + 1);
      if (!value || value.length > 4096) return null;
      const [body, signature, extra] = value.split('.');
      if (!body || !signature || extra) return null;
      const expected = createHmac('sha256', secret).update(body).digest();
      const actual = Buffer.from(signature, 'base64url');
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
      const data = JSON.parse(Buffer.from(body, 'base64url').toString());
      return data.purpose === purpose && data.expiresAt > now() ? data : null;
    } catch { return null; }
  }

  async function authenticate(req) {
    const session = readCookie(req, sessionName, 'session');
    const identity = session?.account;
    if (!identity || identity.authProvider !== 'google' || !identity.id?.startsWith('google:')) return null;
    let user = await store.user(identity.id);
    if (!user || (env.OWNER_EMAIL && user.email.toLowerCase() === env.OWNER_EMAIL.toLowerCase() && user.role !== 'owner')) user = await store.registerIdentity(identity);
    if (user.status !== 'active' || user.sessionVersion !== (session.sessionVersion ?? 0)) return null;
    return user;
  }

  app.use('/api', (_req, res, next) => {
    res.set({ 'Cache-Control': 'no-store', 'Pragma': 'no-cache', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' });
    next();
  });
  app.get('/api/health', async (_req, res) => { await store.query('SELECT 1'); res.json({ status: 'ok' }); });
  app.get('/api/auth/config', (_req, res) => res.json({ googleEnabled: configured }));
  app.get('/api/auth/session', async (req, res) => {
    res.json({ account: publicAccount(await authenticate(req)) });
  });
  app.post('/api/auth/logout', (req, res) => {
    if (req.headers.origin !== origin) return res.status(403).json({ error: 'invalid_origin' });
    res.clearCookie(sessionName, cookieOptions);
    res.clearCookie(flowName, cookieOptions);
    res.status(204).end();
  });
  app.get('/api/auth/google/start', (req, res) => {
    // Keep the flow cookie and callback on the same host, including www aliases.
    if (req.get('host') !== new URL(origin).host) return res.redirect(`${origin}/api/auth/google/start`);
    if (!configured) return res.redirect(`${origin}/?auth_error=not_configured`);
    const state = randomBytes(32).toString('base64url');
    const nonce = randomBytes(32).toString('base64url');
    const verifier = randomBytes(48).toString('base64url');
    res.cookie(flowName, sign({ purpose: 'oauth', state, nonce, verifier, expiresAt: now() + FLOW_MS }), { ...cookieOptions, maxAge: FLOW_MS });
    res.redirect(google.generateAuthUrl({
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: ['openid', 'email', 'profile'],
      state,
      nonce,
      prompt: 'select_account',
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256',
    }));
  });
  app.get('/api/auth/google/callback', async (req, res) => {
    const flow = readCookie(req, flowName, 'oauth');
    res.clearCookie(flowName, cookieOptions);
    const fail = code => res.redirect(`${origin}/?auth_error=${code}`);
    if (!configured || !flow || typeof req.query.state !== 'string' || req.query.state !== flow.state) return fail('invalid_state');
    if (req.query.error) return fail(req.query.error === 'access_denied' ? 'cancelled' : 'google_failed');
    if (typeof req.query.code !== 'string' || req.query.code.length > 4096) return fail('google_failed');
    try {
      const { tokens } = await google.getToken({ code: req.query.code, codeVerifier: flow.verifier, redirect_uri: redirectUri });
      if (!tokens.id_token) throw new Error('missing_id_token');
      const ticket = await google.verifyIdToken({ idToken: tokens.id_token, audience: env.GOOGLE_CLIENT_ID });
      const payload = ticket.getPayload();
      if (!payload?.sub || !payload.email || payload.email_verified !== true || payload.nonce !== flow.nonce) throw new Error('invalid_identity');
      const at = new Date(now()).toISOString();
      const account = {
        id: `google:${payload.sub}`, email: payload.email,
        displayName: (payload.name || payload.email.split('@')[0]).slice(0, 50),
        role: 'player', status: 'active', authProvider: 'google', createdAt: at, lastLoginAt: at,
      };
      const user = await store.registerIdentity(account, true);
      res.cookie(sessionName, sign({ purpose: 'session', account: { id: user.id, email: user.email, displayName: user.displayName, authProvider: 'google' }, sessionVersion: user.sessionVersion, expiresAt: now() + SESSION_MS }), { ...cookieOptions, maxAge: SESSION_MS });
      return res.redirect(`${origin}/?auth=google`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) return fail('account_disabled');
      // Never log authorization codes, provider tokens, or client credentials.
      console.error('Google authentication failed during token exchange or identity verification.');
      return fail('google_failed');
    }
  });
  app.use('/api/admin', adminRouter({ store, authenticate, origin }));
  app.use('/api/payments', paymentsRouter({ store, authenticate, origin, env, payOSClient }));
  app.get('/api/content', async (_req, res) => {
    const result = await store.query(`SELECT data FROM pempom_content WHERE data->>'status'='published' ORDER BY data->>'updatedAt' DESC,id`);
    const items = result.rows.map(({ data }) => ({ id: data.id, type: data.type, title: data.title, description: data.description, body: data.body, words: data.words, updatedAt: data.updatedAt }));
    res.json({ items, authoritativeLessons: true });
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'not_found' }));
  app.use('/api', (error, _req, res, _next) => {
    const status = error instanceof ApiError ? error.status : error.type === 'entity.too.large' ? 413 : error instanceof SyntaxError ? 400 : 503;
    if (status === 503) console.error('API request failed; check database availability.');
    res.status(status).json({ error: status === 503 ? 'Máy chủ đang bận. Vui lòng thử lại.' : status === 413 ? 'Nội dung quá lớn (tối đa 2 MB).' : error instanceof SyntaxError ? 'Dữ liệu JSON không hợp lệ.' : error.message });
  });
  if (production) {
    const build = resolve('build');
    app.use(express.static(build, { index: false, dotfiles: 'deny', setHeaders: (res, file) => {
      if (file.includes('/assets/') || file.includes('\\assets\\')) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } }));
    app.get('/{*path}', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(resolve(build, 'index.html'));
    });
  }
  return app;
}
