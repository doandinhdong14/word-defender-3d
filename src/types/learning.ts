export type MemoryStage = 'new' | 'learning' | 'remembered' | 'due' | 'struggling';

export interface LearningRecord {
  profileId?: string;
  entryId: string;
  wordId?: string;
  stage: MemoryStage;
  srsStage?: number;             // 0..6 (Nấc 0..6 trong lộ trình lặp lại ngắt quãng)
  intervalDays?: number;         // 0, 1, 3, 7, 14, 30, 60
  independentRecallStreak: number;
  easeLevel: number;             // 0..5
  successfulRecalls: number;
  failedRecalls: number;
  lastReviewedAt?: string;
  nextDueAt?: string;
  separateCopyAccuracy?: number;
  separateListeningAccuracy?: number;
}

export interface Attempt {
  id: string;
  profileId?: string;
  runId: string;
  entryId: string;
  mode: 'copy' | 'recall' | 'listen';
  outcome: 'correct' | 'wrong' | 'timeout' | 'abandoned';
  typedAnswer: string;
  acceptedAnswer?: string;
  hadHint: boolean;
  wrongKeystrokes: number;
  timeToAnswerMs: number;
  slowSkillUsedOnEnemy?: boolean;
  occurredAt: string;
}
