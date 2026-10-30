import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { ROLES, ApiError } from './permissions.mjs';

const schema = `
CREATE TABLE IF NOT EXISTS pempom_mutex (id integer PRIMARY KEY);
INSERT INTO pempom_mutex VALUES (1) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS pempom_users (id text PRIMARY KEY, email text UNIQUE NOT NULL, data jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS pempom_content (id text PRIMARY KEY, data jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS pempom_invitations (email text PRIMARY KEY, data jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS pempom_audit (id text PRIMARY KEY, at timestamptz NOT NULL DEFAULT now(), data jsonb NOT NULL);
CREATE INDEX IF NOT EXISTS pempom_audit_at ON pempom_audit(at DESC);
CREATE TABLE IF NOT EXISTS pempom_orders (id bigint PRIMARY KEY, user_id text NOT NULL, type text NOT NULL, target_id text NOT NULL, amount integer NOT NULL, coins integer NOT NULL DEFAULT 0, status text NOT NULL, data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS pempom_orders_user_id ON pempom_orders(user_id);
`;

function repository(query) {
  return {
    query,
    async user(id) { return (await query('SELECT data FROM pempom_users WHERE id=$1', [id])).rows[0]?.data ?? null; },
    async userByEmail(email) { return (await query('SELECT data FROM pempom_users WHERE email=$1', [email.toLowerCase()])).rows[0]?.data ?? null; },
    async saveUser(user) { await query('INSERT INTO pempom_users(id,email,data) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET email=$2,data=$3', [user.id, user.email.toLowerCase(), JSON.stringify(user)]); return user; },
    async content(id) { return (await query('SELECT data FROM pempom_content WHERE id=$1', [id])).rows[0]?.data ?? null; },
    async saveContent(content) { await query('INSERT INTO pempom_content(id,data) VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET data=$2', [content.id, JSON.stringify(content)]); return content; },
    async order(orderCode) {
      const row = (await query('SELECT id, user_id, type, target_id, amount, coins, status, data, created_at, updated_at FROM pempom_orders WHERE id=$1', [orderCode])).rows[0];
      if (!row) return null;
      return {
        orderCode: Number(row.id),
        userId: row.user_id,
        type: row.type,
        targetId: row.target_id,
        amount: Number(row.amount),
        coins: Number(row.coins),
        status: row.status,
        ...row.data,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    },
    async saveOrder(order) {
      const { orderCode, userId, type, targetId, amount, coins = 0, status, ...rest } = order;
      await query(
        `INSERT INTO pempom_orders(id, user_id, type, target_id, amount, coins, status, data, updated_at)
         VALUES($1, $2, $3, $4, $5, $6, $7, $8, now())
         ON CONFLICT(id) DO UPDATE SET status=$7, data=$8, updated_at=now()`,
        [orderCode, userId, type, targetId, amount, coins, status, JSON.stringify(rest)]
      );
      return order;
    },
    async log(actor, action, target, detail = {}) {
      const event = { id: randomUUID(), actorId: actor.id, actorEmail: actor.email, action, target, detail, at: new Date().toISOString() };
      await query('INSERT INTO pempom_audit(id,at,data) VALUES($1,$2,$3)', [event.id, event.at, JSON.stringify(event)]);
    },
  };
}

export async function createStore({ connectionString, database, ownerEmail = '', dataDir = '.data/admin' } = {}) {
  let pool;
  if (connectionString) {
    const { Pool } = await import('pg');
    pool = new Pool({ connectionString, max: 8, connectionTimeoutMillis: 10_000, idleTimeoutMillis: 30_000 });
    pool.on('error', () => console.error('Database connection interrupted.'));
  } else if (!database) {
    const { PGlite } = await import('@electric-sql/pglite');
    database = new PGlite(dataDir);
  }
  const query = (sql, args) => pool ? pool.query(sql, args) : database.query(sql, args);
  if (pool) await pool.query(schema); else await database.exec(schema);
  const repo = repository(query);
  const transaction = async fn => {
    if (!pool) return database.transaction(async tx => {
      await tx.query('SELECT id FROM pempom_mutex WHERE id=1 FOR UPDATE');
      return fn(repository((sql, args) => tx.query(sql, args)));
    });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT id FROM pempom_mutex WHERE id=1 FOR UPDATE');
      const result = await fn(repository((sql, args) => client.query(sql, args)));
      await client.query('COMMIT');
      return result;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  };
  await transaction(async tx => {
    const seed = JSON.parse(readFileSync(new URL('./seed-content.json', import.meta.url), 'utf8'));
    for (const item of seed) {
      const at = new Date().toISOString();
      const content = { ...item, body: '', revision: 1, createdAt: at, updatedAt: at, updatedBy: 'system' };
      await tx.query('INSERT INTO pempom_content(id,data) VALUES($1,$2) ON CONFLICT DO NOTHING', [item.id, JSON.stringify(content)]);
    }
  });

  async function registerIdentity(identity, login = false) {
    return transaction(async tx => {
      let user = await tx.user(identity.id);
      const at = new Date().toISOString();
      if (!user) {
        const invitation = (await tx.query('SELECT data FROM pempom_invitations WHERE email=$1', [identity.email.toLowerCase()])).rows[0]?.data;
        const isOwner = ownerEmail && identity.email.toLowerCase() === ownerEmail.toLowerCase();
        const grant = invitation && Date.parse(invitation.expiresAt) > Date.now() ? invitation : null;
        const role = isOwner ? 'owner' : grant?.role ?? 'player';
        user = { ...identity, role, permissions: isOwner ? ROLES.owner.permissions : grant?.permissions ?? ROLES.player.permissions, status: 'active', sessionVersion: 0, createdAt: at, updatedAt: at };
        await tx.saveUser(user);
        await tx.query('DELETE FROM pempom_invitations WHERE email=$1', [identity.email.toLowerCase()]);
        await tx.log(user, 'user.registered', user.id, { role });
      } else if (ownerEmail && user.email.toLowerCase() === ownerEmail.toLowerCase() && user.role !== 'owner') {
        user = { ...user, role: 'owner', permissions: ROLES.owner.permissions, status: 'active', updatedAt: at };
        await tx.saveUser(user);
        await tx.log(user, 'owner.configured', user.id);
      }
      if (login) {
        if (user.status !== 'active') throw new ApiError(403, 'Tài khoản đã bị khóa.');
        user = { ...user, email: identity.email, displayName: identity.displayName, lastLoginAt: at, updatedAt: at };
        await tx.saveUser(user);
        await tx.log(user, 'user.login', user.id);
      }
      return user;
    });
  }

  async function fulfillOrder(orderCode, paymentInfo = {}) {
    return transaction(async tx => {
      const order = await tx.order(orderCode);
      if (!order) throw new ApiError(404, 'Đơn hàng không tồn tại.');
      if (order.status === 'PAID') {
        return { order, alreadyFulfilled: true };
      }
      order.status = 'PAID';
      order.paidAt = new Date().toISOString();
      order.paymentInfo = paymentInfo;
      await tx.saveOrder(order);

      const user = await tx.user(order.userId);
      if (user) {
        user.wallet = user.wallet || { balance: 0, totalEarned: 0, totalSpent: 0 };
        user.inventory = user.inventory || { ownedItemIds: [] };
        if (order.coins > 0) {
          user.wallet.balance = (user.wallet.balance || 0) + order.coins;
          user.wallet.totalEarned = (user.wallet.totalEarned || 0) + order.coins;
        }
        if (order.type === 'skin' && order.targetId) {
          if (!user.inventory.ownedItemIds.includes(order.targetId)) {
            user.inventory.ownedItemIds.push(order.targetId);
          }
        }
        user.updatedAt = new Date().toISOString();
        await tx.saveUser(user);
        await tx.log(user, 'payment.fulfilled', String(orderCode), {
          type: order.type,
          targetId: order.targetId,
          amount: order.amount,
          coins: order.coins,
        });
      }
      return { order, user, alreadyFulfilled: false };
    });
  }

  return { ...repo, transaction, registerIdentity, fulfillOrder, close: () => pool ? pool.end() : database.close() };
}

export function publicAccount(user) {
  if (!user) return null;
  const { sessionVersion, ...safe } = user;
  return safe;
}
