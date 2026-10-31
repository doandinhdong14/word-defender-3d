import { describe, expect, it, vi } from 'vitest';
import { GameEngine } from '../../game/engine/gameEngine';
import { NativeTypingInput, nativeTextEdit } from '../../game/engine/nativeTyping';
import type { EnemyState, GameMode } from '../../types/game';

const word = (english: string) => ({
  id: english, setId: 'test', english, vietnamese: english,
  acceptedAnswers: [english], createdAt: '', updatedAt: '',
});

function createEngine(answers: string[], mode: GameMode = 'copy') {
  const onAttempt = vi.fn();
  const engine = new GameEngine({
    setId: 'test', mode, difficulty: 'normal', words: answers.map(word),
    equippedSkills: [], equippedStyleId: 'style_classic', onAttempt,
  });
  engine.enemies = answers.map((answer, index): EnemyState => ({
    id: `enemy_${index}`, speciesId: 'test', entryId: answer, word: answer,
    acceptedAnswers: [answer], promptText: answer, mode,
    x: 200 + index * 200, y: 200, baseVelocityY: 0, statusEffects: {},
    selected: false, spawnedAtGameMs: 0, width: 70, height: 70,
  }));
  return { engine, onAttempt };
}

const press = (engine: GameEngine, key: string, options: KeyboardEventInit = {}) => {
  engine.handleKeyDown(new KeyboardEvent('keydown', {
    key, code: /^[a-z]$/i.test(key) ? `Key${key.toUpperCase()}` : key, ...options,
  }));
};

describe('Keyboard input regressions', () => {
  it('requires the entire displayed copy word even when an alias is its prefix', () => {
    const { engine } = createEngine(['laboratory', 'orange']);
    engine.enemies[0].acceptedAnswers = ['lab', 'laboratory'];
    for (const key of 'lab') press(engine, key);
    expect(engine.completedWordsCount).toBe(0);
    expect(engine.typedBuffer).toBe('lab');
    for (const key of 'oratory') press(engine, key);
    expect(engine.completedWordsCount).toBe(1);
    expect(engine.typedBuffer).toBe('');
    expect(engine.selectedEnemyId).toBeNull();
  });

  it('accepts an alternate answer when recalling a meaning', () => {
    const { engine } = createEngine(['laboratory'], 'recall');
    engine.enemies[0].acceptedAnswers = ['laboratory', 'lab'];
    for (const key of 'lab') press(engine, key);
    expect(engine.completedWordsCount).toBe(1);
  });
  it.each(['copy', 'recall', 'listen'] as const)('types H and R as letters in %s mode', (mode) => {
    const { engine } = createEngine(['rather'], mode);
    for (const key of 'rather') press(engine, key);
    expect(engine.completedWordsCount).toBe(1);
    expect(engine.hintsUsedCount).toBe(0);
    expect(engine.wrongKeystrokesCount).toBe(0);
  });

  it('requires separate presses for double letters and never carries held keys into the next word', () => {
    const { engine } = createEngine(['speed', 'dog']);
    for (const key of 'spe') press(engine, key);
    press(engine, 'e', { repeat: true });
    expect(engine.typedBuffer).toBe('spe');
    press(engine, 'e');
    press(engine, 'd');
    press(engine, 'd', { repeat: true });
    expect(engine.completedWordsCount).toBe(1);
    expect(engine.typedBuffer).toBe('');
    expect(engine.selectedEnemyId).toBeNull();
    press(engine, 'd');
    expect(engine.typedBuffer).toBe('d');
  });

  it.each(['e', 'E'])('preserves a real Backspace followed quickly by %s', (key) => {
    const { engine } = createEngine(['speed']);
    for (const char of 'spe') press(engine, char);
    press(engine, 'Backspace');
    press(engine, key);
    expect(engine.typedBuffer).toBe('spe');
    expect(engine.completedWordsCount).toBe(0);
  });

  it('does not restore an old word after changing targets', () => {
    const { engine } = createEngine(['speed', 'book']);
    for (const char of 'spe') press(engine, char);
    press(engine, 'Backspace');
    engine.selectTarget('enemy_1');
    press(engine, 'Process', { code: 'KeyB', isComposing: true });
    expect(engine.typedBuffer).toBe('b');
  });

  it('keeps hint completion and learning records attached to the finished boss word', () => {
    const { engine, onAttempt } = createEngine(['cat', 'dog'], 'recall');
    const boss = engine.enemies[0];
    engine.enemies = [boss];
    boss.isBoss = true;
    boss.bossMaxSegments = 2;
    boss.bossSegmentsRemaining = 2;
    boss.bossWordQueue = ['cat', 'dog'].map(answer => ({
      entryId: answer, word: answer, acceptedAnswers: [answer], promptText: answer,
    }));
    engine.selectTarget(boss.id);
    engine.update(50);
    press(engine, 'c');
    press(engine, 'a');
    press(engine, 'F1');
    expect(engine.completedWordsCount).toBe(1);
    expect(boss.word).toBe('dog');
    expect(boss.pendingDefeat).toBe(false);
    expect(engine.typedBuffer).toBe('');
    expect(onAttempt).toHaveBeenCalledWith(expect.objectContaining({
      entryId: 'cat', typedAnswer: 'cat', hadHint: true, timeToAnswerMs: 50,
    }));
    for (const char of 'dog') press(engine, char);
    expect(engine.completedWordsCount).toBe(2);
  });

  it('ignores gameplay input during a wave transition', () => {
    const { engine } = createEngine(['cat']);
    engine.status = 'WAVE_CLEAR';
    press(engine, 'c');
    engine.handleCharacterInput('c');
    expect(engine.typedBuffer).toBe('');
    expect(engine.bullets).toHaveLength(0);
  });
});

describe('Native keyboard and Vietnamese composition', () => {
  it('keeps the first independent key after the previous target disappears', () => {
    const { engine } = createEngine(['speed', 'dog']);
    const input = new NativeTypingInput();
    input.change(engine, 's');
    engine.enemies.shift();
    engine.selectedEnemyId = null;
    engine.typedBuffer = '';
    input.change(engine, 'sd', { inputType: 'insertText', data: 'd' });
    expect(engine.typedBuffer).toBe('d');
    expect(engine.selectedEnemyId).toBe('enemy_1');
  });
  it('does not erase a valid letter when deleting a rejected letter during composition', () => {
    const { engine } = createEngine(['speed']);
    const input = new NativeTypingInput();
    input.startComposition();
    for (const value of ['s', 'sp', 'spx']) input.change(engine, value);
    input.change(engine, 'sp', { inputType: 'deleteContentBackward' });
    expect(engine.typedBuffer).toBe('sp');
    for (const value of ['spe', 'spê', 'spêd']) input.change(engine, value);
    input.endComposition(engine, 'spêd');
    expect(engine.completedWordsCount).toBe(1);
  });
  it('removes one typed key when Backspace removes an IME mark', () => {
    const { engine } = createEngine(['speed']);
    const input = new NativeTypingInput();
    input.startComposition();
    for (const value of ['s', 'sp', 'spe', 'spê']) input.change(engine, value);
    input.change(engine, 'spe', { inputType: 'deleteContentBackward' });
    expect(engine.typedBuffer).toBe('spe');
  });
  it.each([
    ['spe', 'spê', 'e'], ['bo', 'bô', 'o'], ['a', 'á', 's'],
    ['wate', 'wảte', 'r'], ['d', 'đ', 'd'], ['u', 'ư', 'w'],
    ['a', 'a\u0301', 's'], ['bê', 'bế', 's'],
  ])('recovers the newly typed Telex key from %s -> %s', (before, after, key) => {
    expect(nativeTextEdit(before, after)).toEqual({ remove: 0, text: key });
  });

  it('processes each native keystroke once, including repeated letters and Backspace', () => {
    const { engine } = createEngine(['speed']);
    const input = new NativeTypingInput();
    input.change(engine, 's');
    input.change(engine, 'sp');
    input.change(engine, 'spe');
    input.change(engine, 'sp', { inputType: 'deleteContentBackward' });
    expect(engine.typedBuffer).toBe('sp');
    input.change(engine, 'spe');
    input.change(engine, 'spee');
    input.change(engine, 'speed');
    expect(engine.completedWordsCount).toBe(1);
    expect(engine.wrongKeystrokesCount).toBe(0);
    expect(engine.bullets).toHaveLength(6);
  });

  it('does not spill a composition update or its final commit into the next word', () => {
    const { engine } = createEngine(['speed', 'dog']);
    const input = new NativeTypingInput();
    input.startComposition();
    for (const value of ['s', 'sp', 'spe', 'spê', 'spêd', 'spêdd']) {
      input.change(engine, value, { inputType: 'insertCompositionText' });
    }
    input.endComposition(engine, 'spêdd');
    input.change(engine, 'spêdd', { inputType: 'insertText', data: 'spêdd' });
    expect(engine.completedWordsCount).toBe(1);
    expect(engine.selectedEnemyId).toBeNull();
    expect(engine.typedBuffer).toBe('');
    input.startKey();
    input.change(engine, 'd', { inputType: 'insertText', data: 'd' });
    expect(engine.typedBuffer).toBe('d');
  });

  it('decodes a Telex tone placed earlier in the word without replaying letters', () => {
    const { engine } = createEngine(['water']);
    const input = new NativeTypingInput();
    input.startComposition();
    for (const value of ['w', 'wa', 'wat', 'wate', 'wảte']) input.change(engine, value);
    input.endComposition(engine, 'wảte');
    expect(engine.completedWordsCount).toBe(1);
    expect(engine.wrongKeystrokesCount).toBe(0);
    expect(engine.bullets).toHaveLength(5);
  });

  it('stops pasted text at one completed answer, including boss segments', () => {
    const { engine } = createEngine(['cat', 'dog']);
    const boss = engine.enemies[0];
    boss.isBoss = true;
    boss.bossMaxSegments = 2;
    boss.bossSegmentsRemaining = 2;
    boss.bossWordQueue = ['cat', 'dog'].map(answer => ({
      entryId: answer, word: answer, acceptedAnswers: [answer], promptText: answer,
    }));
    const input = new NativeTypingInput();
    input.change(engine, 'catdog', { inputType: 'insertFromPaste', data: 'catdog' });
    expect(engine.completedWordsCount).toBe(1);
    expect(boss.word).toBe('dog');
    expect(engine.typedBuffer).toBe('');
  });
});
