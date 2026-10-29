import React, { createContext, useContext, useEffect, useState } from 'react';
import { Difficulty, GameMode, RunSummary } from '../types/game';
import { Inventory, Wallet } from '../types/economy';
import { db, UserProfile, UserSettings } from '../data/db';
import { DEFAULT_INVENTORY_SEED } from '../config/catalog';
import { GameMapId, getActiveMapId, setActiveMapId } from '../config/maps';
import { useAuth } from '../auth/AuthContext';
import { getSettingsId } from '../auth/authService';

export type AppRoute =
  | 'home'
  | 'library'
  | 'editor'
  | 'prepare'
  | 'battle'
  | 'results'
  | 'review'
  | 'store'
  | 'wardrobe'
  | 'progress'
  | 'settings'
  | 'account'
  | 'leaderboard'
  | 'gifts'
  | 'events'
  | 'admin';
// The lobby exposes seven destinations; existing tools remain nested within them.

interface AppContextValue {
  currentRoute: AppRoute;
  navigateTo: (route: AppRoute) => void;
  selectedSetId: string;
  setSelectedSetId: (id: string) => void;
  selectedMode: GameMode;
  setSelectedMode: (mode: GameMode) => void;
  selectedDifficulty: Difficulty;
  setSelectedDifficulty: (diff: Difficulty) => void;
  selectedMap: GameMapId;
  setSelectedMap: (map: GameMapId) => void;
  lastRunSummary: RunSummary | null;
  setLastRunSummary: (summary: RunSummary | null) => void;
  profile: UserProfile | null;
  wallet: Wallet | null;
  inventory: Inventory | null;
  settings: UserSettings | null;
  dueWordsCount: number;
  refreshUserData: () => Promise<void>;
  addTestCoins: (amount?: number) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { account, isAdmin } = useAuth();
  const profileId = account?.id ?? 'guest_profile';
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => new URLSearchParams(window.location.search).has('auth_error') ? 'account' : 'home');
  const [selectedSetId, setSelectedSetId] = useState<string>('set_everyday');
  const [selectedMode, setSelectedMode] = useState<GameMode>('copy');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('normal');
  const [selectedMap, setSelectedMapState] = useState<GameMapId>(getActiveMapId());
  const [lastRunSummary, setLastRunSummary] = useState<RunSummary | null>(null);

  const setSelectedMap = (map: GameMapId) => {
    setActiveMapId(map);
    setSelectedMapState(map);
  };

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [dueWordsCount, setDueWordsCount] = useState<number>(0);

  const refreshUserData = async () => {
    if (!account) {
      setProfile(null);
      setWallet(null);
      setInventory(null);
      setSettings(null);
      setDueWordsCount(0);
      return;
    }
    const prof = await db.profiles.get(profileId);
    if (prof) setProfile(prof);

    const wal = await db.wallets.get(profileId);
    setWallet(wal ?? null);

    const inv = await db.inventories.get(profileId);
    if (inv) {
      let changed = false;
      for (const id of DEFAULT_INVENTORY_SEED.ownedItemIds) {
        if (!inv.ownedItemIds.includes(id)) {
          inv.ownedItemIds.push(id);
          changed = true;
        }
      }
      if (!inv.equippedBulletId) {
        inv.equippedBulletId = 'bullet_missile';
        changed = true;
      }
      if (changed) {
        await db.inventories.put(inv);
      }
      setInventory(inv);
    }

    const set = await db.settings.get(getSettingsId(profileId));
    if (set) setSettings(set);

    const now = new Date().toISOString();
    const dueCount = await db.learningRecords
      .where('profileId')
      .equals(profileId)
      .filter((record) => Boolean(record.nextDueAt && record.nextDueAt <= now))
      .count();
    setDueWordsCount(dueCount);
  };

  const addTestCoins = async (amount = 99999) => {
    if (!isAdmin) throw new Error('Chỉ quản trị viên mới có thể cấp xu thử nghiệm.');
    let wal = await db.wallets.get(profileId);
    if (wal) {
      wal.balance = (wal.balance || 0) + amount;
      wal.totalEarned = (wal.totalEarned || 0) + amount;
      await db.wallets.put(wal);
    } else {
      wal = {
        profileId,
        balance: amount,
        totalEarned: amount,
        totalSpent: 0,
      };
      await db.wallets.add(wal);
    }
    await refreshUserData();
  };

  useEffect(() => {
    refreshUserData();
  }, [profileId]);

  const navigateTo = (route: AppRoute) => {
    const requiresAdmin = route === 'admin';
    setCurrentRoute(requiresAdmin && !isAdmin ? 'home' : route);
    refreshUserData();
    window.scrollTo(0, 0);
  };

  return (
    <AppContext.Provider
      value={{
        currentRoute,
        navigateTo,
        selectedSetId,
        setSelectedSetId,
        selectedMode,
        setSelectedMode,
        selectedDifficulty,
        setSelectedDifficulty,
        selectedMap,
        setSelectedMap,
        lastRunSummary,
        setLastRunSummary,
        profile,
        wallet,
        inventory,
        settings,
        dueWordsCount,
        refreshUserData,
        addTestCoins,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextValue => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
