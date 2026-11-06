import { describe, expect, it } from 'vitest';
import { GameEngine } from '../../game/engine/gameEngine';
import { VocabularyEntry } from '../../types/vocabulary';
import { GAME_BALANCE } from '../../config/balance';

const createWords = (count: number): VocabularyEntry[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `entry_${index}`,
    setId: 'set_test',
    english: `word${index}`,
    vietnamese: `nghĩa ${index}`,
    acceptedAnswers: [`word${index}`],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }));

describe('Game Engine enemy lanes', () => {
  it('keeps every simultaneous regular enemy in a separate falling lane', () => {
    const engine = new GameEngine({
      setId: 'set_test',
      mode: 'recall',
      difficulty: 'normal',
      words: createWords(30),
      equippedSkills: [],
      equippedHatId: null,
      equippedShirtId: null,
      equippedStyleId: 'style_classic',
    });

    // Advance far enough to fill all five concurrent enemy slots.
    for (let index = 0; index < 200; index += 1) {
      engine.update(50);
    }

    expect(engine.enemies).toHaveLength(5);
    for (let left = 0; left < engine.enemies.length; left += 1) {
      for (let right = left + 1; right < engine.enemies.length; right += 1) {
        expect(Math.abs(engine.enemies[left].x - engine.enemies[right].x)).toBeGreaterThan(150);
      }
    }
  });

  it('supports a lower concurrent enemy limit for narrow mobile screens', () => {
    const engine = new GameEngine({
      setId: 'set_test',
      mode: 'recall',
      difficulty: 'normal',
      words: createWords(15),
      equippedSkills: [],
      equippedHatId: null,
      equippedShirtId: null,
      equippedStyleId: 'style_classic',
      maxConcurrentEnemies: 3,
    });

    for (let index = 0; index < 200; index += 1) {
      engine.update(50);
    }

    expect(engine.enemies).toHaveLength(3);
    for (let left = 0; left < engine.enemies.length; left += 1) {
      for (let right = left + 1; right < engine.enemies.length; right += 1) {
        expect(engine.enemies[left].x).not.toBe(engine.enemies[right].x);
      }
    }
  });

  it('populates meaningText and spawns defeatedWordEffects on correct completion', () => {
    const engine = new GameEngine({
      setId: 'set_test',
      mode: 'copy',
      difficulty: 'normal',
      words: [
        {
          id: 'word_cat',
          setId: 'set_test',
          english: 'cat',
          vietnamese: 'con mèo',
          acceptedAnswers: ['cat'],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      equippedSkills: [],
      equippedHatId: null,
      equippedShirtId: null,
      equippedStyleId: 'style_classic',
    });

    // Advance time to spawn enemy (clamped to max 50ms per tick)
    for (let i = 0; i < 15; i++) {
      engine.update(50);
    }
    expect(engine.enemies.length).toBeGreaterThan(0);
    const enemy = engine.enemies[0];
    expect(enemy.meaningText).toBe('con mèo');
    expect(enemy.word).toBe('cat');

    // Type 'c', 'a', 't'
    engine.handleKeyDown({ key: 'c', ctrlKey: false, altKey: false, metaKey: false, repeat: false, preventDefault: () => {} } as any);
    expect(engine.selectedEnemyId).toBe(enemy.id);
    expect(engine.typedBuffer).toBe('c');

    engine.handleKeyDown({ key: 'a', ctrlKey: false, altKey: false, metaKey: false, repeat: false, preventDefault: () => {} } as any);
    expect(engine.typedBuffer).toBe('ca');

    engine.handleKeyDown({ key: 't', ctrlKey: false, altKey: false, metaKey: false, repeat: false, preventDefault: () => {} } as any);
    expect(enemy.pendingDefeat).toBe(true);

    // Bullet travels to enemy
    for (let i = 0; i < 35; i++) {
      engine.update(50);
      if (engine.defeatedWordEffects.length > 0) break;
    }

    // Enemy should be defeated upon bullet impact and a defeatedWordEffect should be spawned with meaning
    expect(engine.defeatedWordEffects).toHaveLength(1);
    expect(engine.defeatedWordEffects[0].word).toBe('cat');
    expect(engine.defeatedWordEffects[0].meaning).toBe('con mèo');

    // After 2.5s, the defeated effect should expire
    for (let i = 0; i < 60; i++) {
      engine.update(50);
    }
    expect(engine.defeatedWordEffects).toHaveLength(0);
  });

  it('clears target when pressing Escape with empty typed buffer', () => {
    const engine = new GameEngine({
      setId: 'set_test',
      mode: 'recall',
      difficulty: 'normal',
      words: createWords(5),
      equippedSkills: [],
      equippedHatId: null,
      equippedShirtId: null,
      equippedStyleId: 'style_classic',
    });

    for (let i = 0; i < 15; i++) {
      engine.update(50);
    }
    expect(engine.enemies.length).toBeGreaterThan(0);

    const firstEnemy = engine.enemies[0];
    engine.selectTarget(firstEnemy.id);
    expect(engine.selectedEnemyId).toBe(firstEnemy.id);
    expect(engine.typedBuffer).toBe('');

    // Escape should deselect the enemy without pausing
    engine.handleKeyDown({ key: 'Escape', ctrlKey: false, altKey: false, metaKey: false, repeat: false, preventDefault: () => {} } as any);
    expect(engine.selectedEnemyId).toBeNull();
    expect(engine.status).toBe('WAVE_PLAYING');
  });

  it('spawns a missed answer effect showing word & meaning when enemy breaches defense line', () => {
    const engine = new GameEngine({
      setId: 'set_test',
      mode: 'copy',
      difficulty: 'normal',
      words: [
        {
          id: 'word_dog',
          setId: 'set_test',
          english: 'dog',
          vietnamese: 'con chó',
          acceptedAnswers: ['dog'],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'word_cat',
          setId: 'set_test',
          english: 'cat',
          vietnamese: 'con mèo',
          acceptedAnswers: ['cat'],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      equippedSkills: [],
      equippedHatId: null,
      equippedShirtId: null,
      equippedStyleId: 'style_classic',
    });

    for (let i = 0; i < 15; i++) {
      engine.update(50);
    }
    expect(engine.enemies.length).toBeGreaterThan(0);
    const enemy = engine.enemies[0];
    const enemyId = enemy.id;
    const enemyWord = enemy.word;
    const enemyMeaning = enemy.meaningText;

    // Force enemy to defense line
    enemy.y = 650;
    engine.update(50);

    // Enemy should be removed, life lost, and missed effect spawned
    expect(engine.enemies.some((e) => e.id === enemyId)).toBe(false);
    expect(engine.lives).toBe(GAME_BALANCE.maxLives - 1);
    expect(engine.defeatedWordEffects).toHaveLength(1);
    expect(engine.defeatedWordEffects[0].isMissed).toBe(true);
    expect(engine.defeatedWordEffects[0].word).toBe(enemyWord);
    expect(engine.defeatedWordEffects[0].meaning).toBe(enemyMeaning);
  });

  it('ensures Boss includes 100% of the words from the round', () => {
    const words = createWords(6);
    const engine = new GameEngine({
      setId: 'set_test',
      mode: 'copy',
      difficulty: 'normal',
      words,
      equippedSkills: [],
      equippedHatId: null,
      equippedShirtId: null,
      equippedStyleId: 'style_classic',
    });

    // Clear wave queue and defeat any spawned mob to trigger boss phase
    engine['waveQueue'] = [];
    engine.enemies = [];
    engine.update(50);

    expect(engine.status).toBe('BOSS_PLAYING');
    expect(engine.enemies).toHaveLength(1);
    const boss = engine.enemies[0];
    expect(boss.isBoss).toBe(true);
    // Boss must have all 6 words, not just 2!
    expect(boss.bossMaxSegments).toBe(6);
    expect(boss.bossSegmentsRemaining).toBe(6);
    expect(boss.bossWordQueue).toHaveLength(6);
  });

  it('heals synthetic IME Backspaces and seamlessly completes double-letter words like speed', () => {
    const engine = new GameEngine({
      setId: 'set_test',
      mode: 'copy',
      difficulty: 'normal',
      words: [
        {
          id: 'word_speed',
          setId: 'set_test',
          english: 'speed',
          vietnamese: 'tốc độ',
          acceptedAnswers: ['speed'],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      equippedSkills: [],
      equippedHatId: null,
      equippedShirtId: null,
      equippedStyleId: 'style_classic',
    });

    for (let i = 0; i < 15; i++) {
      engine.update(50);
    }
    expect(engine.enemies).toHaveLength(1);

    // Type 's', 'p', 'e'
    engine.handleKeyDown({ key: 's', code: 'KeyS', preventDefault: () => {} } as any);
    expect(engine.typedBuffer).toBe('s');
    engine.handleKeyDown({ key: 'p', code: 'KeyP', preventDefault: () => {} } as any);
    expect(engine.typedBuffer).toBe('sp');
    engine.handleKeyDown({ key: 'e', code: 'KeyE', preventDefault: () => {} } as any);
    expect(engine.typedBuffer).toBe('spe');

    // Simulate Unikey Telex behavior: Unikey sends synthetic Backspace then 'ê' (code KeyE)
    engine.handleKeyDown({ key: 'Backspace', code: 'Backspace', preventDefault: () => {} } as any);
    // Buffer is temporarily sliced to 'sp'
    expect(engine.typedBuffer).toBe('sp');

    // Immediately (within < 110ms), Unikey sends the transformed key 'ê' with physical code 'KeyE'
    engine.handleKeyDown({ key: 'ê', code: 'KeyE', preventDefault: () => {} } as any);

    // Engine should heal the synthetic Backspace back to 'spe' and append 'e' -> 'spee'!
    expect(engine.typedBuffer).toBe('spee');

    // Finish with 'd'
    engine.handleKeyDown({ key: 'd', code: 'KeyD', preventDefault: () => {} } as any);
    expect(engine.completedWordsCount).toBe(1);
  });

  it('keeps the current word on a typo until the player explicitly switches targets', () => {
    const engine = new GameEngine({
      setId: 'set_test',
      mode: 'copy',
      difficulty: 'normal',
      words: [
        {
          id: 'w_cat',
          setId: 'set_test',
          english: 'cat',
          vietnamese: 'con mèo',
          acceptedAnswers: ['cat'],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'w_dog',
          setId: 'set_test',
          english: 'dog',
          vietnamese: 'con chó',
          acceptedAnswers: ['dog'],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      equippedSkills: [],
      equippedHatId: null,
      equippedShirtId: null,
      equippedStyleId: 'style_classic',
    });

    for (let i = 0; i < 90; i++) {
      engine.update(50);
    }
    expect(engine.enemies.length).toBeGreaterThanOrEqual(2);

    // Player begins typing 'c' for 'cat'
    engine.handleKeyDown({ key: 'c', code: 'KeyC', preventDefault: () => {} } as any);
    expect(engine.typedBuffer).toBe('c');
    const catTarget = engine.enemies.find((e) => e.word === 'cat')!;
    expect(engine.selectedEnemyId).toBe(catTarget.id);

    engine.handleKeyDown({ key: 'd', code: 'KeyD', preventDefault: () => {} } as any);

    const dogTarget = engine.enemies.find((e) => e.word === 'dog')!;
    expect(engine.selectedEnemyId).toBe(catTarget.id);
    expect(engine.typedBuffer).toBe('c');
    expect(engine.wrongKeystrokesCount).toBe(1);

    engine.selectTarget(dogTarget.id);
    engine.handleKeyDown({ key: 'd', code: 'KeyD', preventDefault: () => {} } as any);
    expect(engine.selectedEnemyId).toBe(dogTarget.id);
    expect(engine.typedBuffer).toBe('d');
  });

  it('correctly destroys tank monster with 3 words without infinite defeatedWordEffects loop', () => {
    const words: VocabularyEntry[] = [
      { id: 'w1', setId: 'set_test', english: 'cat', vietnamese: 'mèo', acceptedAnswers: ['cat'], createdAt: '', updatedAt: '' },
      { id: 'w2', setId: 'set_test', english: 'dog', vietnamese: 'chó', acceptedAnswers: ['dog'], createdAt: '', updatedAt: '' },
      { id: 'w3', setId: 'set_test', english: 'healthy', vietnamese: 'khỏe mạnh', acceptedAnswers: ['healthy'], createdAt: '', updatedAt: '' },
    ];

    const engine = new GameEngine({
      setId: 'set_test',
      mode: 'copy',
      difficulty: 'normal',
      words,
      equippedSkills: [],
      equippedHatId: null,
      equippedShirtId: null,
      equippedStyleId: 'style_classic',
    });

    // Manually spawn a 3-word tank mob (like multi_eye_spiky)
    engine.enemies = [
      {
        id: 'tank_test',
        speciesId: 'multi_eye_spiky',
        entryId: 'w1',
        word: 'cat',
        acceptedAnswers: ['cat'],
        promptText: 'cat',
        meaningText: 'mèo',
        mode: 'copy',
        x: 360,
        y: 150,
        width: 60,
        height: 60,
        baseVelocityY: 20,
        statusEffects: {},
        selected: false,
        spawnedAtGameMs: 0,
        archetype: 'tank',
        hp: 3,
        maxHp: 3,
        tankQueue: [
          { entryId: 'w2', word: 'dog', acceptedAnswers: ['dog'], promptText: 'dog', meaningText: 'chó' },
          { entryId: 'w3', word: 'healthy', acceptedAnswers: ['healthy'], promptText: 'healthy', meaningText: 'khỏe mạnh' },
        ],
      },
    ];

    // Word 1: 'cat'
    for (const ch of 'cat') {
      engine.handleKeyDown({ key: ch, code: `Key${ch.toUpperCase()}`, preventDefault: () => {} } as any);
    }
    // Update until bullet hits
    for (let i = 0; i < 35; i++) {
      engine.update(50);
    }
    const tank = engine.enemies.find((e) => e.id === 'tank_test')!;
    expect(tank).toBeDefined();
    expect(tank.hp).toBe(2);
    expect(tank.word).toBe('dog');

    // Word 2: 'dog'
    for (const ch of 'dog') {
      engine.handleKeyDown({ key: ch, code: `Key${ch.toUpperCase()}`, preventDefault: () => {} } as any);
    }
    for (let i = 0; i < 35; i++) {
      engine.update(50);
    }
    expect(tank.hp).toBe(1);
    expect(tank.word).toBe('healthy');

    // Word 3 (final word): 'healthy'
    for (const ch of 'healthy') {
      engine.handleKeyDown({ key: ch, code: `Key${ch.toUpperCase()}`, preventDefault: () => {} } as any);
    }
    expect(tank.hp).toBe(0);
    expect(tank.pendingDefeat).toBe(true);

    // Update 50 frames (simulating multiple seconds)
    for (let i = 0; i < 50; i++) {
      engine.update(50);
    }

    // Tank MUST be completely removed from enemies
    expect(engine.enemies.some((e) => e.id === 'tank_test')).toBe(false);

    // defeatedWordEffects MUST NOT have duplicate stacked cards for 'healthy' (should only have 1 for healthy)
    const healthyEffects = engine.defeatedWordEffects.filter((eff) => eff.word === 'healthy');
    expect(healthyEffects.length).toBeLessThanOrEqual(1);
  });

  it('splitting monster splits into 3 smaller enemies upon death', () => {
    const words: VocabularyEntry[] = [
      { id: 'w1', setId: 'set_test', english: 'cat', vietnamese: 'mèo', acceptedAnswers: ['cat'], createdAt: '', updatedAt: '' },
      { id: 'w2', setId: 'set_test', english: 'dog', vietnamese: 'chó', acceptedAnswers: ['dog'], createdAt: '', updatedAt: '' },
      { id: 'w3', setId: 'set_test', english: 'bird', vietnamese: 'chim', acceptedAnswers: ['bird'], createdAt: '', updatedAt: '' },
      { id: 'w4', setId: 'set_test', english: 'fish', vietnamese: 'cá', acceptedAnswers: ['fish'], createdAt: '', updatedAt: '' },
    ];

    const engine = new GameEngine({
      setId: 'set_test',
      mode: 'copy',
      difficulty: 'normal',
      words,
      equippedSkills: [],
      equippedHatId: null,
      equippedShirtId: null,
      equippedStyleId: 'style_classic',
    });

    // Manually spawn a splitting monster
    engine.enemies = [
      {
        id: 'split_parent',
        speciesId: 'bat_purple',
        entryId: 'w1',
        word: 'cat',
        acceptedAnswers: ['cat'],
        promptText: 'cat',
        meaningText: 'mèo',
        mode: 'copy',
        x: 360,
        y: 150,
        width: 60,
        height: 60,
        baseVelocityY: 20,
        statusEffects: {},
        selected: false,
        spawnedAtGameMs: 0,
        canSplit: true,
        hasSplit: false,
      },
    ];

    // Kill the splitting monster
    for (const ch of 'cat') {
      engine.handleKeyDown({ key: ch, code: `Key${ch.toUpperCase()}`, preventDefault: () => {} } as any);
    }

    for (let i = 0; i < 35; i++) {
      engine.update(50);
    }

    // Parent is removed and exactly 3 children are spawned!
    expect(engine.enemies.some((e) => e.id === 'split_parent')).toBe(false);
    const splitChildren = engine.enemies.filter((e) => e.hasSplit);
    expect(splitChildren.length).toBe(3);
    for (const child of splitChildren) {
      expect(child.canSplit).toBe(false);
      expect(child.hasSplit).toBe(true);
      expect(child.scale).toBe(0.68);
    }
  });
});
