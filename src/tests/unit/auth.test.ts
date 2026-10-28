import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../data/db';
import {
  getCurrentAccount,
  listAccounts,
  loginAccount,
  logoutAccount,
  registerAccount,
  updateAccountRole,
} from '../../auth/authService';

describe('Authentication and authorization', () => {
  beforeEach(async () => {
    sessionStorage.clear();
    await Promise.all(db.tables.map((table) => table.clear()));
  });

  it('creates the first account as admin without storing the raw password', async () => {
    const password = 'pempom!Secure2026';
    await db.profiles.add({
      id: 'guest_profile',
      name: 'Legacy Pilot',
      level: 3,
      xp: 275,
      createdAt: new Date().toISOString(),
    });
    const account = await registerAccount({
      displayName: 'Admin pempom',
      email: 'Admin@Example.com',
      password,
    });

    expect(account.role).toBe('admin');
    const stored = await db.accounts.get(account.id);
    expect(stored?.normalizedEmail).toBe('admin@example.com');
    expect(stored?.passwordHash).not.toBe(password);
    expect(stored?.passwordSalt).toBeTruthy();
    expect(stored?.passwordIterations).toBe(600_000);
    expect((await db.profiles.get(account.id))?.xp).toBe(275);
    expect(await db.profiles.get('guest_profile')).toBeUndefined();
    expect(await getCurrentAccount()).toMatchObject({ id: account.id, role: 'admin' });
  });

  it('assigns later accounts the player role and lets an admin promote them', async () => {
    const admin = await registerAccount({ displayName: 'Admin', email: 'admin@example.com', password: 'Galaxy!Secure2026' });
    await logoutAccount();
    const player = await registerAccount({ displayName: 'Player', email: 'player@example.com', password: 'Rocket!Secure2026' });
    expect(player.role).toBe('player');

    await logoutAccount();
    await loginAccount(admin.email, 'Galaxy!Secure2026');
    await updateAccountRole(player.id, 'admin');
    const accounts = await listAccounts();
    expect(accounts.find((item) => item.id === player.id)?.role).toBe('admin');
  });

  it('invalidates an idle session', async () => {
    await registerAccount({ displayName: 'Pilot', email: 'pilot@example.com', password: 'Cosmos!Secure2026' });
    const session = await db.sessions.toCollection().first();
    expect(session).toBeDefined();
    if (!session) return;

    session.idleExpiresAt = new Date(Date.now() - 1_000).toISOString();
    await db.sessions.put(session);

    expect(await getCurrentAccount()).toBeNull();
    expect(await db.sessions.get(session.id)).toBeUndefined();
  });
});
