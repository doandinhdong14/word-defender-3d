import {
  BulletKind,
  BulletState,
  DefeatedWordEffect,
  Difficulty,
  EnemyProjectileState,
  EnemyState,
  GameMode,
  Particle,
  PoseId,
  RunSummary,
  RunWordSummary,
  SkillRuntime,
} from '../../types/game';
import { VocabularyEntry } from '../../types/vocabulary';
import { GAME_BALANCE } from '../../config/balance';
import { getPoseFromAngle, PONPI_RIG } from '../assets/ponpiRig';
import { cleanKey, evaluateKeystroke, normalizeInput } from './typing';
import { cycleTarget, findTargetByFirstChar } from './targeting';
import { createBullet, updateProjectiles } from './projectiles';
import {
  applyFreezePulse,
  applySlowEffect,
  calculateEffectiveSpeed,
  canActivateSkill,
} from './skills';
import { speakEnglishWord } from '../../learning/pronunciation';
import {
  REGULAR_MONSTER_SPECIES,
  BOSS_MONSTER_SPECIES,
  ALL_SPECIES_META,
} from '../assets/MonsterRenderer';

export type GameStateStatus =
  | 'READY'
  | 'WAVE_PLAYING'
  | 'WAVE_CLEAR'
  | 'BOSS_PLAYING'
  | 'PAUSED'
  | 'VICTORY'
  | 'DEFEAT';

export interface GameEngineOptions {
  setId: string;
  mode: GameMode;
  difficulty: Difficulty;
  words: VocabularyEntry[];
  equippedSkills: string[];
  equippedOutfitId?: string | null;
  equippedHatId?: string | null;
  equippedShirtId?: string | null;
  equippedStyleId: string;
  equippedBulletId?: string | null;
  ammoCounts?: Record<string, number>;
  onAmmoConsumed?: (ammoId: string, remainingCount: number) => void;
  onRoundChanged?: (round: number, phase: 'mobs' | 'boss') => void;
  maxConcurrentEnemies?: number;
  onAttempt?: (params: {
    runId: string;
    entryId: string;
    mode: GameMode;
    outcome: 'correct' | 'wrong' | 'timeout' | 'abandoned';
    typedAnswer: string;
    acceptedAnswer?: string;
    hadHint: boolean;
    wrongKeystrokes: number;
    timeToAnswerMs: number;
    slowSkillUsedOnEnemy?: boolean;
  }) => void;
  onRunFinished?: (summary: RunSummary) => void;
  onSoundEffect?: (type: 'shoot' | 'hit' | 'wrong' | 'hurt' | 'clear' | 'boss_hit' | 'skill', weaponKind?: BulletKind | string, isFinishing?: boolean) => void;
}

export class GameEngine {
  public runId: string;
  public setId: string;
  public mode: GameMode;
  public difficulty: Difficulty;
  public words: VocabularyEntry[];

  public status: GameStateStatus = 'READY';
  public currentWave: number = 1;
  public currentRound: number = 1;
  public roundPhase: 'mobs' | 'boss' = 'mobs';
  public totalWaves: number = 3;
  public lives: number = GAME_BALANCE.maxLives;
  public score: number = 0;
  public combo: number = 0;
  public maxCombo: number = 0;

  public enemies: EnemyState[] = [];
  public bullets: BulletState[] = [];
  public enemyBullets: EnemyProjectileState[] = [];
  public particles: Particle[] = [];
  public defeatedWordEffects: DefeatedWordEffect[] = [];

  public selectedEnemyId: string | null = null;
  public typedBuffer: string = '';
  public currentPose: PoseId = 'idle';
  public muzzleFlashMs: number = 0;
  public round1SpeedstersSpawned: number = 0;

  public gameTimeMs: number = 0;
  public invulnerableUntilMs: number = 0;
  public shieldActive: boolean = false;
  public shieldExpiresAtMs: number = 0;

  public skills: SkillRuntime[] = [];
  public equippedOutfitId: string | null = null;
  public equippedHatId: string | null = null;
  public equippedShirtId: string | null = null;
  public equippedStyleId: string = 'style_yellow';
  public equippedBulletId: string = 'bullet_default';
  public ammoCounts: Record<string, number> = {};

  // 3-Round Vocabulary Pools
  public round1Words: VocabularyEntry[] = [];
  public round2Words: VocabularyEntry[] = [];
  public round3Words: VocabularyEntry[] = [];

  // Session words queues
  private wordPool: VocabularyEntry[] = [];
  private waveQueue: VocabularyEntry[] = [];
  private nextSpawnTimeMs: number = 0;
  private waveClearTimerMs: number = 0;
  private maxConcurrentEnemies: number;

  // Stats
  public completedWordsCount: number = 0;
  public independentRecallCorrectCount: number = 0;
  public wrongKeystrokesCount: number = 0;
  public hintsUsedCount: number = 0;
  public targetStartTimeMs: number = 0;
  public currentTargetHadHint: boolean = false;
  public attemptedEntryIds: Set<string> = new Set();
  public wordsSummary: Map<string, RunWordSummary> = new Map();
  public startedAt: string;

  private onAttempt?: GameEngineOptions['onAttempt'];
  private onRunFinished?: GameEngineOptions['onRunFinished'];
  private onSoundEffect?: GameEngineOptions['onSoundEffect'];
  private onAmmoConsumed?: GameEngineOptions['onAmmoConsumed'];
  private onRoundChanged?: GameEngineOptions['onRoundChanged'];

  constructor(options: GameEngineOptions) {
    this.runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.setId = options.setId;
    this.mode = options.mode;
    this.difficulty = options.difficulty;
    this.words = [...options.words];
    this.wordPool = [...options.words];
    this.equippedOutfitId = options.equippedOutfitId || null;
    this.equippedHatId = options.equippedHatId ?? null;
    this.equippedShirtId = options.equippedShirtId ?? null;
    this.equippedStyleId = options.equippedStyleId || 'style_yellow';
    this.equippedBulletId = options.equippedBulletId || 'bullet_default';
    this.ammoCounts = { ...(options.ammoCounts || {}) };
    this.maxConcurrentEnemies = options.maxConcurrentEnemies ?? GAME_BALANCE.maxConcurrentEnemies;
    this.startedAt = new Date().toISOString();

    this.onAttempt = options.onAttempt;
    this.onRunFinished = options.onRunFinished;
    this.onSoundEffect = options.onSoundEffect;
    this.onAmmoConsumed = options.onAmmoConsumed;
    this.onRoundChanged = options.onRoundChanged;

    // Initialize word encounter tracking
    for (const w of this.words) {
      this.wordsSummary.set(w.id, {
        entryId: w.id,
        english: w.english,
        vietnamese: w.vietnamese,
        ipa: w.ipa,
        partOfSpeech: w.partOfSpeech,
        outcome: 'wrong',
        hadHint: false,
        wrongKeystrokes: 0,
        timeToAnswerMs: 0,
        isMastered: false,
      });
    }

    // Partition vocabulary into 3 rounds
    this.partitionRounds();

    // Initialize skill runtimes
    this.skills = options.equippedSkills.map((id) => {
      const def = (GAME_BALANCE.skills as any)[id] || {
        id,
        title: id,
        chargesPerRun: 2,
        cooldownMs: 15000,
      };
      return {
        itemId: id,
        title: def.title,
        remainingCharges: def.chargesPerRun,
        maxCharges: def.chargesPerRun,
        cooldownMs: def.cooldownMs,
        readyAtGameMs: 0,
      };
    });

    this.prepareWave(1);
  }

  public get currentRoundMode(): GameMode {
    if (this.mode === 'listen') return 'listen';
    // Bắt buộc 1 trận đấu phải có đủ cả 3 round:
    // Round 1: Gõ theo chữ có sẵn (nhìn tiếng Anh gõ tiếng Anh kèm phụ đề nghĩa)
    // Round 2: Đoán ra mà gõ (HIỆN NGHĨA TIẾNG VIỆT - BẤM TIẾNG ANH)
    // Round 3: Loạn xạ thử thách & Đại Trùm cuối (HIỆN NGHĨA TIẾNG VIỆT - BẤM TIẾNG ANH)
    if (this.currentRound === 1) return 'copy';
    if (this.currentRound === 2) return 'recall';
    return 'recall';
  }

  private partitionRounds(): void {
    // Mỗi trận đấu bao gồm đầy đủ toàn bộ từ vựng được chọn, đi qua cả 3 vòng tiến trình:
    // Round 1: Toàn bộ từ vựng dưới dạng Gõ theo chữ có sẵn (Copy) để thuộc mặt chữ
    // Round 2: Toàn bộ từ vựng dưới dạng Đoán nghĩa (Recall: Hiện Tiếng Việt -> Bấm Tiếng Anh)
    // Round 3: Toàn bộ từ vựng dưới dạng Thử thách phản xạ, quái tốc độ, quái trâu & Đại Trùm
    this.round1Words = [...this.words];
    this.round2Words = [...this.words].sort(() => Math.random() - 0.5);
    this.round3Words = [...this.words].sort(() => Math.random() - 0.5);
  }

  public prepareWave(waveNumber: number): void {
    this.currentWave = waveNumber;
    this.currentRound = waveNumber;
    this.roundPhase = 'mobs';
    this.enemies = [];
    this.enemyBullets = [];
    this.selectedEnemyId = null;
    this.typedBuffer = '';
    this.currentPose = 'idle';
    if (waveNumber === 1) {
      this.round1SpeedstersSpawned = 0;
    }

    let roundPool: VocabularyEntry[] = [];
    if (waveNumber === 1) {
      roundPool = this.round1Words;
    } else if (waveNumber === 2) {
      roundPool = this.round2Words;
    } else {
      roundPool = this.round3Words;
    }

    // 100% of words in this round pool are queued and spawned as mobs!
    // No words are ever skipped or omitted!
    this.waveQueue = [...roundPool];
    if (this.waveQueue.length === 0) {
      this.waveQueue = [...this.words];
    }

    this.nextSpawnTimeMs = this.gameTimeMs + 600;
    this.status = 'WAVE_PLAYING';
    this.onRoundChanged?.(this.currentRound, 'mobs');
  }

  private spawnRegularEnemy(): void {
    if (this.waveQueue.length === 0) return;
    if (this.enemies.length >= this.maxConcurrentEnemies) return;

    const laneCount = 7;
    const laneMargin = 120;
    const laneSpacing = (GAME_BALANCE.stageWidth - laneMargin * 2) / (laneCount - 1);
    const lanes = Array.from(
      { length: laneCount },
      (_, index) => laneMargin + index * laneSpacing
    );
    const availableLanes = lanes.filter((laneX) =>
      this.enemies.every((enemy) => Math.abs(enemy.x - laneX) > laneSpacing / 2)
    );

    if (availableLanes.length === 0) return;

    const candidateLanes = this.enemies.length === 0
      ? availableLanes
      : (() => {
          const distances = availableLanes.map((laneX) => ({
            laneX,
            distance: Math.min(...this.enemies.map((enemy) => Math.abs(enemy.x - laneX))),
          }));
          const greatestDistance = Math.max(...distances.map(({ distance }) => distance));
          return distances
            .filter(({ distance }) => distance === greatestDistance)
            .map(({ laneX }) => laneX);
        })();
    const spawnX = candidateLanes[Math.floor(Math.random() * candidateLanes.length)];
    const entry = this.waveQueue.shift()!;
    const speedMult = GAME_BALANCE.speedMultiplierByDifficulty[this.difficulty] || 1.0;
    const baseSpeed = GAME_BALANCE.baseEnemySpeedPxPerSec * speedMult;

    // Archetype selection based on Round:
    // Round 1: Start gentle! Chỉ cho quái normal, tối đa 1-2 con nhanh (speedster), không bắn, không tách.
    // Round 2: normal + speedsters + shooters + splitting monsters
    // Round 3: chaotic mix of speedsters, shooters, tanks, normal, and splitters!
    let chosenMeta: typeof REGULAR_MONSTER_SPECIES[0];
    if (this.currentRound === 1) {
      const normalSpecies = REGULAR_MONSTER_SPECIES.filter((s) => s.archetype === 'normal');
      const speedsterSpecies = REGULAR_MONSTER_SPECIES.filter((s) => s.archetype === 'speedster');

      // Tối đa 1-2 con nhanh trong cả Round 1
      if (this.round1SpeedstersSpawned < 2 && Math.random() < 0.25 && speedsterSpecies.length > 0) {
        chosenMeta = speedsterSpecies[Math.floor(Math.random() * speedsterSpecies.length)];
        this.round1SpeedstersSpawned++;
      } else {
        chosenMeta = normalSpecies[Math.floor(Math.random() * normalSpecies.length)] || REGULAR_MONSTER_SPECIES[0];
      }
    } else if (this.currentRound === 2) {
      const eligibleSpecies = REGULAR_MONSTER_SPECIES.filter((s) => s.archetype === 'normal' || s.archetype === 'speedster' || s.archetype === 'shooter');
      chosenMeta = eligibleSpecies[Math.floor(Math.random() * eligibleSpecies.length)] || REGULAR_MONSTER_SPECIES[0];
    } else {
      chosenMeta = REGULAR_MONSTER_SPECIES[Math.floor(Math.random() * REGULAR_MONSTER_SPECIES.length)] || REGULAR_MONSTER_SPECIES[0];
    }

    // Determine mode & prompt text
    const roundMode = this.currentRoundMode;
    let promptText = entry.english;
    if (roundMode === 'recall') {
      // ROUND 2 & 3: HIỆN TIẾNG VIỆT, BẤM TIẾNG ANH!
      promptText = entry.vietnamese || entry.english;
    } else {
      promptText = entry.english;
    }

    // Velocity & abilities
    const roundSpeedFactor = this.currentRound === 1 ? 0.88 : 1.0;
    let velocityY = baseSpeed * (chosenMeta.speedMultiplier || 1.0) * roundSpeedFactor;
    let hp = 1;
    let maxHp = 1;
    let tankQueue: EnemyState['tankQueue'] = undefined;

    if (chosenMeta.archetype === 'tank') {
      maxHp = chosenMeta.requiredWords || 2;
      hp = maxHp;
      tankQueue = [];
      // Grab extra words for tank from wordPool
      for (let w = 1; w < maxHp; w++) {
        const extraEntry = this.wordPool[(this.completedWordsCount + w + Math.floor(Math.random() * 6)) % this.wordPool.length];
        tankQueue.push({
          entryId: extraEntry.id,
          word: extraEntry.english,
          acceptedAnswers: extraEntry.acceptedAnswers.length > 0 ? extraEntry.acceptedAnswers : [extraEntry.english],
          promptText: roundMode === 'recall' ? (extraEntry.vietnamese || extraEntry.english) : extraEntry.english,
          meaningText: extraEntry.vietnamese,
        });
      }
    }

    // Chance to be a splitting monster (CHỈ Ở ROUND 2 & ROUND 3, ROUND 1 KHÔNG TÁCH)
    const canSplit = this.currentRound > 1 && !chosenMeta.isBoss && chosenMeta.archetype !== 'tank' && Math.random() < 0.35;

    const enemy: EnemyState = {
      id: `mob_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      speciesId: chosenMeta.id,
      entryId: entry.id,
      word: entry.english,
      acceptedAnswers: entry.acceptedAnswers.length > 0 ? entry.acceptedAnswers : [entry.english],
      promptText,
      meaningText: entry.vietnamese,
      mode: roundMode,
      x: spawnX,
      y: 110,
      baseVelocityY: velocityY,
      statusEffects: {},
      selected: false,
      spawnedAtGameMs: this.gameTimeMs,
      width: 70,
      height: 70,
      archetype: chosenMeta.archetype,
      hp,
      maxHp,
      tankQueue,
      lastShotGameMs: chosenMeta.canShoot ? this.gameTimeMs + 4000 + Math.random() * 1500 : undefined,
      canSplit,
      hasSplit: false,
      scale: 1.0,
    };

    this.enemies.push(enemy);

    if (this.mode === 'listen') {
      speakEnglishWord(entry.english, entry.audioUrl);
    }
  }

  private splitEnemyIntoThree(parent: EnemyState): void {
    const index = this.enemies.findIndex((e) => e.id === parent.id);
    if (index === -1) return;

    this.enemies.splice(index, 1);
    if (this.selectedEnemyId === parent.id) {
      this.selectedEnemyId = null;
      this.typedBuffer = '';
    }

    const roundMode = parent.mode || this.currentRoundMode;
    const offsetsX = [-90, 0, 90];

    for (let s = 0; s < 3; s++) {
      let entryWord = parent.word;
      let entryPrompt = parent.promptText;
      let entryMeaning = parent.meaningText;
      let entryId = parent.entryId;
      let acceptedAnswers = parent.acceptedAnswers;

      if (s > 0 && this.wordPool.length > 0) {
        const extraEntry = this.wordPool[(this.completedWordsCount + s + Math.floor(Math.random() * 5)) % this.wordPool.length];
        entryId = extraEntry.id;
        entryWord = extraEntry.english;
        acceptedAnswers = extraEntry.acceptedAnswers.length > 0 ? extraEntry.acceptedAnswers : [extraEntry.english];
        entryPrompt = roundMode === 'recall' ? (extraEntry.vietnamese || extraEntry.english) : extraEntry.english;
        entryMeaning = extraEntry.vietnamese;
      }

      const childX = Math.max(90, Math.min(GAME_BALANCE.stageWidth - 90, parent.x + offsetsX[s]));
      const childY = parent.y + (s === 1 ? -12 : 8);

      const childEnemy: EnemyState = {
        id: `mob_split_${Date.now()}_${s}_${Math.random().toString(36).substring(2, 5)}`,
        speciesId: parent.speciesId,
        entryId,
        word: entryWord,
        acceptedAnswers,
        promptText: entryPrompt,
        meaningText: entryMeaning,
        mode: roundMode,
        x: childX,
        y: childY,
        baseVelocityY: parent.baseVelocityY * 1.12,
        statusEffects: { ...parent.statusEffects },
        selected: false,
        spawnedAtGameMs: this.gameTimeMs,
        width: 48,
        height: 48,
        archetype: parent.archetype,
        hp: 1,
        maxHp: 1,
        canSplit: false,
        hasSplit: true,
        scale: 0.68,
      };

      this.enemies.push(childEnemy);
    }

    this.onSoundEffect?.('hit', 'shield');
  }

  private spawnBoss(): void {
    // Determine boss words based on round:
    // Round 1 Boss synthesizes key round 1 words!
    // Round 2 Boss synthesizes round 2 words in Recall mode!
    // Round 3 Boss is the Grand Boss reviewing synthesis words!
    let bossWordsPool: VocabularyEntry[] = [];
    const roundMode = this.currentRoundMode;

    if (this.currentRound === 1) {
      bossWordsPool = this.round1Words.length > 0 ? this.round1Words : this.words;
    } else if (this.currentRound === 2) {
      bossWordsPool = this.round2Words.length > 0 ? this.round2Words : this.words;
    } else {
      bossWordsPool = this.round3Words.length > 0 ? this.round3Words : this.words;
    }

    // Boss must be strong and require ALL words from the entire round!
    const bossSlice = [...bossWordsPool];
    const bossCount = bossSlice.length;
    const firstWord = bossSlice[0] || this.words[0];
    const bossPrompts = bossSlice.map((entry) => ({
      entryId: entry.id,
      word: entry.english,
      acceptedAnswers: entry.acceptedAnswers.length > 0 ? entry.acceptedAnswers : [entry.english],
      promptText: roundMode === 'recall' ? (entry.vietnamese || entry.english) : entry.english,
      meaningText: entry.vietnamese,
    }));

    const speedMult = GAME_BALANCE.speedMultiplierByDifficulty[this.difficulty] || 1.0;
    // Slower boss descent scaled to the number of words, giving ample intense typing time for all words
    const bossSpeed = Math.max(6, (GAME_BALANCE.baseEnemySpeedPxPerSec * speedMult) * (3.0 / Math.max(3, bossCount)));

    // Choose thematic boss per round
    let chosenBoss = BOSS_MONSTER_SPECIES[0].id;
    if (this.currentRound === 1) {
      chosenBoss = 'boss_magma_demon';
    } else if (this.currentRound === 2) {
      chosenBoss = 'boss_frost_emperor';
    } else {
      chosenBoss = 'boss_abyssal_overlord';
    }

    const bossEnemy: EnemyState = {
      id: `boss_${Date.now()}`,
      speciesId: chosenBoss,
      entryId: firstWord.id,
      word: firstWord.english,
      acceptedAnswers: firstWord.acceptedAnswers.length > 0 ? firstWord.acceptedAnswers : [firstWord.english],
      promptText: bossPrompts[0].promptText,
      meaningText: firstWord.vietnamese,
      mode: roundMode,
      x: GAME_BALANCE.stageWidth / 2,
      y: 130,
      baseVelocityY: bossSpeed,
      statusEffects: {},
      selected: true,
      spawnedAtGameMs: this.gameTimeMs,
      width: 140,
      height: 140,
      isBoss: true,
      archetype: 'boss',
      bossSegmentsRemaining: bossCount,
      bossMaxSegments: bossCount,
      bossWordQueue: bossPrompts,
    };

    this.enemies = [bossEnemy];
    this.selectedEnemyId = bossEnemy.id;
    this.targetStartTimeMs = this.gameTimeMs;
    this.currentTargetHadHint = false;

    if (this.mode === 'listen') {
      speakEnglishWord(firstWord.english, firstWord.audioUrl);
    }
  }

  // -------------------------------------------------------------
  // UPDATE TICK (Fixed/Clamped Delta)
  // -------------------------------------------------------------
  public update(rawDeltaMs: number): void {
    if (this.status === 'PAUSED' || this.status === 'VICTORY' || this.status === 'DEFEAT') {
      return;
    }

    const deltaMs = Math.min(Math.max(rawDeltaMs, 1), 50);
    this.gameTimeMs += deltaMs;
    const dtSec = deltaMs / 1000;

    // Decay muzzle flash
    if (this.muzzleFlashMs > 0) {
      this.muzzleFlashMs = Math.max(0, this.muzzleFlashMs - deltaMs);
    }

    // Check Shield expiration
    if (this.shieldActive && this.gameTimeMs >= this.shieldExpiresAtMs) {
      this.shieldActive = false;
    }

    // Handle Wave Spawning
    if (this.status === 'WAVE_PLAYING' && this.roundPhase === 'mobs') {
      if (this.waveQueue.length > 0 && this.gameTimeMs >= this.nextSpawnTimeMs) {
        this.spawnRegularEnemy();
        this.nextSpawnTimeMs = this.gameTimeMs + GAME_BALANCE.spawnIntervalMs;
      }
    }

    // Update Enemies motion & abilities
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (enemy.pendingDefeat) {
        continue;
      }
      const effSpeed = calculateEffectiveSpeed(enemy, this.gameTimeMs);
      enemy.y += effSpeed * dtSec;

      // Splitting mechanic: when a splitting monster travels to the middle (y >= 350 && y <= 460), it splits into 3 smaller enemies!
      if (enemy.canSplit && !enemy.hasSplit && enemy.y >= 350 && enemy.y <= 460) {
        enemy.hasSplit = true;
        if (this.enemies.length + 2 <= this.maxConcurrentEnemies) {
          this.splitEnemyIntoThree(enemy);
          continue;
        }
      }

      // Shooter firing: Shoots directly AT Ponpi (the player character)
      const meta = ALL_SPECIES_META[enemy.speciesId];
      if (meta?.canShoot && enemy.archetype === 'shooter') {
        if (!enemy.lastShotGameMs) {
          // Ra 1 tý rồi mới bắn (3.8s - 5.5s)
          enemy.lastShotGameMs = this.gameTimeMs + 4000 + Math.random() * 1500;
        } else if (this.gameTimeMs >= enemy.lastShotGameMs) {
          // Lâu lâu mới bắn 1 cái chứ không bắn dồn dập (8.5s - 12s)
          enemy.lastShotGameMs = this.gameTimeMs + 9000 + Math.random() * 3000;
          const targetX = GAME_BALANCE.ponpiCenterX;
          const targetY = GAME_BALANCE.ponpiCenterY;
          const startX = enemy.x;
          const startY = enemy.y + 30;
          const dx = targetX - startX;
          const dy = targetY - startY;
          const dist = Math.hypot(dx, dy) || 1;
          const speed = 190;

          this.enemyBullets.push({
            id: `eb_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            x: startX,
            y: startY,
            vx: (dx / dist) * speed,
            vy: (dy / dist) * speed,
            speciesId: enemy.speciesId,
            color: meta.projectileColor || '#E74C3C',
          });
          this.onSoundEffect?.('shoot', 'enemy_shot');
        }
      }

      // Boss firing: Boss shoots energy spheres
      if (enemy.isBoss) {
        if (!enemy.lastShotGameMs) {
          // Round 1 Boss bắn rất ít (chờ 12s mới bắn phát đầu)
          enemy.lastShotGameMs = this.gameTimeMs + (this.currentRound === 1 ? 12000 : 4500);
        } else if (this.gameTimeMs >= enemy.lastShotGameMs) {
          // Round 1 Boss cách 16s mới bắn 1 phát (hiếm khi bắn > 1 lần), round sau 7.5s
          enemy.lastShotGameMs = this.gameTimeMs + (this.currentRound === 1 ? 16000 : 7500);
          const targetX = GAME_BALANCE.ponpiCenterX;
          const targetY = GAME_BALANCE.ponpiCenterY;
          const startX = enemy.x;
          const startY = enemy.y + 45;
          const dx = targetX - startX;
          const dy = targetY - startY;
          const dist = Math.hypot(dx, dy) || 1;
          // Đạn boss round 1 bay chậm (120 px/s)
          const speed = this.currentRound === 1 ? 120 : 200;

          this.enemyBullets.push({
            id: `eb_boss_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            x: startX,
            y: startY,
            vx: (dx / dist) * speed,
            vy: (dy / dist) * speed,
            speciesId: enemy.speciesId,
            color: '#A855F7',
          });
          this.onSoundEffect?.('shoot', 'enemy_shot');
        }
      }

      // Check if enemy hit defensive line
      if (enemy.y >= GAME_BALANCE.defenseLineY) {
        this.handleEnemyBreachedDefense(enemy);
      }
    }

    // Update Enemy Projectiles directed at the player
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const eb = this.enemyBullets[i];
      const vx = eb.vx !== undefined ? eb.vx : 0;
      eb.x += vx * dtSec;
      eb.y += eb.vy * dtSec;

      // Check collision with Ponpi (player character) or defense line
      const distToPonpi = Math.hypot(eb.x - GAME_BALANCE.ponpiCenterX, eb.y - GAME_BALANCE.ponpiCenterY);

      if (distToPonpi <= 44 || eb.y >= GAME_BALANCE.defenseLineY) {
        this.enemyBullets.splice(i, 1);
        if (this.shieldActive) {
          this.shieldActive = false;
          this.onSoundEffect?.('skill');
          this.spawnExplosionParticles(eb.x, eb.y, '#A9DDC3', 12);
        } else {
          if (this.gameTimeMs >= this.invulnerableUntilMs) {
            this.lives -= 1;
            this.invulnerableUntilMs = this.gameTimeMs + GAME_BALANCE.invulnerableDurationMs;
            this.combo = 0;
            this.onSoundEffect?.('hurt');
            this.spawnExplosionParticles(eb.x, eb.y, '#EF6E78', 18);

            if (this.lives <= 0) {
              this.finishRun('lose');
              return;
            }
          }
        }
      } else if (eb.y > GAME_BALANCE.stageHeight + 60 || eb.x < -60 || eb.x > GAME_BALANCE.stageWidth + 60) {
        this.enemyBullets.splice(i, 1);
      }
    }

    // Update Player Projectiles
    const projResult = updateProjectiles(this.bullets, this.enemies, deltaMs, this.gameTimeMs);
    this.bullets = projResult.remainingBullets;
    this.particles.push(...projResult.newParticles);

    // Process Projectile Hits
    for (const hit of projResult.hitEnemyIds) {
      const enemy = this.enemies.find((e) => e.id === hit.enemyId);
      if (!enemy) continue;

      enemy.lastHitGameMs = this.gameTimeMs;

      // Special ammo effects
      if (hit.kind === 'slow_shot' || hit.kind === 'bullet_slow') {
        applySlowEffect(enemy, this.gameTimeMs, 1000, 0.35);
        this.onSoundEffect?.('hit', hit.kind);
      } else if (hit.kind === 'bullet_reveal') {
        enemy.revealedUntilGameMs = this.gameTimeMs + 500;
        this.onSoundEffect?.('hit', hit.kind);
      } else {
        this.onSoundEffect?.('hit', hit.kind);
      }

      // CRITICAL BUG FIX: Only the finishing lethal bullet can kill or advance enemy/boss segments!
      // Keystroke bullets must NEVER kill or advance the enemy/boss queue.
      if (hit.isFinishingBullet) {
        this.handleEnemyKilledByBullet(enemy, hit.matchedWord);
      }
    }

    // Safety fallback: only for regular mobs awaiting lethal bullet that was lost
    for (const enemy of [...this.enemies]) {
      if (enemy.pendingDefeat && !enemy.isBoss && !(enemy.archetype === 'tank' && (enemy.hp || 0) > 1)) {
        const hasIncomingBullet = this.bullets.some((b) => b.targetEnemyId === enemy.id && b.isFinishingBullet);
        if (!hasIncomingBullet) {
          this.handleEnemyKilledByBullet(enemy, enemy.word);
        }
      }
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      p.alpha -= p.decay * dtSec;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Clean up expired Defeated Word floating effects
    if (this.defeatedWordEffects.length > 0) {
      this.defeatedWordEffects = this.defeatedWordEffects.filter(
        (eff) => this.gameTimeMs < eff.expiresAtGameMs
      );
    }

    // Wave / Round progression check:
    if (this.status === 'WAVE_PLAYING' && this.waveQueue.length === 0 && this.enemies.length === 0) {
      if (this.roundPhase === 'mobs') {
        // Mobs defeated -> Transition to Boss phase of this round!
        this.roundPhase = 'boss';
        this.status = 'BOSS_PLAYING';
        this.spawnBoss();
        this.onRoundChanged?.(this.currentRound, 'boss');
      }
    } else if (this.status === 'WAVE_CLEAR' && this.gameTimeMs >= this.waveClearTimerMs) {
      this.prepareWave(this.currentWave + 1);
    }

    // Update pempom Pose direction
    this.updatePonpiPose();
  }

  private handleEnemyBreachedDefense(enemy: EnemyState): void {
    // Check Shield Bubble
    if (this.shieldActive) {
      this.shieldActive = false; // absorbs breach
      this.onSoundEffect?.('skill');
    } else {
      // Lose life if not invulnerable
      if (this.gameTimeMs >= this.invulnerableUntilMs) {
        this.lives -= 1;
        this.invulnerableUntilMs = this.gameTimeMs + GAME_BALANCE.invulnerableDurationMs;
        this.combo = 0;
        this.onSoundEffect?.('hurt');

        if (this.lives <= 0) {
          this.finishRun('lose');
          return;
        }
      }
    }

    // Log attempt as timeout
    this.attemptedEntryIds.add(enemy.entryId);
    const breachSummary = this.wordsSummary.get(enemy.entryId);
    if (breachSummary && breachSummary.outcome !== 'correct') {
      breachSummary.outcome = 'timeout';
      breachSummary.isMastered = false;
    }
    this.onAttempt?.({
      runId: this.runId,
      entryId: enemy.entryId,
      mode: this.mode,
      outcome: 'timeout',
      typedAnswer: this.selectedEnemyId === enemy.id ? this.typedBuffer : '',
      acceptedAnswer: enemy.word,
      hadHint: this.selectedEnemyId === enemy.id ? this.currentTargetHadHint : false,
      wrongKeystrokes: 0,
      timeToAnswerMs: this.gameTimeMs - enemy.spawnedAtGameMs,
    });

    // Floating missed answer effect: Reveals correct English word and Vietnamese meaning!
    this.defeatedWordEffects.push({
      id: `miss_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      x: enemy.x,
      y: Math.min(enemy.y, GAME_BALANCE.defenseLineY - 30),
      word: enemy.word,
      meaning: enemy.meaningText || '',
      isMissed: true,
      createdAtGameMs: this.gameTimeMs,
      expiresAtGameMs: this.gameTimeMs + 3200,
    });

    // Despawn enemy
    this.removeEnemy(enemy.id);

    if (enemy.isBoss) {
      this.finishRun('lose');
    }
  }

  private updatePonpiPose(): void {
    const target = this.enemies.find((e) => e.id === this.selectedEnemyId);
    if (!target) {
      this.currentPose = 'idle';
      return;
    }

    const ponpiX = GAME_BALANCE.ponpiCenterX;
    const ponpiY = GAME_BALANCE.ponpiCenterY;
    const angle = Math.atan2(target.y - ponpiY, target.x - ponpiX);
    this.currentPose = getPoseFromAngle(angle);
  }

  // -------------------------------------------------------------
  // KEYBOARD INPUT & TARGETING
  // -------------------------------------------------------------
  public handleKeyDown(event: KeyboardEvent): void {
    if (this.status === 'PAUSED' || this.status === 'VICTORY' || this.status === 'DEFEAT') {
      return;
    }

    // 1. Hotkeys 1, 2, 3 for Skills
    if (event.key === '1') {
      this.activateSkillByIndex(0);
      event.preventDefault();
      return;
    }
    if (event.key === '2') {
      this.activateSkillByIndex(1);
      event.preventDefault();
      return;
    }
    if (event.key === '3') {
      this.activateSkillByIndex(2);
      event.preventDefault();
      return;
    }

    // 2. Tab: cycle targets
    if (event.key === 'Tab') {
      event.preventDefault();
      this.cycleTargetNext();
      return;
    }

    // 3. Escape: clear typed buffer or pause
    if (event.key === 'Escape') {
      this.handleEscape();
      return;
    }

    // 4. Backspace: remove last typed char
    if (event.key === 'Backspace') {
      this.handleBackspace();
      return;
    }

    // 5. 'R' key in Listen mode: replay audio
    if (this.mode === 'listen' && (event.key === 'r' || event.key === 'R') && this.selectedEnemyId) {
      this.replayTargetAudio();
      return;
    }

    // 6. 'H' key: Hint
    if ((event.key === 'h' || event.key === 'H') && this.selectedEnemyId) {
      this.useHint();
      return;
    }

    // 7. Printable characters
    const char = cleanKey(event);
    if (!char) return;

    if (char === ' ') {
      event.preventDefault(); // prevent browser scrolling
    }

    this.handleCharacterInput(char);
  }

  public replayTargetAudio(): void {
    if (this.selectedEnemyId) {
      const target = this.enemies.find((e) => e.id === this.selectedEnemyId);
      if (target) {
        speakEnglishWord(target.word);
      }
    }
  }

  public handleEscape(): void {
    if (this.typedBuffer.length > 0) {
      this.typedBuffer = '';
    } else if (this.selectedEnemyId) {
      for (const e of this.enemies) {
        e.selected = false;
      }
      this.selectedEnemyId = null;
    } else {
      this.togglePause();
    }
  }

  public handleBackspace(): void {
    if (this.status === 'PAUSED' || this.status === 'VICTORY' || this.status === 'DEFEAT') return;
    if (this.typedBuffer.length > 0) {
      this.typedBuffer = this.typedBuffer.slice(0, -1);
    }
  }

  public handleCharacterInput(inputChar: string): void {
    if (this.status === 'PAUSED' || this.status === 'VICTORY' || this.status === 'DEFEAT') {
      return;
    }

    const char = inputChar.toLowerCase();
    if (!/^[a-zA-Z '-]$/.test(char)) return;

    let currentTarget = this.selectedEnemyId
      ? this.enemies.find((e) => e.id === this.selectedEnemyId)
      : null;

    // If no target OR (buffer is empty AND current target does not match the typed first character):
    // Dynamically auto-switch to any eligible enemy on screen that starts with char!
    if (
      !currentTarget ||
      currentTarget.pendingDefeat ||
      (this.typedBuffer === '' && !currentTarget.acceptedAnswers.some((ans) => normalizeInput(ans).startsWith(char)))
    ) {
      const match = findTargetByFirstChar(this.enemies, char);
      if (match) {
        this.selectTarget(match.id);
        currentTarget = match;
      } else if (!currentTarget || currentTarget.pendingDefeat) {
        // Soft feedback: no target
        this.onSoundEffect?.('wrong');
        return;
      }
    }

    if (!currentTarget || currentTarget.pendingDefeat) {
      this.selectedEnemyId = null;
      this.typedBuffer = '';
      return;
    }

    // Evaluate keystroke against candidate answers
    const evalResult = evaluateKeystroke(
      this.typedBuffer,
      currentTarget.acceptedAnswers,
      char
    );

    if (evalResult.isWrong) {
      this.wrongKeystrokesCount += 1;
      this.combo = 0;
      this.onSoundEffect?.('wrong');
      const ws = this.wordsSummary.get(currentTarget.entryId);
      if (ws) {
        ws.wrongKeystrokes += 1;
      }
      return;
    }

    // Valid next character
    this.typedBuffer = evalResult.newBuffer;
    this.muzzleFlashMs = 120;

    if (evalResult.isComplete) {
      const matchedAnswer = evalResult.matchedAnswer || currentTarget.word;

      // Spawn lethal finishing bullet that carries matchedWord
      const bullet = this.spawnNormalBullet(currentTarget.id, true, matchedAnswer);
      this.onSoundEffect?.('shoot', bullet.kind, true);

      // Target selection maintenance & instant segment advancement to prevent key jams
      if (currentTarget.isBoss) {
        if (currentTarget.bossSegmentsRemaining && currentTarget.bossSegmentsRemaining > 1) {
          currentTarget.bossSegmentsRemaining -= 1;
          const nextPromptIndex = currentTarget.bossMaxSegments! - currentTarget.bossSegmentsRemaining;
          const nextPrompt = currentTarget.bossWordQueue?.[nextPromptIndex];
          if (nextPrompt) {
            currentTarget.entryId = nextPrompt.entryId;
            currentTarget.word = nextPrompt.word;
            currentTarget.acceptedAnswers = nextPrompt.acceptedAnswers;
            currentTarget.promptText = nextPrompt.promptText;
            currentTarget.meaningText = nextPrompt.meaningText;
            if (this.mode === 'listen') {
              speakEnglishWord(nextPrompt.word);
            }
          }
          currentTarget.pendingDefeat = false;
          this.selectedEnemyId = currentTarget.id;
          currentTarget.selected = true;
          this.typedBuffer = '';
          this.targetStartTimeMs = this.gameTimeMs;
          this.currentTargetHadHint = false;
        } else {
          // Final boss word finished!
          currentTarget.bossSegmentsRemaining = 0;
          currentTarget.pendingDefeat = true;
          this.selectedEnemyId = null;
          this.typedBuffer = '';
        }
      } else if (currentTarget.archetype === 'tank' && (currentTarget.hp || 0) > 1 && currentTarget.tankQueue?.length) {
        currentTarget.hp = (currentTarget.hp || 1) - 1;
        const nextWord = currentTarget.tankQueue.shift()!;
        currentTarget.entryId = nextWord.entryId;
        currentTarget.word = nextWord.word;
        currentTarget.acceptedAnswers = nextWord.acceptedAnswers;
        currentTarget.promptText = nextWord.promptText;
        currentTarget.meaningText = nextWord.meaningText;

        currentTarget.pendingDefeat = false;
        this.selectedEnemyId = currentTarget.id;
        currentTarget.selected = true;
        this.typedBuffer = '';
        this.targetStartTimeMs = this.gameTimeMs;
        this.currentTargetHadHint = false;
      } else {
        currentTarget.pendingDefeat = true;
        this.selectedEnemyId = null;
        this.typedBuffer = '';
      }

      // Immediately log learning stats & calculate combo/score
      this.completedWordsCount += 1;
      this.attemptedEntryIds.add(currentTarget.entryId);

      const wordSummary = this.wordsSummary.get(currentTarget.entryId);
      if (wordSummary) {
        wordSummary.outcome = 'correct';
        wordSummary.hadHint = this.currentTargetHadHint;
        wordSummary.timeToAnswerMs = this.gameTimeMs - this.targetStartTimeMs;
        wordSummary.isMastered = !this.currentTargetHadHint;
      }

      const isIndependent =
        (currentTarget.mode === 'recall' || this.currentRoundMode === 'recall' || this.mode === 'recall') &&
        !this.currentTargetHadHint;
      if (isIndependent) {
        this.independentRecallCorrectCount += 1;
      }

      const wordLength = matchedAnswer.length;
      this.combo += 1;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      const wordScore = 100 + wordLength * 5 + Math.min(this.combo, 10) * 10;
      this.score += wordScore;

      this.onAttempt?.({
        runId: this.runId,
        entryId: currentTarget.entryId,
        mode: this.mode,
        outcome: 'correct',
        typedAnswer: this.typedBuffer,
        acceptedAnswer: matchedAnswer,
        hadHint: this.currentTargetHadHint,
        wrongKeystrokes: 0,
        timeToAnswerMs: this.gameTimeMs - this.targetStartTimeMs,
        slowSkillUsedOnEnemy: !!currentTarget.statusEffects.slowUntilGameMs,
      });
    } else {
      const bullet = this.spawnNormalBullet(currentTarget.id, false);
      this.onSoundEffect?.('shoot', bullet.kind, false);
    }
  }

  public selectTarget(enemyId: string): void {
    for (const e of this.enemies) {
      e.selected = e.id === enemyId;
    }
    this.selectedEnemyId = enemyId;
    this.typedBuffer = '';
    this.targetStartTimeMs = this.gameTimeMs;
    this.currentTargetHadHint = false;

    const target = this.enemies.find((e) => e.id === enemyId);
    if (target && this.mode === 'listen') {
      speakEnglishWord(target.word);
    }
  }

  public cycleTargetNext(): void {
    const nextTarget = cycleTarget(this.enemies, this.selectedEnemyId);
    if (nextTarget) {
      this.selectTarget(nextTarget.id);
    }
  }

  private spawnNormalBullet(targetEnemyId: string, isFinishingBullet = false, matchedWord?: string): BulletState {
    const rig = PONPI_RIG[this.currentPose] || PONPI_RIG.idle;
    const startX = GAME_BALANCE.ponpiCenterX + rig.muzzleAnchor.x;
    const startY = GAME_BALANCE.ponpiCenterY + rig.muzzleAnchor.y;

    let kind = (this.equippedBulletId as BulletKind) || 'bullet_default';

    // Special ammo check & consumption
    if (kind === 'bullet_slow' || kind === 'bullet_reveal') {
      const remaining = this.ammoCounts[kind] || 0;
      if (remaining > 0) {
        this.ammoCounts[kind] = remaining - 1;
        this.onAmmoConsumed?.(kind, this.ammoCounts[kind]);
      } else {
        // Fallback to infinite default ammo
        kind = 'bullet_default';
      }
    }

    const bullet = createBullet(startX, startY, targetEnemyId, kind, this.gameTimeMs, isFinishingBullet, matchedWord);
    this.bullets.push(bullet);
    return bullet;
  }

  private handleEnemyKilledByBullet(enemy: EnemyState, matchedAnswer?: string): void {
    // Prevent double execution
    if (!this.enemies.some((e) => e.id === enemy.id)) return;

    // Floating meaning effect
    this.defeatedWordEffects.push({
      id: `def_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      x: enemy.x,
      y: enemy.y,
      word: matchedAnswer || enemy.word,
      meaning: enemy.meaningText || '',
      createdAtGameMs: this.gameTimeMs,
      expiresAtGameMs: this.gameTimeMs + 2200,
    });

    if (enemy.isBoss) {
      this.onSoundEffect?.('boss_hit');
      // Pop mini particles on boss hit
      this.spawnExplosionParticles(enemy.x, enemy.y, '#C69BEC', 20);

      if ((enemy.bossSegmentsRemaining || 0) <= 0) {
        // Boss Defeated!
        this.spawnExplosionParticles(enemy.x, enemy.y, '#FFD47D', 45);
        this.removeEnemy(enemy.id);

        if (this.currentWave < 3) {
          // Wave 1 or 2 Boss defeated -> Clear wave and transition to next round!
          this.status = 'WAVE_CLEAR';
          this.waveClearTimerMs = this.gameTimeMs + 2000;
          this.onSoundEffect?.('clear');
        } else {
          // Wave 3 Boss defeated -> VICTORY!
          this.finishRun('win');
        }
      }
      return;
    }

    // Handle Tank monster
    if (enemy.archetype === 'tank' && (enemy.hp || 0) > 0) {
      this.onSoundEffect?.('boss_hit');
      this.spawnExplosionParticles(enemy.x, enemy.y, '#95A5A6', 16);
      return;
    }

    // Regular Mob Defeated: Pop into paper confetti
    this.spawnExplosionParticles(enemy.x, enemy.y, '#C69BEC', 20);
    this.removeEnemy(enemy.id);
    if (this.selectedEnemyId === enemy.id) {
      this.selectedEnemyId = null;
      this.typedBuffer = '';
    }

    // Regular Mob Defeated: Pop into paper confetti
    this.spawnExplosionParticles(enemy.x, enemy.y, '#C69BEC', 20);
    this.removeEnemy(enemy.id);
    if (this.selectedEnemyId === enemy.id) {
      this.selectedEnemyId = null;
      this.typedBuffer = '';
    }
  }

  private spawnExplosionParticles(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 180;
      this.particles.push({
        id: `exp_${Date.now()}_${Math.random()}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: i % 2 === 0 ? color : '#FBF8F0',
        size: 3 + Math.random() * 4,
        alpha: 1.0,
        decay: 3.0,
        shape: 'square', // paper confetti feel
      });
    }
  }

  private removeEnemy(id: string): void {
    this.enemies = this.enemies.filter((e) => e.id !== id);
    if (this.selectedEnemyId === id) {
      this.selectedEnemyId = null;
      this.typedBuffer = '';
    }
  }

  // -------------------------------------------------------------
  // SKILL ACTIVATION
  // -------------------------------------------------------------
  public activateSkillByIndex(index: number): boolean {
    const skill = this.skills[index];
    if (!skill) return false;

    if (!canActivateSkill(skill, this.gameTimeMs)) {
      return false;
    }

    if (skill.itemId === 'skill_slow_shot' || skill.itemId === 'bullet_missile') {
      // Need a living enemy to target
      let target = this.enemies.find((e) => e.id === this.selectedEnemyId);
      if (!target && this.enemies.length > 0) {
        // Target closest to defense line (largest Y)
        target = [...this.enemies].sort((a, b) => b.y - a.y)[0];
      }

      if (!target) return false;

      // Deduct charge & set cooldown
      skill.remainingCharges -= 1;
      skill.readyAtGameMs = this.gameTimeMs + skill.cooldownMs;

      // Spawn bullet
      const rig = PONPI_RIG[this.currentPose] || PONPI_RIG.idle;
      const startX = GAME_BALANCE.ponpiCenterX + rig.muzzleAnchor.x;
      const startY = GAME_BALANCE.ponpiCenterY + rig.muzzleAnchor.y;
      const bulletKind = skill.itemId === 'bullet_missile' ? 'bullet_missile' : 'slow_shot';
      const bullet = createBullet(startX, startY, target.id, bulletKind as any, this.gameTimeMs);
      this.bullets.push(bullet);

      this.onSoundEffect?.('shoot', bulletKind, true);
      return true;
    }

    if (skill.itemId === 'skill_freeze_pulse') {
      if (this.enemies.length === 0) return false;

      skill.remainingCharges -= 1;
      skill.readyAtGameMs = this.gameTimeMs + skill.cooldownMs;

      applyFreezePulse(this.enemies, this.gameTimeMs, 3000);
      this.onSoundEffect?.('skill', 'skill_freeze_pulse');
      return true;
    }

    if (skill.itemId === 'skill_shield_bubble') {
      skill.remainingCharges -= 1;
      skill.readyAtGameMs = this.gameTimeMs + skill.cooldownMs;

      this.shieldActive = true;
      this.shieldExpiresAtMs = this.gameTimeMs + 12000;
      this.onSoundEffect?.('skill', 'skill_shield_bubble');
      return true;
    }

    return false;
  }

  public useHint(): void {
    if (!this.selectedEnemyId) return;
    const target = this.enemies.find((e) => e.id === this.selectedEnemyId);
    if (!target) return;

    this.hintsUsedCount += 1;
    this.currentTargetHadHint = true;
    this.combo = 0; // using hint resets combo

    const hintSummary = this.wordsSummary.get(target.entryId);
    if (hintSummary) {
      hintSummary.hadHint = true;
    }

    // Reveal one next letter
    const expected = normalizeInput(target.word);
    const nextIdx = this.typedBuffer.length;
    if (nextIdx < expected.length) {
      const nextChar = expected[nextIdx];
      const evalResult = evaluateKeystroke(this.typedBuffer, target.acceptedAnswers, nextChar);
      this.typedBuffer = evalResult.newBuffer;
      if (evalResult.isComplete) {
        const matchedAnswer = evalResult.matchedAnswer || target.word;
        const bullet = this.spawnNormalBullet(target.id, true, matchedAnswer);
        this.onSoundEffect?.('shoot', bullet.kind, true);
        target.pendingDefeat = true;
        if (target.isBoss || (target.archetype === 'tank' && (target.hp || 0) > 1)) {
          this.selectedEnemyId = target.id;
          target.selected = true;
        } else {
          this.selectedEnemyId = null;
        }
        this.typedBuffer = '';
      } else {
        const bullet = this.spawnNormalBullet(target.id, false);
        this.onSoundEffect?.('shoot', bullet.kind, false);
      }
    }
  }

  public togglePause(): void {
    if (this.status === 'PAUSED') {
      this.status = this.currentWave === 3 ? 'BOSS_PLAYING' : 'WAVE_PLAYING';
    } else if (this.status === 'WAVE_PLAYING' || this.status === 'BOSS_PLAYING') {
      this.status = 'PAUSED';
    }
  }

  public finishRun(result: 'win' | 'lose' | 'quit'): void {
    this.status = result === 'win' ? 'VICTORY' : 'DEFEAT';

    const accuracy =
      this.completedWordsCount + this.wrongKeystrokesCount > 0
        ? Math.round((this.completedWordsCount / (this.completedWordsCount + this.wrongKeystrokesCount)) * 100)
        : 100;

    const summary: RunSummary = {
      id: this.runId,
      setId: this.setId,
      mode: this.mode,
      difficulty: this.difficulty,
      result,
      completedWords: this.completedWordsCount,
      independentRecallCorrect: this.independentRecallCorrectCount,
      wavesCleared: result === 'win' ? 3 : Math.max(0, this.currentWave - 1),
      totalScore: this.score,
      attemptedEntryIds: Array.from(this.attemptedEntryIds),
      wordResults: Array.from(this.wordsSummary.values()),
      startedAt: this.startedAt,
      endedAt: new Date().toISOString(),
      coinsEarned: 0,
      xpEarned: 0,
      accuracy,
      wrongKeystrokes: this.wrongKeystrokesCount,
      hintsUsed: this.hintsUsedCount,
    };

    this.onRunFinished?.(summary);
  }
}
