import {
  BulletKind,
  BulletState,
  DefeatedWordEffect,
  Difficulty,
  EnemyState,
  GameMode,
  Particle,
  PoseId,
  RunSummary,
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
  public totalWaves: number = GAME_BALANCE.wavesPerRun;
  public lives: number = GAME_BALANCE.maxLives;
  public score: number = 0;
  public combo: number = 0;
  public maxCombo: number = 0;

  public enemies: EnemyState[] = [];
  public bullets: BulletState[] = [];
  public particles: Particle[] = [];
  public defeatedWordEffects: DefeatedWordEffect[] = [];

  public selectedEnemyId: string | null = null;
  public typedBuffer: string = '';
  public currentPose: PoseId = 'idle';
  public muzzleFlashMs: number = 0;

  public gameTimeMs: number = 0;
  public invulnerableUntilMs: number = 0;
  public shieldActive: boolean = false;
  public shieldExpiresAtMs: number = 0;

  public skills: SkillRuntime[] = [];
  public equippedOutfitId: string | null = null;
  public equippedHatId: string | null = null;
  public equippedShirtId: string | null = null;
  public equippedStyleId: string = 'style_yellow';
  public equippedBulletId: string = 'bullet_missile';

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
  public startedAt: string;

  private onAttempt?: GameEngineOptions['onAttempt'];
  private onRunFinished?: GameEngineOptions['onRunFinished'];
  private onSoundEffect?: GameEngineOptions['onSoundEffect'];

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
    this.equippedBulletId = options.equippedBulletId || 'bullet_missile';
    this.maxConcurrentEnemies = options.maxConcurrentEnemies ?? GAME_BALANCE.maxConcurrentEnemies;
    this.startedAt = new Date().toISOString();

    this.onAttempt = options.onAttempt;
    this.onRunFinished = options.onRunFinished;
    this.onSoundEffect = options.onSoundEffect;

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
    this.status = 'WAVE_PLAYING';
  }

  public prepareWave(waveNumber: number): void {
    this.currentWave = waveNumber;
    this.enemies = [];
    this.selectedEnemyId = null;
    this.typedBuffer = '';
    this.currentPose = 'idle';

    if (waveNumber < 3) {
      // Wave 1 or 2: Regular mobs
      const count = GAME_BALANCE.regularEnemiesPerWave[waveNumber - 1] || 6;
      this.waveQueue = this.pickWordsForQueue(count);
      this.nextSpawnTimeMs = this.gameTimeMs + 500;
      this.status = 'WAVE_PLAYING';
    } else {
      // Wave 3: Boss
      this.status = 'BOSS_PLAYING';
      this.spawnBoss();
    }
  }

  private pickWordsForQueue(count: number): VocabularyEntry[] {
    const queue: VocabularyEntry[] = [];
    for (let i = 0; i < count; i++) {
      const word = this.wordPool[(this.completedWordsCount + i) % this.wordPool.length];
      queue.push(word);
    }
    return queue;
  }

  private spawnRegularEnemy(): void {
    if (this.waveQueue.length === 0) return;
    if (this.enemies.length >= this.maxConcurrentEnemies) return;

    // Each living enemy owns one vertical lane. A lane is released only after
    // that enemy disappears, so aliens and their word labels never overlap.
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

    // Prefer the lane furthest away from every living enemy. Besides preventing
    // identical positions, this keeps labels readable on narrow phone screens.
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

    const promptText =
      this.mode === 'recall'
        ? entry.vietnamese
        : this.mode === 'listen'
        ? '🔊 [Nghe từ]'
        : entry.english;

    const enemy: EnemyState = {
      id: `mob_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      speciesId: 'purple_one_eye_alien',
      entryId: entry.id,
      word: entry.english,
      acceptedAnswers: entry.acceptedAnswers.length > 0 ? entry.acceptedAnswers : [entry.english],
      promptText,
      meaningText: entry.vietnamese,
      x: spawnX,
      y: 110,
      baseVelocityY: baseSpeed,
      statusEffects: {},
      selected: false,
      spawnedAtGameMs: this.gameTimeMs,
      width: 70,
      height: 70,
    };

    this.enemies.push(enemy);

    // In Listen mode, auto-pronounce word at spawn if supported
    if (this.mode === 'listen') {
      speakEnglishWord(entry.english, entry.audioUrl);
    }
  }

  private spawnBoss(): void {
    const bossCount = GAME_BALANCE.bossRequiredWords;
    const bossWords = this.pickWordsForQueue(bossCount);

    const firstWord = bossWords[0];
    const bossPrompts = bossWords.map((entry) => ({
      entryId: entry.id,
      word: entry.english,
      acceptedAnswers: entry.acceptedAnswers.length > 0 ? entry.acceptedAnswers : [entry.english],
      promptText:
        this.mode === 'recall'
          ? entry.vietnamese
          : this.mode === 'listen'
          ? '🔊 [Nghe từ]'
          : entry.english,
      meaningText: entry.vietnamese,
    }));

    const speedMult = GAME_BALANCE.speedMultiplierByDifficulty[this.difficulty] || 1.0;
    const bossSpeed = (GAME_BALANCE.baseEnemySpeedPxPerSec * speedMult) * 0.45; // slower boss

    const bossEnemy: EnemyState = {
      id: `boss_${Date.now()}`,
      speciesId: 'purple_one_eye_alien',
      entryId: firstWord.id,
      word: firstWord.english,
      acceptedAnswers: firstWord.acceptedAnswers.length > 0 ? firstWord.acceptedAnswers : [firstWord.english],
      promptText: bossPrompts[0].promptText,
      meaningText: firstWord.vietnamese,
      x: GAME_BALANCE.stageWidth / 2,
      y: 130,
      baseVelocityY: bossSpeed,
      statusEffects: {},
      selected: true,
      spawnedAtGameMs: this.gameTimeMs,
      width: 120,
      height: 120,
      isBoss: true,
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

    // Clamp delta between 1ms and 50ms to prevent giant leaps
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
    if (this.status === 'WAVE_PLAYING') {
      if (this.waveQueue.length > 0 && this.gameTimeMs >= this.nextSpawnTimeMs) {
        this.spawnRegularEnemy();
        this.nextSpawnTimeMs = this.gameTimeMs + GAME_BALANCE.spawnIntervalMs;
      }
    }

    // Update Enemies motion
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (enemy.pendingDefeat) {
        // Freeze dying enemy in place so it cannot breach defense line while awaiting bullet impact
        continue;
      }
      const effSpeed = calculateEffectiveSpeed(enemy, this.gameTimeMs);
      enemy.y += effSpeed * dtSec;

      // Check if enemy hit defensive line
      if (enemy.y >= GAME_BALANCE.defenseLineY) {
        this.handleEnemyBreachedDefense(enemy);
      }
    }

    // Update Projectiles
    const projResult = updateProjectiles(this.bullets, this.enemies, deltaMs, this.gameTimeMs);
    this.bullets = projResult.remainingBullets;
    this.particles.push(...projResult.newParticles);

    // Process Projectile Hits
    for (const hit of projResult.hitEnemyIds) {
      const enemy = this.enemies.find((e) => e.id === hit.enemyId);
      if (!enemy) continue;

      if (hit.kind === 'slow_shot') {
        applySlowEffect(enemy, this.gameTimeMs, 5000, 0.35);
        this.onSoundEffect?.('hit', hit.kind);
      } else {
        this.onSoundEffect?.('hit', hit.kind);
      }

      // Enemy dies ONLY when the lethal bullet actually reaches and hits it!
      if (hit.isFinishingBullet || enemy.pendingDefeat) {
        this.handleEnemyKilledByBullet(enemy, hit.matchedWord);
      }
    }

    // Safety fallback: if an enemy is marked pendingDefeat but has no bullets left in flight, finish it
    for (const enemy of [...this.enemies]) {
      if (enemy.pendingDefeat) {
        const hasIncomingBullet = this.bullets.some((b) => b.targetEnemyId === enemy.id);
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

    // Check Wave Clear condition
    if (this.status === 'WAVE_PLAYING' && this.waveQueue.length === 0 && this.enemies.length === 0) {
      this.status = 'WAVE_CLEAR';
      this.waveClearTimerMs = this.gameTimeMs + 1200;
      this.onSoundEffect?.('clear');
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

    // If no target currently selected, acquire target by first char
    if (!this.selectedEnemyId) {
      const match = findTargetByFirstChar(this.enemies, char);
      if (match) {
        this.selectTarget(match.id);
      } else {
        // Soft feedback: no target
        this.onSoundEffect?.('wrong');
        return;
      }
    }

    const currentTarget = this.enemies.find((e) => e.id === this.selectedEnemyId);
    if (!currentTarget) {
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

      // Mark enemy as pending defeat - so it will die ONLY when the bullet hits it!
      currentTarget.pendingDefeat = true;

      // Immediately log learning stats & calculate combo/score
      this.completedWordsCount += 1;
      this.attemptedEntryIds.add(currentTarget.entryId);

      const isIndependent = this.mode === 'recall' && !this.currentTargetHadHint;
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

      // Clear typed buffer and selection so user can immediately type the next monster!
      this.selectedEnemyId = null;
      this.typedBuffer = '';
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

    const kind = (this.equippedBulletId as any) || 'bullet_default';
    const bullet = createBullet(startX, startY, targetEnemyId, kind, this.gameTimeMs, isFinishingBullet, matchedWord);
    this.bullets.push(bullet);
    return bullet;
  }

  private handleEnemyKilledByBullet(enemy: EnemyState, matchedAnswer?: string): void {
    // Prevent double execution
    if (!this.enemies.some((e) => e.id === enemy.id)) return;

    // Spawn floating meaning effect when monster is defeated upon bullet impact
    this.defeatedWordEffects.push({
      id: `def_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      x: enemy.x,
      y: enemy.y,
      word: matchedAnswer || enemy.word,
      meaning: enemy.meaningText || '',
      createdAtGameMs: this.gameTimeMs,
      expiresAtGameMs: this.gameTimeMs + 2200,
    });

    if (enemy.isBoss && enemy.bossWordQueue && enemy.bossSegmentsRemaining) {
      enemy.bossSegmentsRemaining -= 1;
      this.onSoundEffect?.('boss_hit');

      // Pop mini particles on boss
      this.spawnExplosionParticles(enemy.x, enemy.y, '#C69BEC', 15);

      if (enemy.bossSegmentsRemaining <= 0) {
        // Boss Defeated!
        this.spawnExplosionParticles(enemy.x, enemy.y, '#FFD47D', 40);
        this.removeEnemy(enemy.id);
        this.finishRun('win');
      } else {
        // Advance to next boss prompt
        enemy.pendingDefeat = false;
        const nextPromptIndex = enemy.bossMaxSegments! - enemy.bossSegmentsRemaining;
        const nextPrompt = enemy.bossWordQueue[nextPromptIndex];
        if (nextPrompt) {
          enemy.entryId = nextPrompt.entryId;
          enemy.word = nextPrompt.word;
          enemy.acceptedAnswers = nextPrompt.acceptedAnswers;
          enemy.promptText = nextPrompt.promptText;
          enemy.meaningText = nextPrompt.meaningText;
          this.typedBuffer = '';
          this.targetStartTimeMs = this.gameTimeMs;
          this.currentTargetHadHint = false;

          if (this.mode === 'listen') {
            speakEnglishWord(nextPrompt.word);
          }
        }
      }
    } else {
      // Regular Mob Defeated: Pop into paper particles upon bullet impact!
      this.spawnExplosionParticles(enemy.x, enemy.y, '#C69BEC', 20);
      this.removeEnemy(enemy.id);
      if (this.selectedEnemyId === enemy.id) {
        this.selectedEnemyId = null;
        this.typedBuffer = '';
      }
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
        this.selectedEnemyId = null;
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
