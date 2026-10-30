export interface TypingResult {
  accepted: boolean;
  isComplete: boolean;
  newBuffer: string;
  matchedAnswer?: string;
  isWrong: boolean;
}

export function normalizeInput(str: string): string {
  return str.trim().toLowerCase().normalize('NFC');
}

// Mapping of Vietnamese accented characters to their base Latin character and the Telex key used to produce them
export const TELEX_DECODE_MAP: Record<string, { baseChar: string; telexKey: string }> = {
  // Sắc (s)
  'á': { baseChar: 'a', telexKey: 's' }, 'é': { baseChar: 'e', telexKey: 's' }, 'í': { baseChar: 'i', telexKey: 's' }, 'ó': { baseChar: 'o', telexKey: 's' }, 'ú': { baseChar: 'u', telexKey: 's' }, 'ý': { baseChar: 'y', telexKey: 's' },
  'Á': { baseChar: 'a', telexKey: 's' }, 'É': { baseChar: 'e', telexKey: 's' }, 'Í': { baseChar: 'i', telexKey: 's' }, 'Ó': { baseChar: 'o', telexKey: 's' }, 'Ú': { baseChar: 'u', telexKey: 's' }, 'Ý': { baseChar: 'y', telexKey: 's' },
  // Huyền (f)
  'à': { baseChar: 'a', telexKey: 'f' }, 'è': { baseChar: 'e', telexKey: 'f' }, 'ì': { baseChar: 'i', telexKey: 'f' }, 'ò': { baseChar: 'o', telexKey: 'f' }, 'ù': { baseChar: 'u', telexKey: 'f' }, 'ỳ': { baseChar: 'y', telexKey: 'f' },
  'À': { baseChar: 'a', telexKey: 'f' }, 'È': { baseChar: 'e', telexKey: 'f' }, 'Ì': { baseChar: 'i', telexKey: 'f' }, 'Ò': { baseChar: 'o', telexKey: 'f' }, 'Ù': { baseChar: 'u', telexKey: 'f' }, 'Ỳ': { baseChar: 'y', telexKey: 'f' },
  // Hỏi (r)
  'ả': { baseChar: 'a', telexKey: 'r' }, 'ẻ': { baseChar: 'e', telexKey: 'r' }, 'ỉ': { baseChar: 'i', telexKey: 'r' }, 'ỏ': { baseChar: 'o', telexKey: 'r' }, 'ủ': { baseChar: 'u', telexKey: 'r' }, 'ỷ': { baseChar: 'y', telexKey: 'r' },
  'Ả': { baseChar: 'a', telexKey: 'r' }, 'Ẻ': { baseChar: 'e', telexKey: 'r' }, 'Ỉ': { baseChar: 'i', telexKey: 'r' }, 'Ỏ': { baseChar: 'o', telexKey: 'r' }, 'Ủ': { baseChar: 'u', telexKey: 'r' }, 'Ỷ': { baseChar: 'y', telexKey: 'r' },
  // Ngã (x)
  'ã': { baseChar: 'a', telexKey: 'x' }, 'ẽ': { baseChar: 'e', telexKey: 'x' }, 'ĩ': { baseChar: 'i', telexKey: 'x' }, 'õ': { baseChar: 'o', telexKey: 'x' }, 'ũ': { baseChar: 'u', telexKey: 'x' }, 'ỹ': { baseChar: 'y', telexKey: 'x' },
  'Ã': { baseChar: 'a', telexKey: 'x' }, 'Ẽ': { baseChar: 'e', telexKey: 'x' }, 'Ĩ': { baseChar: 'i', telexKey: 'x' }, 'Õ': { baseChar: 'o', telexKey: 'x' }, 'Ũ': { baseChar: 'u', telexKey: 'x' }, 'Ỹ': { baseChar: 'y', telexKey: 'x' },
  // Nặng (j)
  'ạ': { baseChar: 'a', telexKey: 'j' }, 'ẹ': { baseChar: 'e', telexKey: 'j' }, 'ị': { baseChar: 'i', telexKey: 'j' }, 'ọ': { baseChar: 'o', telexKey: 'j' }, 'ụ': { baseChar: 'u', telexKey: 'j' }, 'ỵ': { baseChar: 'y', telexKey: 'j' },
  'Ạ': { baseChar: 'a', telexKey: 'j' }, 'Ẹ': { baseChar: 'e', telexKey: 'j' }, 'Ị': { baseChar: 'i', telexKey: 'j' }, 'Ọ': { baseChar: 'o', telexKey: 'j' }, 'Ụ': { baseChar: 'u', telexKey: 'j' }, 'Ỵ': { baseChar: 'y', telexKey: 'j' },
  // Mũ & Móc: ee -> ê, oo -> ô, aa -> â, dd -> đ
  'ê': { baseChar: 'e', telexKey: 'e' }, 'Ê': { baseChar: 'e', telexKey: 'e' },
  'ô': { baseChar: 'o', telexKey: 'o' }, 'Ô': { baseChar: 'o', telexKey: 'o' },
  'â': { baseChar: 'a', telexKey: 'a' }, 'Â': { baseChar: 'a', telexKey: 'a' },
  'đ': { baseChar: 'd', telexKey: 'd' }, 'Đ': { baseChar: 'd', telexKey: 'd' },
  // ă (aw), ơ (ow), ư (uw)
  'ă': { baseChar: 'a', telexKey: 'w' }, 'Ă': { baseChar: 'a', telexKey: 'w' },
  'ơ': { baseChar: 'o', telexKey: 'w' }, 'Ơ': { baseChar: 'o', telexKey: 'w' },
  'ư': { baseChar: 'u', telexKey: 'w' }, 'Ư': { baseChar: 'u', telexKey: 'w' },
  // Dấu kết hợp
  'ế': { baseChar: 'e', telexKey: 's' }, 'Ế': { baseChar: 'e', telexKey: 's' },
  'ề': { baseChar: 'e', telexKey: 'f' }, 'Ề': { baseChar: 'e', telexKey: 'f' },
  'ể': { baseChar: 'e', telexKey: 'r' }, 'Ể': { baseChar: 'e', telexKey: 'r' },
  'ễ': { baseChar: 'e', telexKey: 'x' }, 'Ễ': { baseChar: 'e', telexKey: 'x' },
  'ệ': { baseChar: 'e', telexKey: 'j' }, 'Ệ': { baseChar: 'e', telexKey: 'j' },
  'ố': { baseChar: 'o', telexKey: 's' }, 'Ố': { baseChar: 'o', telexKey: 's' },
  'ồ': { baseChar: 'o', telexKey: 'f' }, 'Ồ': { baseChar: 'o', telexKey: 'f' },
  'ổ': { baseChar: 'o', telexKey: 'r' }, 'Ổ': { baseChar: 'o', telexKey: 'r' },
  'ỗ': { baseChar: 'o', telexKey: 'x' }, 'Ỗ': { baseChar: 'o', telexKey: 'x' },
  'ộ': { baseChar: 'o', telexKey: 'j' }, 'Ộ': { baseChar: 'o', telexKey: 'j' },
  'ấ': { baseChar: 'a', telexKey: 's' }, 'Ấ': { baseChar: 'a', telexKey: 's' },
  'ầ': { baseChar: 'a', telexKey: 'f' }, 'Ầ': { baseChar: 'a', telexKey: 'f' },
  'ẩ': { baseChar: 'a', telexKey: 'r' }, 'Ẩ': { baseChar: 'a', telexKey: 'r' },
  'ẫ': { baseChar: 'a', telexKey: 'x' }, 'Ẫ': { baseChar: 'a', telexKey: 'x' },
  'ậ': { baseChar: 'a', telexKey: 'j' }, 'Ậ': { baseChar: 'a', telexKey: 'j' },
  'ắ': { baseChar: 'a', telexKey: 's' }, 'Ắ': { baseChar: 'a', telexKey: 's' },
  'ằ': { baseChar: 'a', telexKey: 'f' }, 'Ằ': { baseChar: 'a', telexKey: 'f' },
  'ẳ': { baseChar: 'a', telexKey: 'r' }, 'Ẳ': { baseChar: 'a', telexKey: 'r' },
  'ẵ': { baseChar: 'a', telexKey: 'x' }, 'Ẵ': { baseChar: 'a', telexKey: 'x' },
  'ặ': { baseChar: 'a', telexKey: 'j' }, 'Ặ': { baseChar: 'a', telexKey: 'j' },
  'ớ': { baseChar: 'o', telexKey: 's' }, 'Ớ': { baseChar: 'o', telexKey: 's' },
  'ờ': { baseChar: 'o', telexKey: 'f' }, 'Ờ': { baseChar: 'o', telexKey: 'f' },
  'ở': { baseChar: 'o', telexKey: 'r' }, 'Ở': { baseChar: 'o', telexKey: 'r' },
  'ỡ': { baseChar: 'o', telexKey: 'x' }, 'Ỡ': { baseChar: 'o', telexKey: 'x' },
  'ợ': { baseChar: 'o', telexKey: 'j' }, 'Ợ': { baseChar: 'o', telexKey: 'j' },
  'ứ': { baseChar: 'u', telexKey: 's' }, 'Ứ': { baseChar: 'u', telexKey: 's' },
  'ừ': { baseChar: 'u', telexKey: 'f' }, 'Ừ': { baseChar: 'u', telexKey: 'f' },
  'ử': { baseChar: 'u', telexKey: 'r' }, 'Ử': { baseChar: 'u', telexKey: 'r' },
  'ữ': { baseChar: 'u', telexKey: 'x' }, 'Ữ': { baseChar: 'u', telexKey: 'x' },
  'ự': { baseChar: 'u', telexKey: 'j' }, 'Ự': { baseChar: 'u', telexKey: 'j' },
};

export function cleanKey(event: KeyboardEvent): string | null {
  if (event.ctrlKey || event.altKey || event.metaKey) {
    return null;
  }
  let key = event.key;
  if (!key) return null;

  // 1. If physical key code is KeyA-Z:
  // When typing on Windows with Unikey / EVKey / Vietnamese IME,
  // event.code reflects the physical key (e.g. KeyS for 's', KeyE for 'e', KeyR for 'r'),
  // while event.key may be an accented character ('á', 'ê', 'ả') or 'Process'/'Dead'.
  if (event.code && /^Key[A-Za-z]$/.test(event.code)) {
    const physicalLetter = event.code.slice(3).toLowerCase();
    if (TELEX_DECODE_MAP[key] || key === 'Process' || key === 'Dead' || key.length !== 1) {
      return physicalLetter;
    }
  }

  // 2. Normalize Vietnamese diacritics when code is not available (e.g. synthetic events or mobile)
  if (key.length === 1) {
    key = key
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  }

  // 3. Fallback for IME Process or dead keys when typing on Windows without KeyA-Z
  if ((key === 'Process' || key === 'Dead' || key.length !== 1) && event.code && /^Key[A-Z]$/i.test(event.code)) {
    key = event.code.slice(3).toLowerCase();
  }

  // Allow letters, space, apostrophe, hyphen
  if (/^[a-zA-Z '-]$/.test(key)) {
    return key.toLowerCase();
  }
  return null;
}

export function evaluateKeystroke(
  currentBuffer: string,
  candidateAnswers: string[],
  nextChar: string
): TypingResult {
  const normalizedChar = nextChar.toLowerCase();
  const testBuffer = currentBuffer + normalizedChar;

  // Check if testBuffer is a prefix of ANY accepted answer
  const matchingAnswers = candidateAnswers.filter((ans) => {
    const normAns = normalizeInput(ans);
    return normAns.startsWith(testBuffer);
  });

  if (matchingAnswers.length === 0) {
    return {
      accepted: false,
      isComplete: false,
      newBuffer: currentBuffer,
      isWrong: true,
    };
  }

  // Check if testBuffer EXACTLY matches any full answer
  const exactMatch = matchingAnswers.find((ans) => normalizeInput(ans) === testBuffer);
  if (exactMatch) {
    return {
      accepted: true,
      isComplete: true,
      newBuffer: testBuffer,
      matchedAnswer: exactMatch,
      isWrong: false,
    };
  }

  return {
    accepted: true,
    isComplete: false,
    newBuffer: testBuffer,
    isWrong: false,
  };
}
