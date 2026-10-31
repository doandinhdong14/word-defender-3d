import { LearningRecord, MemoryStage } from '../types/learning';
import { db } from '../data/db';
import { getActiveProfileId } from '../auth/authService';

const ONE_MINUTE_MS = 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const SRS_INTERVAL_DAYS = [0, 1, 3, 7, 14, 30, 60] as const;

export function getSrsStageLabel(srsStage: number): string {
  switch (srsStage) {
    case 1:
      return 'Nấc 1 (1 ngày)';
    case 2:
      return 'Nấc 2 (3 ngày)';
    case 3:
      return 'Nấc 3 (7 ngày)';
    case 4:
      return 'Nấc 4 (14 ngày)';
    case 5:
      return 'Nấc 5 (30 ngày)';
    case 6:
      return 'Nấc 6 (60 ngày)';
    default:
      return 'Nấc 0 (Chưa học)';
  }
}

export function getSrsStageDescription(srsStage: number): string {
  switch (srsStage) {
    case 1:
      return 'Khoảng cách 1 ngày';
    case 2:
      return 'Khoảng cách 3 ngày';
    case 3:
      return 'Khoảng cách 7 ngày';
    case 4:
      return 'Khoảng cách 14 ngày';
    case 5:
      return 'Khoảng cách 30 ngày';
    case 6:
      return 'Trí nhớ dài hạn (60 ngày)';
    default:
      return 'Chưa vào lộ trình';
  }
}

export function calculateNextReview(
  currentRecord: LearningRecord | undefined,
  mode: 'copy' | 'recall' | 'listen',
  isCorrect: boolean,
  hadHint: boolean,
  now: Date = new Date()
): {
  stage: MemoryStage;
  streak: number;
  srsStage: number;
  intervalDays: number;
  nextDueAt: string;
} {
  const currentStage = currentRecord?.stage || 'new';
  const currentSrs = currentRecord?.srsStage ?? (currentRecord?.independentRecallStreak || 0);

  // Recall mode is the primary signal of durable semantic memory
  if (mode === 'recall') {
    if (isCorrect && !hadHint) {
      const newSrsStage = Math.min(6, currentSrs + 1);
      const intervalDays = SRS_INTERVAL_DAYS[newSrsStage] || 1;
      const delayMs = intervalDays * ONE_DAY_MS;
      const nextDueAt = new Date(now.getTime() + delayMs).toISOString();
      const newStage: MemoryStage = newSrsStage >= 2 ? 'remembered' : 'learning';

      return {
        stage: newStage,
        streak: newSrsStage,
        srsStage: newSrsStage,
        intervalDays,
        nextDueAt,
      };
    } else {
      // Wrong or used hint or timeout -> reset / step down in Leitner roadmap
      const nextDueAt = new Date(now.getTime() + 10 * ONE_MINUTE_MS).toISOString(); // 10 minutes
      const newSrsStage = Math.max(0, currentSrs > 1 ? currentSrs - 1 : 0);
      return {
        stage: 'struggling',
        streak: 0,
        srsStage: newSrsStage,
        intervalDays: 0,
        nextDueAt,
      };
    }
  }

  // Copy mode: does NOT advance recall streak, sets baseline Nấc 1 if new
  if (mode === 'copy') {
    const stage: MemoryStage = isCorrect
      ? (currentStage === 'new' ? 'learning' : currentStage)
      : 'struggling';
    const delayMs = isCorrect ? ONE_DAY_MS : 10 * ONE_MINUTE_MS;
    const nextDueAt = new Date(now.getTime() + delayMs).toISOString();
    const srsStage = isCorrect ? Math.max(1, currentSrs) : 0;
    const intervalDays = isCorrect ? 1 : 0;
    return {
      stage,
      streak: currentRecord?.independentRecallStreak || 0,
      srsStage,
      intervalDays,
      nextDueAt,
    };
  }

  // Listen mode: dictation practice
  const stage: MemoryStage = isCorrect
    ? (currentStage === 'new' ? 'learning' : currentStage)
    : 'struggling';
  const delayMs = isCorrect ? ONE_DAY_MS : 10 * ONE_MINUTE_MS;
  const nextDueAt = new Date(now.getTime() + delayMs).toISOString();
  const srsStage = isCorrect ? Math.max(1, currentSrs) : 0;
  const intervalDays = isCorrect ? 1 : 0;
  return {
    stage,
    streak: currentRecord?.independentRecallStreak || 0,
    srsStage,
    intervalDays,
    nextDueAt,
  };
}

export async function updateLearningProgress(
  entryId: string,
  mode: 'copy' | 'recall' | 'listen',
  isCorrect: boolean,
  hadHint: boolean
): Promise<LearningRecord> {
  const profileId = getActiveProfileId();
  const recordId = `${profileId}:${entryId}`;
  let record = await db.learningRecords.get(recordId);
  const now = new Date();

  const { stage, streak, srsStage, intervalDays, nextDueAt } = calculateNextReview(
    record,
    mode,
    isCorrect,
    hadHint,
    now
  );

  if (!record) {
    record = {
      profileId,
      entryId: recordId,
      wordId: entryId,
      stage,
      srsStage,
      intervalDays,
      independentRecallStreak: streak,
      easeLevel: 2.5,
      successfulRecalls: isCorrect && mode === 'recall' && !hadHint ? 1 : 0,
      failedRecalls: !isCorrect && mode === 'recall' ? 1 : 0,
      lastReviewedAt: now.toISOString(),
      nextDueAt,
      separateCopyAccuracy: mode === 'copy' ? (isCorrect ? 100 : 0) : undefined,
      separateListeningAccuracy: mode === 'listen' ? (isCorrect ? 100 : 0) : undefined,
    };
  } else {
    record.stage = stage;
    record.srsStage = srsStage;
    record.intervalDays = intervalDays;
    record.independentRecallStreak = streak;
    record.lastReviewedAt = now.toISOString();
    record.nextDueAt = nextDueAt;

    if (mode === 'recall') {
      if (isCorrect && !hadHint) {
        record.successfulRecalls += 1;
      } else {
        record.failedRecalls += 1;
      }
    } else if (mode === 'copy') {
      const prevAcc = record.separateCopyAccuracy ?? 100;
      record.separateCopyAccuracy = Math.round((prevAcc + (isCorrect ? 100 : 0)) / 2);
    } else if (mode === 'listen') {
      const prevAcc = record.separateListeningAccuracy ?? 100;
      record.separateListeningAccuracy = Math.round((prevAcc + (isCorrect ? 100 : 0)) / 2);
    }
  }

  await db.learningRecords.put(record);
  return record;
}

export async function batchSaveLearningProgress(
  items: Array<{
    entryId: string;
    isMastered: boolean;
    mode?: 'copy' | 'recall' | 'listen';
    hadHint?: boolean;
  }>
): Promise<{
  updatedCount: number;
  masteredCount: number;
  strugglingCount: number;
  records: Record<string, LearningRecord>;
}> {
  const profileId = getActiveProfileId();
  const now = new Date();
  let masteredCount = 0;
  let strugglingCount = 0;

  const recordsToPut: LearningRecord[] = [];
  const recordsMap: Record<string, LearningRecord> = {};

  for (const item of items) {
    const recordId = `${profileId}:${item.entryId}`;
    const prev = await db.learningRecords.get(recordId);

    const mode = item.mode || 'recall';
    const isCorrect = item.isMastered;
    const hadHint = item.hadHint ?? false;

    const { stage, streak, srsStage, intervalDays, nextDueAt } = calculateNextReview(
      prev,
      mode,
      isCorrect,
      hadHint,
      now
    );

    if (stage === 'remembered' || srsStage >= 2) {
      masteredCount++;
    } else if (stage === 'struggling') {
      strugglingCount++;
    }

    const updated: LearningRecord = {
      profileId,
      entryId: recordId,
      wordId: item.entryId,
      stage,
      srsStage,
      intervalDays,
      independentRecallStreak: streak,
      easeLevel: prev?.easeLevel ?? 2.5,
      successfulRecalls: (prev?.successfulRecalls || 0) + (isCorrect ? 1 : 0),
      failedRecalls: (prev?.failedRecalls || 0) + (!isCorrect ? 1 : 0),
      lastReviewedAt: now.toISOString(),
      nextDueAt,
      separateCopyAccuracy: prev?.separateCopyAccuracy,
      separateListeningAccuracy: prev?.separateListeningAccuracy,
    };

    recordsToPut.push(updated);
    recordsMap[item.entryId] = updated;
  }

  if (recordsToPut.length > 0) {
    await db.learningRecords.bulkPut(recordsToPut);
  }

  return {
    updatedCount: recordsToPut.length,
    masteredCount,
    strugglingCount,
    records: recordsMap,
  };
}
