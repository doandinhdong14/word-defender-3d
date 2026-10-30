import { describe, it, expect } from 'vitest';
import { evaluateKeystroke, cleanKey } from '../../game/engine/typing';

describe('Typing Engine', () => {
  it('advances typed buffer on valid letter', () => {
    const res = evaluateKeystroke('impr', ['improve'], 'o');
    expect(res.accepted).toBe(true);
    expect(res.newBuffer).toBe('impro');
    expect(res.isComplete).toBe(false);
    expect(res.isWrong).toBe(false);
  });

  it('rejects invalid letter without advancing buffer', () => {
    const res = evaluateKeystroke('impr', ['improve'], 'z');
    expect(res.accepted).toBe(false);
    expect(res.newBuffer).toBe('impr');
    expect(res.isComplete).toBe(false);
    expect(res.isWrong).toBe(true);
  });

  it('detects word completion exactly on the final character', () => {
    const res = evaluateKeystroke('improv', ['improve'], 'e');
    expect(res.accepted).toBe(true);
    expect(res.isComplete).toBe(true);
    expect(res.newBuffer).toBe('improve');
    expect(res.matchedAnswer).toBe('improve');
  });

  it('supports spaces and multi-word phrases', () => {
    // "look after"
    const res1 = evaluateKeystroke('look', ['look after'], ' ');
    expect(res1.accepted).toBe(true);
    expect(res1.newBuffer).toBe('look ');

    const res2 = evaluateKeystroke('look ', ['look after'], 'a');
    expect(res2.accepted).toBe(true);
    expect(res2.newBuffer).toBe('look a');
  });

  it('completes alias when alternate answer is typed', () => {
    const candidateAnswers = ['improve', 'better'];
    const res1 = evaluateKeystroke('', candidateAnswers, 'b');
    expect(res1.accepted).toBe(true);
    expect(res1.newBuffer).toBe('b');

    const res2 = evaluateKeystroke('bette', candidateAnswers, 'r');
    expect(res2.accepted).toBe(true);
    expect(res2.isComplete).toBe(true);
    expect(res2.matchedAnswer).toBe('better');
  });

  it('ignores modifier keys and key repeats', () => {
    const event1 = { key: 'a', ctrlKey: true, altKey: false, metaKey: false, repeat: false } as KeyboardEvent;
    expect(cleanKey(event1)).toBeNull();

    const event2 = { key: 'a', ctrlKey: false, altKey: false, metaKey: false, repeat: true } as KeyboardEvent;
    expect(cleanKey(event2)).toBeNull();

    const event3 = { key: 'A', ctrlKey: false, altKey: false, metaKey: false, repeat: false } as KeyboardEvent;
    expect(cleanKey(event3)).toBe('a');
  });

  it('normalizes Vietnamese accented characters and handles IME Process fallback', () => {
    // Telex / VNI accents
    expect(cleanKey({ key: 'á' } as KeyboardEvent)).toBe('a');
    expect(cleanKey({ key: 'ê' } as KeyboardEvent)).toBe('e');
    expect(cleanKey({ key: 'đ' } as KeyboardEvent)).toBe('d');
    expect(cleanKey({ key: 'ư' } as KeyboardEvent)).toBe('u');
    expect(cleanKey({ key: 'ơ' } as KeyboardEvent)).toBe('o');

    // Windows IME Process key with code
    expect(cleanKey({ key: 'Process', code: 'KeyC' } as KeyboardEvent)).toBe('c');
  });
});
