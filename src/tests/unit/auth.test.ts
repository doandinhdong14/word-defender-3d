import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../data/db';
import { getActiveProfileId, getCurrentAccount, loginAccount, logoutAccount, registerAccount } from '../../auth/authService';
import type { SafeAccount } from '../../auth/types';

const identity: SafeAccount = {
  id: 'google:12345', email: 'pilot@example.com', displayName: 'Google Pilot',
  role: 'player', status: 'active', authProvider: 'google', permissions: [],
  createdAt: '2026-10-29T00:00:00Z',
};

describe('Google-only authentication', () => {
  const fetchMock = vi.fn();
  beforeEach(async () => {
    sessionStorage.clear();
    await Promise.all(db.tables.map(table => table.clear()));
    fetchMock.mockReset().mockResolvedValue({ ok: true, json: async () => ({ account: null }) });
    vi.stubGlobal('fetch', fetchMock);
    await getCurrentAccount();
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('rejects both legacy email/password entry points without creating an account', async () => {
    await expect(registerAccount({ displayName: 'Pilot', email: identity.email, password: 'Cosmos!Secure2026' })).rejects.toMatchObject({ code: 'google_only' });
    await expect(loginAccount(identity.email, 'Cosmos!Secure2026')).rejects.toMatchObject({ code: 'google_only' });
    expect(await db.accounts.count()).toBe(0);
    expect(getActiveProfileId()).toBe('guest_profile');
  });

  it('ignores a persisted legacy admin session and preserves its data', async () => {
    await db.accounts.add({ ...identity, id: 'legacy-admin', authProvider: undefined, role: 'admin', normalizedEmail: identity.email, passwordHash: 'old-hash', passwordSalt: 'old-salt', passwordIterations: 600000, failedLoginAttempts: 0, updatedAt: identity.createdAt });
    sessionStorage.setItem('ponpi.auth.session.v1', JSON.stringify({ id: 'legacy-session', accountId: 'legacy-admin', token: 'old-token' }));
    expect(await getCurrentAccount()).toBeNull();
    expect(sessionStorage.getItem('ponpi.auth.session.v1')).toBeNull();
    expect((await db.accounts.get('legacy-admin'))?.role).toBe('admin');
    expect(getActiveProfileId()).toBe('guest_profile');
  });

  it('uses the verified Google subject and preserves the existing player wallet on revalidation', async () => {
    await db.profiles.add({ id: 'legacy-admin', name: 'Legacy Pilot', xp: 900, level: 10, createdAt: identity.createdAt });
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ account: identity }) });
    expect(await getCurrentAccount()).toMatchObject({ id: identity.id, role: 'player' });
    expect(getActiveProfileId()).toBe(identity.id);
    await db.wallets.update(identity.id, { balance: 42 });
    await getCurrentAccount();
    expect((await db.wallets.get(identity.id))?.balance).toBe(42);
    expect(await db.ledger.where('profileId').equals(identity.id).count()).toBe(1);
    expect((await db.profiles.get('legacy-admin'))?.xp).toBe(900);
    expect((await db.profiles.get(identity.id))?.xp).toBe(0);
  });

  it.each(['missing', 'unavailable', 'disabled', 'local'])('does not trust a cached Google account when the server identity is %s', async scenario => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ account: identity }) });
    await getCurrentAccount();
    if (scenario === 'unavailable') fetchMock.mockRejectedValue(new Error('offline'));
    else fetchMock.mockResolvedValue({ ok: true, json: async () => ({ account: scenario === 'missing' ? null : { ...identity, ...(scenario === 'disabled' ? { status: 'disabled' } : { authProvider: undefined }) } }) });
    expect(await getCurrentAccount()).toBeNull();
    expect(getActiveProfileId()).toBe('guest_profile');
  });

  it('logs out through the server and clears the active profile', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ account: identity }) });
    await getCurrentAccount();
    await logoutAccount();
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({ method: 'POST', credentials: 'same-origin' }));
    expect(getActiveProfileId()).toBe('guest_profile');
    expect(await db.sessions.count()).toBe(0);
  });
});
