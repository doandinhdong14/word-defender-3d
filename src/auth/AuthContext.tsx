import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  getCurrentAccount,
  logoutAccount,
} from './authService';
import type { SafeAccount } from './types';

interface AuthContextValue {
  account: SafeAccount | null;
  ready: boolean;
  isAdmin: boolean;
  hasPermission: (permission: string) => boolean;
  logout: () => Promise<void>;
  refreshAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<SafeAccount | null>(null);
  const [ready, setReady] = useState(false);

  const refreshAccount = useCallback(async () => {
    const current = await getCurrentAccount();
    setAccount(current);
  }, []);

  useEffect(() => {
    let active = true;
    getCurrentAccount()
      .then((current) => {
        if (!active) return;
        setAccount(current);
        const url = new URL(window.location.href);
        if (url.searchParams.get('auth') === 'google') {
          url.searchParams.delete('auth');
          if (!current) url.searchParams.set('auth_error', 'google_failed');
          window.history.replaceState(null, '', url);
        }
      })
      .finally(() => {
        if (active) setReady(true);
      });

    const verifySession = () => {
      void getCurrentAccount().then((current) => {
        if (active) setAccount(current);
      });
    };
    const interval = window.setInterval(verifySession, 60_000);
    window.addEventListener('focus', verifySession);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', verifySession);
    };
  }, []);

  const logout = useCallback(async () => {
    await logoutAccount();
    setAccount(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    account,
    ready,
    isAdmin: account?.authProvider === 'google' && Boolean(account.permissions?.includes('admin.access')),
    hasPermission: (permission: string) => account?.authProvider === 'google' && Boolean(account.permissions?.includes(permission)),
    logout,
    refreshAccount,
  }), [account, ready, logout, refreshAccount]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
