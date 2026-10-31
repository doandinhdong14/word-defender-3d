import { VocabularyEntry } from '../types/vocabulary';
import { db } from '../data/db';
import { getActiveProfileId } from '../auth/authService';

export interface ChunkInfo {
  index: number;
  title: string;
  total: number;
  mastered: number;
  inRoadmap: number;
  isCompleted: boolean;
}

export interface SrsRoadmapDistribution {
  srs0: number; // Chưa học (chưa vào lộ trình)
  srs1: number; // Nấc 1 (1 ngày)
  srs2: number; // Nấc 2 (3 ngày)
  srs3: number; // Nấc 3 (7 ngày)
  srs4: number; // Nấc 4 (14 ngày)
  srs5: number; // Nấc 5 (30 ngày)
  srs6: number; // Nấc 6 (60 ngày)
  dueCount: number; // Đến hạn ôn
  inRoadmapCount: number; // Tổng số từ đã vào lộ trình
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
  srsDistribution: SrsRoadmapDistribution;
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

  const srsDistribution: SrsRoadmapDistribution = {
    srs0: 0,
    srs1: 0,
    srs2: 0,
    srs3: 0,
    srs4: 0,
    srs5: 0,
    srs6: 0,
    dueCount: 0,
    inRoadmapCount: 0,
  };

  for (const entry of allEntries) {
    const rec = recordMap.get(entry.id);
    const srsStage = rec?.srsStage ?? (rec?.stage === 'remembered' ? 2 : rec?.stage === 'learning' ? 1 : 0);
    const isDue = Boolean(rec?.nextDueAt && rec.nextDueAt <= now);

    if (isDue) {
      dueCount++;
      srsDistribution.dueCount++;
    }

    if (!rec || rec.stage === 'new' || srsStage === 0) {
      newCount++;
      srsDistribution.srs0++;
    } else {
      srsDistribution.inRoadmapCount++;
      if (srsStage === 1) srsDistribution.srs1++;
      else if (srsStage === 2) srsDistribution.srs2++;
      else if (srsStage === 3) srsDistribution.srs3++;
      else if (srsStage === 4) srsDistribution.srs4++;
      else if (srsStage === 5) srsDistribution.srs5++;
      else if (srsStage >= 6) srsDistribution.srs6++;
    }

    if (rec?.stage === 'remembered' || srsStage >= 2) {
      masteredCount++;
    } else if (rec?.stage === 'struggling') {
      strugglingCount++;
    } else if (srsStage >= 1) {
      learningCount++;
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

    const inRoadmapInChunk = slice.filter((w) => {
      const r = recordMap.get(w.id);
      const stage = r?.srsStage ?? (r?.stage === 'remembered' ? 2 : r?.stage === 'learning' ? 1 : 0);
      return stage >= 1;
    }).length;

    const masteredInChunk = slice.filter((w) => {
      const r = recordMap.get(w.id);
      return r && (r.stage === 'remembered' || (r.srsStage ?? 0) >= 2);
    }).length;

    chunks.push({
      index: i,
      title: `Chặng ${i + 1} (${start + 1} - ${end})`,
      total: slice.length,
      mastered: masteredInChunk,
      inRoadmap: inRoadmapInChunk,
      isCompleted: slice.length > 0 && inRoadmapInChunk >= slice.length,
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
    srsDistribution,
  };
}

export interface SessionWordSelectionOptions {
  targetCount?: number;
  chunkIndex?: number;
  chunkSize?: number;
  allowReviewMastered?: boolean;
  shuffle?: boolean; // Default: true (Học không theo thứ tự)
}

/**
 * Anki Spaced Repetition (SRS) Word Selector:
 * 1. Prioritizes words that are DUE for review (interval elapsed).
 * 2. Prioritizes words that are STRUGGLING (errors/timeouts).
 * 3. Pulls NEW unseen words from the current deck/chunk (shuffled by default when shuffle !== false).
 * 4. NEVER repeats words that are already advancing in the SRS roadmap unless needed for reviews.
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
  const isShuffle = options.shuffle !== false; // Default: TRUE (học không theo thứ tự)

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
        const srsStage = r?.srsStage ?? (r?.stage === 'remembered' ? 2 : 0);
        return !r || srsStage < 2 || (r.nextDueAt && r.nextDueAt <= now);
      });

      const poolToTake = isShuffle ? shuffle(unmastered) : unmastered;
      if (poolToTake.length >= targetCount) {
        return poolToTake.slice(0, targetCount);
      }

      // If chunk has fewer unmastered than target, include other chunk words
      const result = [...poolToTake];
      const remainingNeeded = targetCount - result.length;
      const otherChunkWords = chunkPool.filter((w) => !result.some((r) => r.id === w.id));
      result.push(...(isShuffle ? shuffle(otherChunkWords) : otherChunkWords).slice(0, remainingNeeded));

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
    const srsStage = rec?.srsStage ?? (rec?.stage === 'remembered' ? 2 : 0);

    if (!rec || rec.stage === 'new' || srsStage === 0) {
      newWords.push(entry);
    } else if (rec.stage === 'struggling') {
      strugglingWords.push(entry);
    } else if (rec.nextDueAt && rec.nextDueAt <= now) {
      dueWords.push(entry);
    } else if (rec.stage === 'remembered' || srsStage >= 2) {
      masteredNotDueWords.push(entry);
    } else {
      // learning stage but not due yet
      if (rec.nextDueAt && rec.nextDueAt <= now) {
        dueWords.push(entry);
      }
    }
  }

  const selected: VocabularyEntry[] = [];

  // Priority 1: Next new unseen words from deck
  // If isShuffle is true (default): words are picked randomly ("học ko theo thứ tự")
  // If isShuffle is false: words are picked in sequential list order
  const newSource = isShuffle ? shuffle(newWords) : newWords;
  const newToAdd = newSource.slice(0, targetCount);
  selected.push(...newToAdd);

  // Priority 2: ONLY when running low on new words in the deck ("bao giờ thiếu từ quá thì mới lôi từ cũ ra"):
  if (selected.length < targetCount) {
    const reviewsPool = isShuffle
      ? shuffle([...strugglingWords, ...dueWords, ...masteredNotDueWords])
      : [...strugglingWords, ...dueWords, ...masteredNotDueWords];
    for (const w of reviewsPool) {
      if (selected.length >= targetCount) break;
      if (!selected.some((s) => s.id === w.id)) {
        selected.push(w);
      }
    }
  }

  // Minimum fallback if pool is smaller than targetCount
  if (selected.length < targetCount && allEntries.length > 0) {
    const pool = isShuffle ? shuffle(allEntries) : allEntries;
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

  const finalResult = isShuffle ? shuffle(selected) : selected;
  return finalResult.slice(0, targetCount);
}
