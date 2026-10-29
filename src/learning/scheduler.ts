import { LearningRecord, MemoryStage } from '../types/learning';
import { db } from '../data/db';
import { getActiveProfileId } from '../auth/authService';

const ONE_MINUTE_MS = 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function calculateNextReview(
  currentRecord: LearningRecord | undefined,
  mode: 'copy' | 'recall' | 'listen',
  isCorrect: boolean,
  hadHint: boolean,
  now: Date = new Date()
): { stage: MemoryStage; streak: number; nextDueAt: string } {
  const currentStage = currentRecord?.stage || 'new';
  const currentStreak = currentRecord?.independentRecallStreak || 0;

  // Recall mode is the primary signal of durable semantic memory
  if (mode === 'recall') {
    if (isCorrect && !hadHint) {
      const newStreak = currentStreak + 1;
      let newStage: MemoryStage = 'learning';
      let delayMs = ONE_DAY_MS;

      if (newStreak >= 2) {
        newStage = 'remembered';
      }

      if (newStreak === 1) {
        delayMs = ONE_DAY_MS; // 1 day
      } else if (newStreak === 2) {
        delayMs = 3 * ONE_DAY_MS; // 3 days
      } else if (newStreak === 3) {
        delayMs = 7 * ONE_DAY_MS; // 7 days
      } else if (newStreak === 4) {
        delayMs = 14 * ONE_DAY_MS; // 14 days
      } else if (newStreak === 5) {
        delayMs = 30 * ONE_DAY_MS; // 30 days
      } else {
        delayMs = 60 * ONE_DAY_MS; // 60 days max cap
      }

      const nextDueAt = new Date(now.getTime() + delayMs).toISOString();
      return { stage: newStage, streak: newStreak, nextDueAt };
    } else {
      // Wrong or used hint or timeout
      const nextDueAt = new Date(now.getTime() + 10 * ONE_MINUTE_MS).toISOString(); // 10 minutes
      return { stage: 'struggling', streak: 0, nextDueAt };
    }
  }

  // Copy mode: does NOT grant 'remembered', keeps stage or moves to learning if new
  if (mode === 'copy') {
    const stage: MemoryStage = isCorrect
      ? (currentStage === 'new' ? 'learning' : currentStage)
      : 'struggling';
    const delayMs = isCorrect ? ONE_DAY_MS : 10 * ONE_MINUTE_MS;
    const nextDueAt = new Date(now.getTime() + delayMs).toISOString();
    return { stage, streak: currentStreak, nextDueAt };
  }

  // Listen mode: dictation practice, does NOT grant 'remembered'
  const stage: MemoryStage = isCorrect
    ? (currentStage === 'new' ? 'learning' : currentStage)
    : 'struggling';
  const delayMs = isCorrect ? ONE_DAY_MS : 10 * ONE_MINUTE_MS;
  const nextDueAt = new Date(now.getTime() + delayMs).toISOString();
  return { stage, streak: currentStreak, nextDueAt };
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

  const { stage, streak, nextDueAt } = calculateNextReview(record, mode, isCorrect, hadHint, now);

  if (!record) {
    record = {
      profileId,
      entryId: recordId,
      wordId: entryId,
      stage,
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
): Promise<{ updatedCount: number; masteredCount: number; strugglingCount: number }> {
  const profileId = getActiveProfileId();
  const now = new Date();
  let masteredCount = 0;
  let strugglingCount = 0;

  const recordsToPut: LearningRecord[] = [];

  for (const item of items) {
    const recordId = `${profileId}:${item.entryId}`;
    const prev = await db.learningRecords.get(recordId);

    const mode = item.mode || 'recall';
    const isCorrect = item.isMastered;
    const hadHint = item.hadHint ?? false;

    const { stage, streak, nextDueAt } = calculateNextReview(prev, mode, isCorrect, hadHint, now);

    if (stage === 'remembered') {
      masteredCount++;
    } else if (stage === 'struggling') {
      strugglingCount++;
    }

    const updated: LearningRecord = {
      profileId,
      entryId: recordId,
      wordId: item.entryId,
      stage,
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
  }

  if (recordsToPut.length > 0) {
    await db.learningRecords.bulkPut(recordsToPut);
  }

  return {
    updatedCount: recordsToPut.length,
    masteredCount,
    strugglingCount,
  };
}
