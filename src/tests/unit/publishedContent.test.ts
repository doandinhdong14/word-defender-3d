import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../data/db';
import { syncPublishedLessons } from '../../data/publishedContent';

describe('Published lesson cache', () => {
  beforeEach(async () => { await Promise.all([db.wordSets.clear(), db.words.clear()]); });
  afterEach(() => vi.unstubAllGlobals());
  it('updates public lessons, removes unpublished lessons and preserves personal imports', async () => {
    const at = new Date().toISOString();
    await db.wordSets.bulkPut([{ id: 'old', owner: 'builtin', title: 'Old', entryIds: [], createdAt: at, updatedAt: at }, { id: 'personal', owner: 'local', title: 'Mine', entryIds: [], createdAt: at, updatedAt: at }]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ authoritativeLessons: true, items: [{ id: 'managed_lesson', type: 'lesson', title: 'Updated', description: '', updatedAt: at, words: [{ id: 'stable-word', english: 'apple', vietnamese: 'táo' }] }] }) }));
    await syncPublishedLessons();
    expect(await db.wordSets.get('old')).toBeUndefined();
    expect((await db.wordSets.get('personal'))?.title).toBe('Mine');
    expect((await db.words.get('stable-word'))?.setId).toBe('managed_lesson');
  });
  it('does not remove cached data when the content API fails or returns invalid data', async () => {
    const at = new Date().toISOString();
    await db.wordSets.put({ id: 'cached', owner: 'builtin', title: 'Cached', entryIds: [], createdAt: at, updatedAt: at });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    await expect(syncPublishedLessons()).rejects.toThrow();
    expect(await db.wordSets.count()).toBe(1);
  });
});
