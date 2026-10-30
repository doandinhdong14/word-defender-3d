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

    // Force enemy to defense line
    enemy.y = 650;
    engine.update(50);

    // Enemy should be removed, life lost, and missed effect spawned
    expect(engine.enemies.some((e) => e.id === enemyId)).toBe(false);
    expect(engine.lives).toBe(GAME_BALANCE.maxLives - 1);
    expect(engine.defeatedWordEffects).toHaveLength(1);
    expect(engine.defeatedWordEffects[0].isMissed).toBe(true);
    expect(engine.defeatedWordEffects[0].word).toBe('dog');
    expect(engine.defeatedWordEffects[0].meaning).toBe('con chó');
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

  it('smartly retargets when player presses starting letter of another enemy with <= 1 char typed', () => {
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

    // Player switches mind or sees 'dog' approaching and presses 'd'
    engine.handleKeyDown({ key: 'd', code: 'KeyD', preventDefault: () => {} } as any);

    // Engine should switch target to 'dog' and buffer should be 'd'
    const dogTarget = engine.enemies.find((e) => e.word === 'dog')!;
    expect(engine.selectedEnemyId).toBe(dogTarget.id);
    expect(engine.typedBuffer).toBe('d');
  });
});
