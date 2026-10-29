export type UserRole = 'admin' | 'player';
export type AccountStatus = 'active' | 'disabled';

export interface AccountCredential {
  authProvider?: 'google';
  id: string;
  email: string;
  normalizedEmail: string;
  displayName: string;
  role: UserRole;
  status: AccountStatus;
  passwordHash: string;
  passwordSalt: string;
  passwordIterations: number;
  failedLoginAttempts: number;
  lockedUntil?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface SafeAccount {
  authProvider?: 'google';
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: AccountStatus;
  createdAt: string;
  lastLoginAt?: string;
  lockedUntil?: string;
}

export interface AuthSession {
  id: string;
  accountId: string;
  tokenHash: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  idleExpiresAt: string;
}

export type SecurityEventType =
  | 'register'
  | 'login_success'
  | 'login_failure'
  | 'account_locked'
  | 'logout'
  | 'password_changed'
  | 'role_changed'
  | 'status_changed';

export interface SecurityEvent {
  id: string;
  accountId?: string;
  type: SecurityEventType;
  occurredAt: string;
  detail?: string;
}
