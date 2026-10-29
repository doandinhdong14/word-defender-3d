import { DEFAULT_INVENTORY_SEED } from '../config/catalog';
import { GAME_BALANCE } from '../config/balance';
import { db } from '../data/db';
import type { AccountCredential, AccountStatus, SafeAccount, SecurityEvent, SecurityEventType, UserRole } from './types';

const SESSION_STORAGE_KEY = 'ponpi.auth.session.v1';
const PASSWORD_ITERATIONS = 600_000;
const LOGIN_FAILURE_LIMIT = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const ABSOLUTE_TIMEOUT_MS = 12 * 60 * 60 * 1000;
const SESSION_TOUCH_INTERVAL_MS = 60 * 1000;
let validatedAccountId: string | null = null;

interface StoredSessionPointer {
  id: string;
  token: string;
  accountId: string;
}

export class AuthError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'AuthError';
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLocaleLowerCase('en-US');
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function randomBase64(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToBase64(bytes);
}

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const source = typeof Buffer !== 'undefined' ? Buffer.from(data) : data;
  const digest = await crypto.subtle.digest('SHA-256', source as any);
  return bytesToBase64(new Uint8Array(digest));
}

async function derivePasswordHash(password: string, salt: string, iterations: number): Promise<string> {
  const passwordData = new TextEncoder().encode(password);
  const keySource = typeof Buffer !== 'undefined' ? Buffer.from(passwordData) : passwordData;
  const material = await crypto.subtle.importKey(
    'raw',
    keySource as any,
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const saltBytes = base64ToBytes(salt);
  const saltSource = typeof Buffer !== 'undefined' ? Buffer.from(saltBytes) : saltBytes;
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: saltSource as any,
      iterations,
    },
    material,
    256
  );
  return bytesToBase64(new Uint8Array(bits));
}

function timingSafeEqualBase64(left: string, right: string): boolean {
  const leftBytes = base64ToBytes(left);
  const rightBytes = base64ToBytes(right);
  let difference = leftBytes.length ^ rightBytes.length;
  const length = Math.max(leftBytes.length, rightBytes.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return difference === 0;
}

function toSafeAccount(account: AccountCredential): SafeAccount {
  return {
    id: account.id,
    email: account.email,
    displayName: account.displayName,
    role: account.role,
    status: account.status,
    createdAt: account.createdAt,
    lastLoginAt: account.lastLoginAt,
    lockedUntil: account.lockedUntil,
    authProvider: account.authProvider,
  };
}

async function audit(type: SecurityEventType, accountId?: string, detail?: string): Promise<void> {
  await db.securityEvents.add({
    id: crypto.randomUUID(),
    type,
    accountId,
    occurredAt: new Date().toISOString(),
    detail,
  });
}

export function validatePassword(password: string, email = ''): string[] {
  const errors: string[] = [];
  if (password.length < 10) errors.push('Mật khẩu phải có ít nhất 10 ký tự.');
  if (password.length > 128) errors.push('Mật khẩu không được dài quá 128 ký tự.');

  const groups = [/[a-z]/.test(password), /[A-Z]/.test(password), /\d/.test(password), /[^A-Za-z0-9]/.test(password)];
  if (groups.filter(Boolean).length < 3) {
    errors.push('Hãy kết hợp ít nhất 3 nhóm: chữ thường, chữ hoa, số và ký tự đặc biệt.');
  }

  const emailPrefix = normalizeEmail(email).split('@')[0];
  if (emailPrefix.length >= 4 && password.toLocaleLowerCase('en-US').includes(emailPrefix)) {
    errors.push('Mật khẩu không nên chứa tên email của bạn.');
  }
  return errors;
}

export function getActiveProfileId(): string {
  return validatedAccountId ?? 'guest_profile';
}

export function getSettingsId(profileId = getActiveProfileId()): string {
  return `${profileId}:settings`;
}

async function createSession(accountId: string): Promise<void> {
  const now = Date.now();
  const token = randomBase64(32);
  const session = {
    id: crypto.randomUUID(),
    accountId,
    tokenHash: await sha256(token),
    createdAt: new Date(now).toISOString(),
    lastSeenAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ABSOLUTE_TIMEOUT_MS).toISOString(),
    idleExpiresAt: new Date(now + IDLE_TIMEOUT_MS).toISOString(),
  };

  await db.sessions.add(session);
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ id: session.id, token, accountId }));
  validatedAccountId = accountId;
}

async function migrateLegacyGuestData(accountId: string, displayName: string): Promise<void> {
  const legacyProfile = await db.profiles.get('guest_profile');
  if (!legacyProfile) return;

  const [legacyWallet, legacyInventory, legacySettings, legacyRecords] = await Promise.all([
    db.wallets.get('guest_profile'),
    db.inventories.get('guest_profile'),
    db.settings.get('user_settings'),
    db.learningRecords.where('profileId').equals('guest_profile').toArray(),
  ]);

  await db.transaction('rw', [
    db.profiles,
    db.wallets,
    db.inventories,
    db.settings,
    db.learningRecords,
    db.attempts,
    db.runs,
    db.ledger,
  ], async () => {
    await db.profiles.put({ ...legacyProfile, id: accountId, name: displayName });
    await db.profiles.delete('guest_profile');

    if (legacyWallet) {
      await db.wallets.delete('guest_profile');
      await db.wallets.put({ ...legacyWallet, profileId: accountId });
    }
    if (legacyInventory) {
      await db.inventories.delete('guest_profile');
      await db.inventories.put({ ...legacyInventory, profileId: accountId });
    }
    if (legacySettings) {
      await db.settings.delete('user_settings');
      await db.settings.put({ ...legacySettings, id: getSettingsId(accountId) });
    }

    if (legacyRecords.length > 0) {
      await db.learningRecords.bulkDelete(legacyRecords.map((record) => record.entryId));
      await db.learningRecords.bulkPut(legacyRecords.map((record) => {
        const wordId = record.wordId ?? record.entryId;
        return { ...record, entryId: `${accountId}:${wordId}`, wordId, profileId: accountId };
      }));
    }
    await db.attempts.where('profileId').equals('guest_profile').modify({ profileId: accountId });
    await db.runs.where('profileId').equals('guest_profile').modify({ profileId: accountId });
    await db.ledger.where('profileId').equals('guest_profile').modify({ profileId: accountId });
  });
}

async function getLocalAccount(): Promise<SafeAccount | null> {
  let pointer: StoredSessionPointer;
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      validatedAccountId = null;
      return null;
    }
    pointer = JSON.parse(raw) as StoredSessionPointer;
  } catch {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    validatedAccountId = null;
    return null;
  }

  const session = await db.sessions.get(pointer.id);
  if (!session || session.accountId !== pointer.accountId) {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    validatedAccountId = null;
    return null;
  }

  const now = Date.now();
  const providedHash = await sha256(pointer.token);
  const expired = now >= Date.parse(session.expiresAt) || now >= Date.parse(session.idleExpiresAt);
  if (!timingSafeEqualBase64(providedHash, session.tokenHash) || expired) {
    await db.sessions.delete(session.id);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    validatedAccountId = null;
    return null;
  }

  const account = await db.accounts.get(session.accountId);
  if (!account || account.status !== 'active') {
    await db.sessions.delete(session.id);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    validatedAccountId = null;
    return null;
  }

  if (now - Date.parse(session.lastSeenAt) >= SESSION_TOUCH_INTERVAL_MS) {
    session.lastSeenAt = new Date(now).toISOString();
    session.idleExpiresAt = new Date(now + IDLE_TIMEOUT_MS).toISOString();
    await db.sessions.put(session);
  }

  validatedAccountId = account.id;
  return toSafeAccount(account);
}

async function fetchGoogleAccount(): Promise<SafeAccount | null> {
  const response = await fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error('Không thể kiểm tra phiên Google. Vui lòng thử lại.');
  const { account } = await response.json() as { account: SafeAccount | null };
  if (!account) return null;
  if (account.authProvider !== 'google' || !account.id.startsWith('google:') || !account.email || account.role !== 'player') {
    throw new AuthError('Phiên Google không hợp lệ.', 'invalid_google_session');
  }
  return account;
}

async function syncGoogleAccount(identity: SafeAccount): Promise<SafeAccount> {
  const now = new Date().toISOString();
  // Use the provider subject as the key. Matching an email alone must never link
  // a verified Google identity to an existing local password account.
  await db.transaction('rw', [db.accounts, db.profiles, db.wallets, db.inventories, db.ledger, db.settings], async () => {
    const stored = await db.accounts.get(identity.id);
    if (stored?.status === 'disabled') throw new AuthError('Tài khoản đã bị vô hiệu hóa.', 'account_disabled');
    await db.accounts.put({
      ...identity, normalizedEmail: identity.id, role: 'player',
      createdAt: stored?.createdAt ?? identity.createdAt, updatedAt: now,
      passwordHash: '', passwordSalt: '', passwordIterations: 0, failedLoginAttempts: 0,
    });
    if (!stored) {
      await db.profiles.add({ id: identity.id, name: identity.displayName, level: 1, xp: 0, createdAt: now });
      await db.wallets.add({ profileId: identity.id, balance: GAME_BALANCE.initialCoinBalance, totalEarned: GAME_BALANCE.initialCoinBalance, totalSpent: 0 });
      await db.inventories.add({ profileId: identity.id, ...DEFAULT_INVENTORY_SEED, ownedItemIds: [...DEFAULT_INVENTORY_SEED.ownedItemIds], equippedSkillIds: [...DEFAULT_INVENTORY_SEED.equippedSkillIds] });
      await db.ledger.add({ id: `ledger_onboarding_${identity.id}`, profileId: identity.id, kind: 'onboarding', amount: GAME_BALANCE.initialCoinBalance, referenceId: `onboarding_${identity.id}`, at: now });
      await db.settings.add({ id: getSettingsId(identity.id), audioEnabled: true, volume: 0.8, reduceMotion: false, fontSize: 'normal', desktopReminderDismissed: false });
    }
  });
  if (validatedAccountId !== identity.id) await createSession(identity.id);
  validatedAccountId = identity.id;
  return toSafeAccount((await db.accounts.get(identity.id))!);
}

export async function getCurrentAccount(): Promise<SafeAccount | null> {
  const local = await getLocalAccount();
  const returningFromGoogle = new URLSearchParams(window.location.search).get('auth') === 'google';
  if (local && local.authProvider !== 'google' && !returningFromGoogle) return local;
  try {
    const identity = await fetchGoogleAccount();
    if (!identity) {
      validatedAccountId = null;
      return null;
    }
    return await syncGoogleAccount(identity);
  } catch {
    validatedAccountId = null;
    return null;
  }
}

export async function registerAccount(input: {
  displayName: string;
  email: string;
  password: string;
}): Promise<SafeAccount> {
  const displayName = input.displayName.trim().replace(/\s+/g, ' ');
  const email = input.email.trim();
  const normalizedEmail = normalizeEmail(email);

  if (displayName.length < 2 || displayName.length > 50) {
    throw new AuthError('Tên hiển thị cần từ 2 đến 50 ký tự.', 'invalid_name');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new AuthError('Địa chỉ email không hợp lệ.', 'invalid_email');
  }
  const passwordErrors = validatePassword(input.password, email);
  if (passwordErrors.length > 0) {
    throw new AuthError(passwordErrors[0], 'weak_password');
  }
  if (await db.accounts.where('normalizedEmail').equals(normalizedEmail).first()) {
    throw new AuthError('Không thể tạo tài khoản với thông tin đã nhập.', 'registration_failed');
  }

  const salt = randomBase64(16);
  const passwordHash = await derivePasswordHash(input.password, salt, PASSWORD_ITERATIONS);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  let account!: AccountCredential;
  let isFirstAccount = false;

  await db.transaction('rw', [db.accounts, db.profiles, db.wallets, db.inventories, db.ledger, db.settings], async () => {
    if (await db.accounts.where('normalizedEmail').equals(normalizedEmail).first()) {
      throw new AuthError('Không thể tạo tài khoản với thông tin đã nhập.', 'registration_failed');
    }
    isFirstAccount = (await db.accounts.count()) === 0;
    const role: UserRole = isFirstAccount ? 'admin' : 'player';
    account = {
      id,
      email,
      normalizedEmail,
      displayName,
      role,
      status: 'active',
      passwordHash,
      passwordSalt: salt,
      passwordIterations: PASSWORD_ITERATIONS,
      failedLoginAttempts: 0,
      createdAt: now,
      updatedAt: now,
    };

    await db.accounts.add(account);
    await db.profiles.add({ id, name: displayName, level: 1, xp: 0, createdAt: now });
    await db.wallets.add({
      profileId: id,
      balance: GAME_BALANCE.initialCoinBalance,
      totalEarned: GAME_BALANCE.initialCoinBalance,
      totalSpent: 0,
    });
    await db.inventories.add({
      profileId: id,
      ...DEFAULT_INVENTORY_SEED,
      ownedItemIds: [...DEFAULT_INVENTORY_SEED.ownedItemIds],
      equippedSkillIds: [...DEFAULT_INVENTORY_SEED.equippedSkillIds],
    });
    await db.ledger.add({
      id: `ledger_onboarding_${id}`,
      profileId: id,
      kind: 'onboarding',
      amount: GAME_BALANCE.initialCoinBalance,
      referenceId: `onboarding_${id}`,
      at: now,
    });
    await db.settings.add({
      id: getSettingsId(id),
      audioEnabled: true,
      volume: 0.8,
      reduceMotion: false,
      fontSize: 'normal',
      desktopReminderDismissed: false,
    });
  });

  if (isFirstAccount) await migrateLegacyGuestData(account.id, displayName);
  await createSession(account.id);
  await audit('register', account.id, account.role);
  return toSafeAccount(account);
}

export async function loginAccount(email: string, password: string): Promise<SafeAccount> {
  const normalizedEmail = normalizeEmail(email);
  const account = await db.accounts.where('normalizedEmail').equals(normalizedEmail).first();

  if (!account) {
    await derivePasswordHash(password.slice(0, 128), 'AAAAAAAAAAAAAAAAAAAAAA==', PASSWORD_ITERATIONS);
    await audit('login_failure', undefined, 'unknown_account');
    throw new AuthError('Email hoặc mật khẩu không chính xác.', 'invalid_credentials');
  }

  const now = Date.now();
  if (account.lockedUntil && Date.parse(account.lockedUntil) > now) {
    const minutes = Math.max(1, Math.ceil((Date.parse(account.lockedUntil) - now) / 60_000));
    throw new AuthError(`Tài khoản đang bị khóa tạm thời. Vui lòng thử lại sau ${minutes} phút.`, 'account_locked');
  }
  if (account.status !== 'active') {
    throw new AuthError('Không thể đăng nhập bằng tài khoản này. Hãy liên hệ quản trị viên.', 'account_disabled');
  }

  const candidateHash = await derivePasswordHash(password.slice(0, 128), account.passwordSalt, account.passwordIterations);
  if (!timingSafeEqualBase64(candidateHash, account.passwordHash)) {
    account.failedLoginAttempts += 1;
    if (account.failedLoginAttempts >= LOGIN_FAILURE_LIMIT) {
      account.lockedUntil = new Date(now + LOCKOUT_MS).toISOString();
      account.failedLoginAttempts = 0;
      await audit('account_locked', account.id, 'too_many_failed_attempts');
    }
    account.updatedAt = new Date(now).toISOString();
    await db.accounts.put(account);
    await audit('login_failure', account.id, 'invalid_password');
    throw new AuthError('Email hoặc mật khẩu không chính xác.', 'invalid_credentials');
  }

  account.failedLoginAttempts = 0;
  account.lockedUntil = undefined;
  account.lastLoginAt = new Date(now).toISOString();
  account.updatedAt = account.lastLoginAt;
  await db.accounts.put(account);
  await createSession(account.id);
  await audit('login_success', account.id);
  return toSafeAccount(account);
}

export async function logoutAccount(): Promise<void> {
  const accountId = getActiveProfileId();
  if (accountId.startsWith('google:')) {
    const response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin', signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new AuthError('Chưa đăng xuất được. Vui lòng thử lại.', 'logout_failed');
  }
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      const pointer = JSON.parse(raw) as StoredSessionPointer;
      await db.sessions.delete(pointer.id);
    }
  } finally {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    validatedAccountId = null;
  }
  if (accountId !== 'guest_profile') await audit('logout', accountId);
}

async function requireAdmin(): Promise<AccountCredential> {
  const current = await getCurrentAccount();
  if (!current || current.role !== 'admin') {
    throw new AuthError('Bạn không có quyền thực hiện thao tác này.', 'forbidden');
  }
  const account = await db.accounts.get(current.id);
  if (!account || account.status !== 'active') throw new AuthError('Phiên đăng nhập không hợp lệ.', 'unauthorized');
  return account;
}

export async function listAccounts(): Promise<SafeAccount[]> {
  await requireAdmin();
  const accounts = await db.accounts.orderBy('createdAt').toArray();
  return accounts.map(toSafeAccount);
}

export async function listSecurityEvents(limit = 20): Promise<SecurityEvent[]> {
  await requireAdmin();
  return db.securityEvents.orderBy('occurredAt').reverse().limit(Math.min(100, Math.max(1, limit))).toArray();
}

export async function updateAccountRole(accountId: string, role: UserRole): Promise<void> {
  const actor = await requireAdmin();
  const target = await db.accounts.get(accountId);
  if (!target) throw new AuthError('Không tìm thấy tài khoản.', 'not_found');
  if (target.role === role) return;

  if (target.role === 'admin' && role !== 'admin') {
    const activeAdmins = await db.accounts.where('role').equals('admin').filter((account) => account.status === 'active').count();
    if (activeAdmins <= 1) throw new AuthError('Hệ thống phải luôn có ít nhất một quản trị viên đang hoạt động.', 'last_admin');
  }

  target.role = role;
  target.updatedAt = new Date().toISOString();
  await db.accounts.put(target);
  await audit('role_changed', target.id, `${actor.id}:${role}`);
}

export async function updateAccountStatus(accountId: string, status: AccountStatus): Promise<void> {
  const actor = await requireAdmin();
  if (actor.id === accountId && status === 'disabled') {
    throw new AuthError('Bạn không thể vô hiệu hóa tài khoản đang đăng nhập.', 'self_disable');
  }
  const target = await db.accounts.get(accountId);
  if (!target) throw new AuthError('Không tìm thấy tài khoản.', 'not_found');
  if (target.role === 'admin' && status === 'disabled') {
    const activeAdmins = await db.accounts.where('role').equals('admin').filter((account) => account.status === 'active').count();
    if (activeAdmins <= 1) throw new AuthError('Hệ thống phải luôn có ít nhất một quản trị viên đang hoạt động.', 'last_admin');
  }

  target.status = status;
  target.updatedAt = new Date().toISOString();
  await db.accounts.put(target);
  if (status === 'disabled') await db.sessions.where('accountId').equals(accountId).delete();
  await audit('status_changed', target.id, `${actor.id}:${status}`);
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const current = await getCurrentAccount();
  if (!current) throw new AuthError('Phiên đăng nhập đã hết hạn.', 'unauthorized');
  const account = await db.accounts.get(current.id);
  if (!account) throw new AuthError('Không tìm thấy tài khoản.', 'not_found');

  if (account.authProvider === 'google') throw new AuthError('Hãy quản lý mật khẩu trong Tài khoản Google của bạn.', 'google_password');
  const currentHash = await derivePasswordHash(currentPassword.slice(0, 128), account.passwordSalt, account.passwordIterations);
  if (!timingSafeEqualBase64(currentHash, account.passwordHash)) {
    throw new AuthError('Mật khẩu hiện tại không chính xác.', 'invalid_current_password');
  }
  const errors = validatePassword(newPassword, account.email);
  if (errors.length > 0) throw new AuthError(errors[0], 'weak_password');
  if (currentPassword === newPassword) throw new AuthError('Mật khẩu mới phải khác mật khẩu hiện tại.', 'same_password');

  account.passwordSalt = randomBase64(16);
  account.passwordHash = await derivePasswordHash(newPassword, account.passwordSalt, PASSWORD_ITERATIONS);
  account.passwordIterations = PASSWORD_ITERATIONS;
  account.updatedAt = new Date().toISOString();
  await db.accounts.put(account);
  await db.sessions.where('accountId').equals(account.id).delete();
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
  validatedAccountId = null;
  await audit('password_changed', account.id);
}

export async function hasRegisteredAccounts(): Promise<boolean> {
  return (await db.accounts.count()) > 0;
}
