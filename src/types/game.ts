export type PoseId = 'idle' | 'fire_up_left' | 'fire_up' | 'fire_up_right' | 'fire_left' | 'fire_right';
export type Difficulty = 'beginner' | 'easy' | 'normal' | 'hard' | 'nightmare';
export type GameMode = 'copy' | 'recall' | 'listen';

export interface StatusEffects {
  slowUntilGameMs?: number;
  slowMultiplier?: number;
  freezeUntilGameMs?: number;
  freezeMultiplier?: number;
}

export interface EnemyState {
  id: string;
  speciesId: string;
  entryId: string;
  word: string;                      // primary expected answer
  acceptedAnswers: string[];         // all valid aliases
  promptText: string;                // text shown on WordTag
  meaningText?: string;               // Vietnamese meaning
  mode?: GameMode;                    // Mode for this enemy: 'copy' | 'recall' | 'listen'
  x: number;
  y: number;
  baseVelocityY: number;
  statusEffects: StatusEffects;
  selected: boolean;
  spawnedAtGameMs: number;
  width: number;
  height: number;
  isBoss?: boolean;
  bossSegmentsRemaining?: number;
  bossMaxSegments?: number;
  bossWordQueue?: Array<{
    entryId: string;
    word: string;
    acceptedAnswers: string[];
    promptText: string;
    meaningText?: string;
  }>;
  pendingDefeat?: boolean;
  lastHitGameMs?: number;
  archetype?: 'normal' | 'speedster' | 'shooter' | 'tank' | 'boss';
  hp?: number;
  maxHp?: number;
  tankQueue?: Array<{
    entryId: string;
    word: string;
    acceptedAnswers: string[];
    promptText: string;
    meaningText?: string;
  }>;
  lastShotGameMs?: number;
  revealedUntilGameMs?: number;
  canSplit?: boolean;
  hasSplit?: boolean;
  scale?: number;
}

export interface EnemyProjectileState {
  id: string;
  x: number;
  y: number;
  vx?: number;
  vy: number;
  speciesId: string;
  color: string;
}

export interface DefeatedWordEffect {
  id: string;
  x: number;
  y: number;
  word: string;
  meaning: string;
  isMissed?: boolean;
  createdAtGameMs: number;
  expiresAtGameMs: number;
}

export type BulletKind =
  | 'normal'
  | 'bullet_default'
  | 'slow_shot'
  | 'bullet_slow'
  | 'bullet_reveal'
  | 'freeze_pulse'
  | 'bullet_missile'
  | 'bullet_shuriken'
  | 'bullet_kunai'
  | 'bullet_soccer'
  | 'bullet_basketball'
  | 'bullet_laser'
  | 'bullet_fireball'
  | 'bullet_crystal';

export interface BulletState {
  id: string;
  x: number;
  y: number;
  targetEnemyId: string;
  kind: BulletKind;
  speed: number;
  spawnedAtGameMs: number;
  createdAt: number;
  angle?: number;
  isFinishingBullet?: boolean;
  matchedWord?: string;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
  shape?: 'circle' | 'square' | 'spark';
}

export interface SkillRuntime {
  itemId: string;
  title: string;
  remainingCharges: number;
  maxCharges: number;
  cooldownMs: number;
  readyAtGameMs: number;
}

export interface RunWordSummary {
  entryId: string;
  english: string;
  vietnamese: string;
  ipa?: string;
  partOfSpeech?: string;
  outcome: 'correct' | 'wrong' | 'timeout';
  hadHint: boolean;
  wrongKeystrokes: number;
  timeToAnswerMs: number;
  isMastered: boolean;
  srsStage?: number;             // Nấc 0..6 trong lộ trình lặp lại ngắt quãng
  intervalDays?: number;         // Khoảng cách ngày (1, 3, 7, 14, 30, 60)
  nextDueAt?: string;
}

export interface RunSummary {
  id: string;
  profileId?: string;
  setId: string;
  mode: GameMode;
  difficulty: Difficulty;
  result: 'win' | 'lose' | 'quit';
  completedWords: number;
  independentRecallCorrect: number;
  wavesCleared: number;
  totalScore: number;
  attemptedEntryIds: string[];
  wordResults?: RunWordSummary[];
  startedAt: string;
  endedAt: string;
  rewardedAt?: string;
  coinsEarned: number;
  xpEarned: number;
  accuracy: number;
  wrongKeystrokes: number;
  hintsUsed: number;
}
