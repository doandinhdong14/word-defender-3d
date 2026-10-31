import { describe, it, expect } from 'vitest';
import { cycleTarget, findTargetByFirstChar } from '../../game/engine/targeting';
import { EnemyState } from '../../types/game';

describe('Targeting Engine', () => {
  const createMockEnemy = (id: string, word: string, y: number, aliases: string[] = []): EnemyState => ({
    id,
    speciesId: 'purple_one_eye_alien',
    entryId: `entry_${id}`,
    word,
    acceptedAnswers: [word, ...aliases],
    promptText: word,
    x: 300,
    y,
    baseVelocityY: 22,
    statusEffects: {},
    selected: false,
    spawnedAtGameMs: 1000,
    width: 60,
    height: 60,
  });

  it('selects enemy closest to defensive line (largest Y) on initial letter conflict', () => {
    // Both 'improve' and 'imagine' start with 'i'
    const enemy1 = createMockEnemy('mob1', 'improve', 200);
    const enemy2 = createMockEnemy('mob2', 'imagine', 450); // closer to defense line

    const target = findTargetByFirstChar([enemy1, enemy2], 'i');
    expect(target).not.toBeNull();
    expect(target?.id).toBe('mob2');
  });

  it('returns null if no enemy matches first letter', () => {
    const enemy1 = createMockEnemy('mob1', 'improve', 200);
    const target = findTargetByFirstChar([enemy1], 'z');
    expect(target).toBeNull();
  });

  it('recognizes aliases when targeting by first char', () => {
    const enemy = createMockEnemy('mob1', 'improve', 200, ['better']);
    const target = findTargetByFirstChar([enemy], 'b');
    expect(target).not.toBeNull();
    expect(target?.id).toBe('mob1');
  });

  it('targets the displayed word in copy mode instead of an invisible alias', () => {
    const enemy = createMockEnemy('mob1', 'improve', 200, ['better']);
    enemy.mode = 'copy';
    expect(findTargetByFirstChar([enemy], 'b')).toBeNull();
    expect(findTargetByFirstChar([enemy], 'i')?.id).toBe('mob1');
  });

  it('cycles across living enemies in deterministic order on Tab', () => {
    const e1 = createMockEnemy('e1', 'apple', 100);
    const e2 = createMockEnemy('e2', 'banana', 300);
    const e3 = createMockEnemy('e3', 'cherry', 500);

    // Initial cycle with no current target picks first (largest Y: e3)
    const next1 = cycleTarget([e1, e2, e3], null);
    expect(next1?.id).toBe('e3');

    // Next from e3 should pick e2
    const next2 = cycleTarget([e1, e2, e3], 'e3');
    expect(next2?.id).toBe('e2');

    // Next from e2 should pick e1
    const next3 = cycleTarget([e1, e2, e3], 'e2');
    expect(next3?.id).toBe('e1');

    // Wrap around from e1 should pick e3
    const next4 = cycleTarget([e1, e2, e3], 'e1');
    expect(next4?.id).toBe('e3');
  });
});
