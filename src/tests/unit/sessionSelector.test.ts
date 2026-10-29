import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../data/db';
import { getDeckProgress, selectSessionWords } from '../../learning/sessionSelector';
import { batchSaveLearningProgress } from '../../learning/scheduler';
import { VocabularyEntry } from '../../types/vocabulary';

describe('Deck Progress & Session Selector (Anki SRS)', () => {
  const testSetId = 'test-set-1';
  const now = new Date().toISOString();
  const mockWords: VocabularyEntry[] = Array.from({ length: 50 }, (_, i) => ({
    id: `w_${i + 1}`,
    setId: testSetId,
    english: `word${i + 1}`,
    vietnamese: `nghia${i + 1}`,
    acceptedAnswers: [`word${i + 1}`],
    partOfSpeech: 'noun',
    ipa: `/wɜːd${i + 1}/`,
    exampleEn: `Example ${i + 1}`,
    exampleVi: `Ví dụ ${i + 1}`,
    createdAt: now,
    updatedAt: now,
  }));

  beforeEach(async () => {
    await db.wordSets.clear();
    await db.words.clear();
    await db.learningRecords.clear();

    await db.wordSets.add({
      id: testSetId,
      title: 'Test Set',
      owner: 'local',
      entryIds: mockWords.map((w) => w.id),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await db.words.bulkAdd(mockWords);
  });

  it('calculates initial deck progress with 0% completion and chunk breakdown', async () => {
    const progress = await getDeckProgress(testSetId, 20);
    expect(progress.totalWords).toBe(50);
    expect(progress.masteredWords).toBe(0);
    expect(progress.newWords).toBe(50);
    expect(progress.completionPercent).toBe(0);
    // 50 words / 20 chunk size = 3 chunks (20, 20, 10)
    expect(progress.chunks.length).toBe(3);
    expect(progress.chunks[0].total).toBe(20);
    expect(progress.chunks[0].isCompleted).toBe(false);
    expect(progress.chunks[2].total).toBe(10);
  });

  it('batch saves learning progress and updates stages accurately', async () => {
    const saveResult = await batchSaveLearningProgress([
      { entryId: 'w_1', isMastered: true },
      { entryId: 'w_2', isMastered: false },
      { entryId: 'w_3', isMastered: true },
    ]);

    expect(saveResult.updatedCount).toBe(3);
    expect(saveResult.strugglingCount).toBe(1);

    // Save w_1 again as mastered -> moves to stage 'remembered'
    const secondSave = await batchSaveLearningProgress([
      { entryId: 'w_1', isMastered: true },
    ]);
    expect(secondSave.masteredCount).toBe(1);

    const progress = await getDeckProgress(testSetId, 20);
    expect(progress.masteredWords).toBe(1);
    expect(progress.strugglingWords).toBe(1);
    expect(progress.learningWords).toBe(1);
    expect(progress.completionPercent).toBe(2); // 1/50 = 2%
  });

  it('selects session words excluding remembered words when new words are available', async () => {
    // Mark w_1 as remembered with future due date (3 days later)
    await batchSaveLearningProgress([
      { entryId: 'w_1', isMastered: true },
    ]);
    await batchSaveLearningProgress([
      { entryId: 'w_1', isMastered: true },
    ]);

    const session = await selectSessionWords(testSetId, 10);
    expect(session.length).toBe(10);
    // w_1 must NOT be included because it is mastered and not due
    const hasW1 = session.some((w) => w.id === 'w_1');
    expect(hasW1).toBe(false);
  });

  it('selects words within a specific chunk when chunkIndex is specified', async () => {
    // Select chunk 1 (words index 20 to 39: w_21 to w_40)
    const session = await selectSessionWords(testSetId, {
      chunkIndex: 1,
      chunkSize: 20,
      targetCount: 10,
    });

    expect(session.length).toBe(10);
    // All returned words must belong to chunk 1 (w_21 to w_40)
    for (const w of session) {
      const num = parseInt(w.id.replace('w_', ''), 10);
      expect(num).toBeGreaterThanOrEqual(21);
      expect(num).toBeLessThanOrEqual(40);
    }
  });
});
