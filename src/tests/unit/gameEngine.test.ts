import { describe, expect, it } from 'vitest';
import { GameEngine } from '../../game/engine/gameEngine';
import { VocabularyEntry } from '../../types/vocabulary';

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
});
