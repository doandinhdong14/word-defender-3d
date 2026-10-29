import { DEFAULT_INVENTORY_SEED } from '../config/catalog';
import { GAME_BALANCE } from '../config/balance';
import { db } from '../data/db';
import type { SafeAccount } from './types';

const LEGACY_SESSION_KEY = 'ponpi.auth.session.v1';
let validatedAccountId: string | null = null;
let sessionGeneration = 0;

export class AuthError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export function getActiveProfileId(): string {
  return validatedAccountId ?? 'guest_profile';
}

export function getSettingsId(profileId = getActiveProfileId()): string {
  return `${profileId}:settings`;
}

async function syncGoogleAccount(identity: SafeAccount): Promise<void> {
  const now = new Date().toISOString();
  // Google subject IDs keep legacy password accounts and their saved data separate.
  await db.transaction('rw', [db.accounts, db.profiles, db.wallets, db.inventories, db.ledger, db.settings], async () => {
    const stored = await db.accounts.get(identity.id);
    await db.accounts.put({
      ...identity, normalizedEmail: identity.id,
      createdAt: stored?.createdAt ?? identity.createdAt, updatedAt: now,
      passwordHash: '', passwordSalt: '', passwordIterations: 0, failedLoginAttempts: 0,
    });
    if (!(await db.profiles.get(identity.id))) {
      await db.profiles.add({ id: identity.id, name: identity.displayName, level: 1, xp: 0, createdAt: now });
    }
    if (!(await db.wallets.get(identity.id))) {
      await db.wallets.add({ profileId: identity.id, balance: GAME_BALANCE.initialCoinBalance, totalEarned: GAME_BALANCE.initialCoinBalance, totalSpent: 0 });
      await db.ledger.put({ id: `ledger_onboarding_${identity.id}`, profileId: identity.id, kind: 'onboarding', amount: GAME_BALANCE.initialCoinBalance, referenceId: `onboarding_${identity.id}`, at: now });
    }
    if (!(await db.inventories.get(identity.id))) {
      await db.inventories.add({ profileId: identity.id, ...DEFAULT_INVENTORY_SEED, ownedItemIds: [...DEFAULT_INVENTORY_SEED.ownedItemIds], equippedSkillIds: [...DEFAULT_INVENTORY_SEED.equippedSkillIds] });
    }
    if (!(await db.settings.get(getSettingsId(identity.id)))) {
      await db.settings.add({ id: getSettingsId(identity.id), audioEnabled: true, volume: 0.8, reduceMotion: false, fontSize: 'normal', desktopReminderDismissed: false });
    }
  });
}

export async function getCurrentAccount(): Promise<SafeAccount | null> {
  const generation = sessionGeneration;
  try {
    sessionStorage.removeItem(LEGACY_SESSION_KEY);
    const response = await fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error('Không thể kiểm tra phiên Google.');
    const { account } = await response.json() as { account: SafeAccount | null };
    if (!account || account.authProvider !== 'google' || !account.id.startsWith('google:') || !account.email || account.status !== 'active' || !['owner', 'admin', 'editor', 'moderator', 'player'].includes(account.role)) {
      if (generation === sessionGeneration) validatedAccountId = null;
      return null;
    }
    await syncGoogleAccount(account);
    if (generation !== sessionGeneration) return null;
    validatedAccountId = account.id;
    return account;
  } catch {
    if (generation === sessionGeneration) validatedAccountId = null;
    return null;
  }
}

// Explicitly reject legacy entry points as well as removing their forms.
export async function registerAccount(_input: { displayName: string; email: string; password: string }): Promise<SafeAccount> {
  throw new AuthError('Vui lòng đăng nhập bằng Google.', 'google_only');
}

export async function loginAccount(_email: string, _password: string): Promise<SafeAccount> {
  throw new AuthError('Vui lòng đăng nhập bằng Google.', 'google_only');
}

export async function logoutAccount(): Promise<void> {
  const response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin', signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new AuthError('Chưa đăng xuất được. Vui lòng thử lại.', 'logout_failed');
  sessionGeneration += 1;
  validatedAccountId = null;
  sessionStorage.removeItem(LEGACY_SESSION_KEY);
  await db.sessions.clear();
}
