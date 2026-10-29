import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  getCurrentAccount,
  hasRegisteredAccounts,
  loginAccount,
  logoutAccount,
  registerAccount,
} from './authService';
import type { SafeAccount } from './types';

interface AuthContextValue {
  account: SafeAccount | null;
  ready: boolean;
  hasAccounts: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { displayName: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<SafeAccount | null>(null);
  const [ready, setReady] = useState(false);
  const [hasAccounts, setHasAccounts] = useState(false);

  const refreshAccount = useCallback(async () => {
    const [current, registered] = await Promise.all([getCurrentAccount(), hasRegisteredAccounts()]);
    setAccount(current);
    setHasAccounts(registered);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([getCurrentAccount(), hasRegisteredAccounts()])
      .then(([current, registered]) => {
        if (!active) return;
        setAccount(current);
        setHasAccounts(registered);
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

  const login = useCallback(async (email: string, password: string) => {
    const next = await loginAccount(email, password);
    setAccount(next);
    setHasAccounts(true);
  }, []);

  const register = useCallback(async (input: { displayName: string; email: string; password: string }) => {
    const next = await registerAccount(input);
    setAccount(next);
    setHasAccounts(true);
  }, []);

  const logout = useCallback(async () => {
    await logoutAccount();
    setAccount(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    account,
    ready,
    hasAccounts,
    isAdmin: account?.role === 'admin',
    login,
    register,
    logout,
    refreshAccount,
  }), [account, ready, hasAccounts, login, register, logout, refreshAccount]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
