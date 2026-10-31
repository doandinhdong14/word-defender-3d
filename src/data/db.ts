import Dexie, { type EntityTable } from 'dexie';
import { VocabularyEntry, VocabularySet } from '../types/vocabulary';
import { Inventory, LedgerEntry, Wallet } from '../types/economy';
import { Attempt, LearningRecord } from '../types/learning';
import { RunSummary } from '../types/game';
import { SEED_ENTRIES, SEED_WORD_SETS } from './seedWordSets';
import { DEFAULT_INVENTORY_SEED } from '../config/catalog';
import { GAME_BALANCE } from '../config/balance';
import type { AccountCredential, AuthSession, SecurityEvent } from '../auth/types';
import type { CommunityPost, RewardClaim } from './community';

export interface UserProfile {
  id: string;
  name: string;
  level: number;
  xp: number;
  createdAt: string;
}

export interface UserSettings {
  id: string;
  audioEnabled: boolean;
  volume: number;
  reduceMotion: boolean;
  fontSize: 'normal' | 'large';
  desktopReminderDismissed: boolean;
}

export class PonpiDatabase extends Dexie {
  profiles!: EntityTable<UserProfile, 'id'>;
  wordSets!: EntityTable<VocabularySet, 'id'>;
  words!: EntityTable<VocabularyEntry, 'id'>;
  learningRecords!: EntityTable<LearningRecord, 'entryId'>;
  attempts!: EntityTable<Attempt, 'id'>;
  runs!: EntityTable<RunSummary, 'id'>;
  wallets!: EntityTable<Wallet, 'profileId'>;
  inventories!: EntityTable<Inventory, 'profileId'>;
  ledger!: EntityTable<LedgerEntry, 'id'>;
  settings!: EntityTable<UserSettings, 'id'>;
  accounts!: EntityTable<AccountCredential, 'id'>;
  sessions!: EntityTable<AuthSession, 'id'>;
  securityEvents!: EntityTable<SecurityEvent, 'id'>;
  communityPosts!: EntityTable<CommunityPost, 'id'>;
  rewardClaims!: EntityTable<RewardClaim, 'id'>;

  constructor() {
    super('PonpiWordBlasterDB');
    this.version(1).stores({
      profiles: 'id',
      wordSets: 'id, owner',
      words: 'id, setId, english',
      learningRecords: 'entryId, stage, nextDueAt',
      attempts: 'id, runId, entryId, occurredAt',
      runs: 'id, setId, result, startedAt',
      wallets: 'profileId',
      inventories: 'profileId',
      ledger: 'id, profileId, referenceId, at',
      settings: 'id',
    });

    this.version(2).stores({
      profiles: 'id',
      wordSets: 'id, owner',
      words: 'id, setId, english',
      learningRecords: 'entryId, profileId, wordId, stage, nextDueAt',
      attempts: 'id, profileId, runId, entryId, occurredAt',
      runs: 'id, profileId, setId, result, startedAt',
      wallets: 'profileId',
      inventories: 'profileId',
      ledger: 'id, profileId, referenceId, at',
      settings: 'id',
      accounts: 'id, &normalizedEmail, role, status, createdAt',
      sessions: 'id, &tokenHash, accountId, expiresAt, idleExpiresAt',
      securityEvents: 'id, accountId, type, occurredAt',
    }).upgrade(async (transaction) => {
      await transaction.table('learningRecords').toCollection().modify((record) => {
        record.profileId = record.profileId || 'guest_profile';
        record.wordId = record.wordId || record.entryId;
      });
      await transaction.table('attempts').toCollection().modify((attempt) => {
        attempt.profileId = attempt.profileId || 'guest_profile';
      });
      await transaction.table('runs').toCollection().modify((run) => {
        run.profileId = run.profileId || 'guest_profile';
      });
    });
    this.version(3).stores({
      communityPosts: 'id, profileId, kind, createdAt',
      rewardClaims: 'id, profileId, rewardId',
    });
  }
}

export const db = new PonpiDatabase();

let initializationPromise: Promise<void> | null = null;

async function seedMissingData(): Promise<void> {
  await db.transaction('rw', [
    db.profiles,
    db.wallets,
    db.inventories,
    db.ledger,
    db.settings,
    db.wordSets,
    db.words,
    db.accounts,
  ], async () => {
    const profileId = 'guest_profile';
    const now = new Date().toISOString();
    const hasRegisteredAccounts = (await db.accounts.count()) > 0;

    if (!hasRegisteredAccounts && !(await db.profiles.get(profileId))) {
      await db.profiles.add({
        id: profileId,
        name: 'pempom Pilot',
        level: 1,
        xp: 0,
        createdAt: now,
      });
    }

    const existingWallet = hasRegisteredAccounts ? undefined : await db.wallets.get(profileId);
    if (!hasRegisteredAccounts && !existingWallet) {
      await db.wallets.add({
        profileId,
        balance: GAME_BALANCE.initialCoinBalance,
        totalEarned: GAME_BALANCE.initialCoinBalance,
        totalSpent: 0,
      });
    } else if (existingWallet && existingWallet.balance < 99999) {
      existingWallet.balance = 99999;
      existingWallet.totalEarned = Math.max(existingWallet.totalEarned, 99999);
      await db.wallets.put(existingWallet);
    }

    const onboardingLedger = hasRegisteredAccounts ? undefined : await db.ledger
      .where('referenceId')
      .equals('onboarding_welcome_bonus')
      .first();
    if (!hasRegisteredAccounts && !onboardingLedger) {
      await db.ledger.add({
        id: 'ledger_onboarding_welcome_bonus',
        profileId,
        kind: 'onboarding',
        amount: GAME_BALANCE.initialCoinBalance,
        referenceId: 'onboarding_welcome_bonus',
        at: now,
      });
    }

    if (!hasRegisteredAccounts && !(await db.inventories.get(profileId))) {
      await db.inventories.add({
        profileId,
        ...DEFAULT_INVENTORY_SEED,
      });
    }

    if (!hasRegisteredAccounts && !(await db.settings.get('user_settings'))) {
      await db.settings.add({
        id: 'user_settings',
        audioEnabled: true,
        volume: 0.8,
        reduceMotion: false,
        fontSize: 'normal',
        desktopReminderDismissed: false,
      });
    }

    // Remove obsolete starter sets and words
    await db.wordSets.bulkDelete(['set_everyday', 'set_school', 'set_ielts']);
    await db.words.where('setId').anyOf(['set_everyday', 'set_school', 'set_ielts']).delete();

    // Upsert builtin sets to ensure entryIds array contains all 3000 entries
    await db.wordSets.bulkPut(SEED_WORD_SETS);

    const existingWords = await db.words.bulkGet(SEED_ENTRIES.map((word) => word.id));
    const missingWords = SEED_ENTRIES.filter((_, index) => !existingWords[index]);
    if (missingWords.length > 0) {
      await db.words.bulkAdd(missingWords);
    }
  });
}

// Share one initialization between React Strict Mode effects and repair any
// missing seed records left by an interrupted first launch.
export function initializeDatabase(): Promise<void> {
  if (!initializationPromise) {
    const currentInitialization = seedMissingData();
    initializationPromise = currentInitialization;
    const releaseInitialization = () => {
      if (initializationPromise === currentInitialization) {
        initializationPromise = null;
      }
    };
    void currentInitialization.then(releaseInitialization, releaseInitialization);
  }

  return initializationPromise;
}
