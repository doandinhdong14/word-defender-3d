import { VocabularyEntry } from '../types/vocabulary';
import { db } from '../data/db';
import { getActiveProfileId } from '../auth/authService';

export interface ChunkInfo {
  index: number;
  title: string;
  total: number;
  mastered: number;
  isCompleted: boolean;
}

export interface DeckProgressInfo {
  setId: string;
  totalWords: number;
  masteredWords: number;
  learningWords: number;
  strugglingWords: number;
  newWords: number;
  dueWords: number;
  completionPercent: number;
  chunks: ChunkInfo[];
}

/**
 * Calculates current user mastery progress for a given vocabulary deck,
 * including completion percentages, memory stages, and milestone chunks.
 */
export async function getDeckProgress(
  setId: string,
  chunkSize: number = 30
): Promise<DeckProgressInfo> {
  const wordSet = await db.wordSets.get(setId);
  let allEntries = await db.words.where('setId').equals(setId).toArray();
  if (wordSet?.entryIds && wordSet.entryIds.length > 0) {
    const orderMap = new Map(wordSet.entryIds.map((id, index) => [id, index]));
    allEntries.sort((a, b) => (orderMap.get(a.id) ?? 999999) - (orderMap.get(b.id) ?? 999999));
  }
  const profileId = getActiveProfileId();
  const allRecords = await db.learningRecords.where('profileId').equals(profileId).toArray();
  const recordMap = new Map(allRecords.map((r) => [r.wordId ?? r.entryId, r]));

  const now = new Date().toISOString();
  let masteredCount = 0;
  let learningCount = 0;
  let strugglingCount = 0;
  let newCount = 0;
  let dueCount = 0;

  for (const entry of allEntries) {
    const rec = recordMap.get(entry.id);
    if (!rec || rec.stage === 'new') {
      newCount++;
    } else if (rec.stage === 'remembered') {
      masteredCount++;
      if (rec.nextDueAt && rec.nextDueAt <= now) {
        dueCount++;
      }
    } else if (rec.stage === 'struggling') {
      strugglingCount++;
    } else {
      learningCount++;
      if (rec.nextDueAt && rec.nextDueAt <= now) {
        dueCount++;
      }
    }
  }

  const totalWords = allEntries.length;
  const completionPercent = totalWords > 0 ? Math.round((masteredCount / totalWords) * 100) : 0;

  // Calculate chunks (e.g. 30 words per chunk)
  const numChunks = Math.max(1, Math.ceil(totalWords / chunkSize));
  const chunks: ChunkInfo[] = [];

  for (let i = 0; i < numChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, totalWords);
    const slice = allEntries.slice(start, end);

    const masteredInChunk = slice.filter((w) => {
      const r = recordMap.get(w.id);
      return r && r.stage === 'remembered';
    }).length;

    chunks.push({
      index: i,
      title: `Chặng ${i + 1} (${start + 1} - ${end})`,
      total: slice.length,
      mastered: masteredInChunk,
      isCompleted: slice.length > 0 && masteredInChunk >= slice.length,
    });
  }

  return {
    setId,
    totalWords,
    masteredWords: masteredCount,
    learningWords: learningCount,
    strugglingWords: strugglingCount,
    newWords: newCount,
    dueWords: dueCount,
    completionPercent,
    chunks,
  };
}

export interface SessionWordSelectionOptions {
  targetCount?: number;
  chunkIndex?: number;
  chunkSize?: number;
  allowReviewMastered?: boolean;
}

/**
 * Anki Spaced Repetition (SRS) Word Selector:
 * 1. Prioritizes words that are DUE for review (interval elapsed).
 * 2. Prioritizes words that are STRUGGLING (errors/timeouts).
 * 3. Pulls NEW unseen words sequentially from the current deck/chunk.
 * 4. NEVER repeats words that are already MASTERED unless all new words are completed.
 */
export async function selectSessionWords(
  setId: string,
  targetCountOrOptions: number | SessionWordSelectionOptions = 30
): Promise<VocabularyEntry[]> {
  const options: SessionWordSelectionOptions =
    typeof targetCountOrOptions === 'number'
      ? { targetCount: targetCountOrOptions }
      : targetCountOrOptions;

  const targetCount = options.targetCount || 30;
  const wordSet = await db.wordSets.get(setId);
  let allEntries = await db.words.where('setId').equals(setId).toArray();
  if (allEntries.length === 0) {
    return [];
  }
  if (wordSet?.entryIds && wordSet.entryIds.length > 0) {
    const orderMap = new Map(wordSet.entryIds.map((id, index) => [id, index]));
    allEntries.sort((a, b) => (orderMap.get(a.id) ?? 999999) - (orderMap.get(b.id) ?? 999999));
  }

  const profileId = getActiveProfileId();
  const allRecords = await db.learningRecords.where('profileId').equals(profileId).toArray();
  const recordMap = new Map(allRecords.map((r) => [r.wordId ?? r.entryId, r]));

  const now = new Date().toISOString();
  const shuffle = <T>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

  // If specific chunk selected (e.g. Chặng 1, Chặng 2)
  if (options.chunkIndex !== undefined && options.chunkIndex >= 0) {
    const cSize = options.chunkSize || targetCount;
    const start = options.chunkIndex * cSize;
    const chunkPool = allEntries.slice(start, start + cSize);

    if (chunkPool.length > 0) {
      // Prioritize unmastered words in this chunk
      const unmastered = chunkPool.filter((w) => {
        const r = recordMap.get(w.id);
        return !r || r.stage !== 'remembered' || (r.nextDueAt && r.nextDueAt <= now);
      });

      if (unmastered.length >= targetCount) {
        return shuffle(unmastered).slice(0, targetCount);
      }

      // If chunk has fewer unmastered than target, include other chunk words
      const result = [...unmastered];
      const remainingNeeded = targetCount - result.length;
      const otherChunkWords = chunkPool.filter((w) => !result.some((r) => r.id === w.id));
      result.push(...shuffle(otherChunkWords).slice(0, remainingNeeded));

      return result.slice(0, targetCount);
    }
  }

  // --- SMART ANKI SRS MODE ---
  const dueWords: VocabularyEntry[] = [];
  const strugglingWords: VocabularyEntry[] = [];
  const newWords: VocabularyEntry[] = [];
  const masteredNotDueWords: VocabularyEntry[] = [];

  for (const entry of allEntries) {
    const rec = recordMap.get(entry.id);
    if (!rec || rec.stage === 'new') {
      newWords.push(entry);
    } else if (rec.stage === 'struggling') {
      strugglingWords.push(entry);
    } else if (rec.nextDueAt && rec.nextDueAt <= now) {
      dueWords.push(entry);
    } else if (rec.stage === 'remembered') {
      masteredNotDueWords.push(entry);
    } else {
      // learning stage but not due yet
      if (rec.nextDueAt && rec.nextDueAt <= now) {
        dueWords.push(entry);
      }
    }
  }

  const selected: VocabularyEntry[] = [];

  // Priority 1: Due reviews (up to 40% of session)
  const maxDue = Math.min(Math.ceil(targetCount * 0.4), dueWords.length);
  selected.push(...shuffle(dueWords).slice(0, maxDue));

  // Priority 2: Struggling words (up to 30% of session)
  const maxStruggling = Math.min(Math.ceil(targetCount * 0.3), strugglingWords.length);
  selected.push(...shuffle(strugglingWords).slice(0, maxStruggling));

  // Priority 3: Next new words from deck
  const neededAfterReviews = targetCount - selected.length;
  // Preserve order of new words from the set so users progress sequentially
  const newToAdd = newWords.slice(0, neededAfterReviews);
  selected.push(...newToAdd);

  // If still need words and there are more due or struggling words left
  if (selected.length < targetCount) {
    const remainingDue = dueWords.filter((w) => !selected.some((s) => s.id === w.id));
    const remainingStruggling = strugglingWords.filter((w) => !selected.some((s) => s.id === w.id));
    const extraReviews = shuffle([...remainingDue, ...remainingStruggling]);
    const needed = targetCount - selected.length;
    selected.push(...extraReviews.slice(0, needed));
  }

  // ONLY if all new words are exhausted and targetCount is not met:
  // Allow reviewing mastered words so the game has enough enemies to play
  if (selected.length < targetCount && newWords.length === 0) {
    const needed = targetCount - selected.length;
    const availableMastered = shuffle(
      masteredNotDueWords.filter((w) => !selected.some((s) => s.id === w.id))
    );
    selected.push(...availableMastered.slice(0, needed));
  }

  // Minimum fallback if pool is smaller than targetCount
  if (selected.length < targetCount && allEntries.length > 0) {
    const pool = shuffle(allEntries);
    let index = 0;
    while (selected.length < targetCount && selected.length < allEntries.length) {
      const candidate = pool[index % pool.length];
      if (!selected.some((s) => s.id === candidate.id)) {
        selected.push(candidate);
      }
      index++;
      if (index > pool.length * 2) break;
    }
  }

  return selected.slice(0, targetCount);
}
