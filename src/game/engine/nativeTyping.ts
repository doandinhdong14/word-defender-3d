import type { GameEngine } from './gameEngine';

type TypingEngine = Pick<GameEngine, 'typedBuffer' | 'typingTargetKey' | 'completedWordsCount' |
  'handleBackspace' | 'handleCharacterInput'>;

interface NativeEdit {
  inputType?: string;
  data?: string | null;
}

const toneKeys: Record<string, string> = {
  '\u0301': 's', '\u0300': 'f', '\u0309': 'r', '\u0303': 'x', '\u0323': 'j',
};

const latinText = (value: string) => value.normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();

function telexMarks(value: string): string[] {
  const keys: string[] = [];
  for (const char of value.toLowerCase().normalize('NFC')) {
    if (char === 'đ') keys.push('d');
    const decomposed = char.normalize('NFD');
    for (const mark of decomposed.slice(1)) {
      const key = toneKeys[mark] || (mark === '\u0302' ? decomposed[0] :
        (mark === '\u0306' || mark === '\u031b' ? 'w' : ''));
      if (key) keys.push(key);
    }
  }
  return keys;
}

export function nativeTextEdit(previous: string, incoming: string, event: NativeEdit = {}) {
  const before = latinText(previous);
  const after = latinText(incoming);
  if (previous.normalize('NFC') === incoming.normalize('NFC')) return { remove: 0, text: '' };

  if (event.inputType?.startsWith('delete')) {
    return { remove: Math.max(1, before.length - after.length), text: '' };
  }

  // Telex can change a vowel anywhere in the word, without changing its length
  // (e.g. wate -> wảte is the final R of "water"). Compare the whole edit.
  if (before === after) {
    const oldMarks = telexMarks(previous);
    const added = telexMarks(incoming).filter((key) => {
      const index = oldMarks.indexOf(key);
      if (index < 0) return true;
      oldMarks.splice(index, 1);
      return false;
    });
    return { remove: 0, text: [...new Set(added)].join('') };
  }

  if (after.startsWith(before)) return { remove: 0, text: after.slice(before.length) };

  // Some keyboards replace their composition instead of appending text.
  // A single reported letter is the new key, not the entire replacement word.
  if (event.data && /^[a-z '-]$/i.test(event.data)) {
    return { remove: 0, text: event.data.toLowerCase() };
  }

  let prefix = 0;
  while (prefix < before.length && before[prefix] === after[prefix]) prefix += 1;
  return { remove: before.length - prefix, text: after.slice(prefix) };
}

// Keep the keyboard's raw composition separate from the game's validated
// buffer. Replacing it on every render interrupts IMEs and replays old text.
export class NativeTypingInput {
  private rawValue = '';
  private composing = false;
  private completedInComposition = false;
  private lastCommit: string | null = null;
  private targetKey: string | null = null;
  private buffer = '';
  private compositionBuffers = new Map<string, string>();

  public reset(engine: TypingEngine): string {
    this.composing = false;
    this.completedInComposition = false;
    this.lastCommit = null;
    this.compositionBuffers.clear();
    return this.sync(engine);
  }

  private sync(engine: TypingEngine): string {
    this.rawValue = engine.typedBuffer;
    this.targetKey = engine.typingTargetKey;
    this.buffer = engine.typedBuffer;
    return this.rawValue;
  }

  public startComposition(): void {
    this.composing = true;
    this.completedInComposition = false;
    this.lastCommit = null;
    this.compositionBuffers.clear();
    this.compositionBuffers.set(this.rawValue, this.buffer);
  }

  public startKey(): void {
    if (!this.composing) this.lastCommit = null;
  }

  public change(engine: TypingEngine, incoming: string, event: NativeEdit = {}): string {
    if (this.targetKey !== engine.typingTargetKey || this.buffer !== engine.typedBuffer) {
      const wasComposing = this.composing;
      this.reset(engine);
      // An enemy may disappear while the field still contains its old text.
      // Keep the next independent key, without replaying that stale prefix.
      if (!wasComposing && event.inputType === 'insertText' && event.data && /^[a-z '-]$/i.test(event.data)) {
        incoming = this.rawValue + event.data;
      } else {
        return this.rawValue;
      }
    }
    // Browsers can send a final input after compositionend with the same text.
    if (this.lastCommit === incoming &&
        (event.inputType?.includes('Composition') || event.data === incoming)) {
      this.lastCommit = null;
      return this.rawValue;
    }
    this.lastCommit = null;

    if (!this.completedInComposition && event.inputType !== 'deleteCompositionText') {
      const edit = nativeTextEdit(this.rawValue, incoming, event);
      const previousBuffer = this.compositionBuffers.get(incoming);
      if (edit.remove > 0 && previousBuffer !== undefined && engine.typedBuffer.startsWith(previousBuffer)) {
        // Deleting a rejected letter in an active composition must not also
        // erase a previously accepted letter from the game buffer.
        edit.remove = engine.typedBuffer.length - previousBuffer.length;
      }
      for (let index = 0; index < edit.remove; index += 1) engine.handleBackspace();
      const completedBefore = engine.completedWordsCount;
      for (const char of edit.text) {
        engine.handleCharacterInput(char);
        // A paste, suggestion or IME update belongs to just one answer.
        if (engine.completedWordsCount !== completedBefore) {
          this.completedInComposition = this.composing;
          break;
        }
      }
    }

    this.targetKey = engine.typingTargetKey;
    this.buffer = engine.typedBuffer;
    if (this.composing) {
      if (event.inputType !== 'deleteCompositionText') this.rawValue = incoming;
      this.compositionBuffers.set(this.rawValue, this.buffer);
      return incoming;
    }
    return this.sync(engine);
  }

  public endComposition(engine: TypingEngine, incoming: string): string {
    this.change(engine, incoming);
    this.composing = false;
    this.completedInComposition = false;
    this.compositionBuffers.clear();
    this.sync(engine);
    this.lastCommit = incoming;
    return this.rawValue;
  }
}
