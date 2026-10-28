import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../data/db';
import { exportBackupData, importBackupData } from '../../data/backup';

const emptyBackup = () => JSON.stringify({
  version: 1,
  exportedAt: new Date().toISOString(),
  data: {
    profiles: [],
    wordSets: [],
    words: [],
    learningRecords: [],
    attempts: [],
    runs: [],
    wallets: [],
    inventories: [],
    ledger: [],
    settings: [],
  },
});

describe('Backup and restore', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
  });

  it('round-trips saved data', async () => {
    await db.profiles.add({
      id: 'guest_profile',
      name: 'pempom Pilot',
      level: 2,
      xp: 125,
      createdAt: new Date().toISOString(),
    });

    const backup = await exportBackupData();
    await db.profiles.clear();
    await importBackupData(backup);

    expect((await db.profiles.get('guest_profile'))?.xp).toBe(125);
  });

  it('restores empty tables instead of retaining stale records', async () => {
    await db.profiles.add({
      id: 'stale_profile',
      name: 'Stale',
      level: 1,
      xp: 0,
      createdAt: new Date().toISOString(),
    });

    await importBackupData(emptyBackup());

    expect(await db.profiles.count()).toBe(0);
  });

  it('rejects incomplete backup data before clearing anything', async () => {
    await db.profiles.add({
      id: 'safe_profile',
      name: 'Safe',
      level: 1,
      xp: 0,
      createdAt: new Date().toISOString(),
    });

    await expect(importBackupData(JSON.stringify({ version: 1, data: { profiles: [] } })))
      .rejects.toThrow(/không hợp lệ/);
    expect(await db.profiles.get('safe_profile')).toBeDefined();
  });
});
