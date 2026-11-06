import { describe, it, expect } from 'vitest';
import { formatTagMeaning } from '../../components/WordTag';

describe('formatTagMeaning', () => {
  it('returns empty string for empty input', () => {
    expect(formatTagMeaning(undefined)).toBe('');
    expect(formatTagMeaning('')).toBe('');
  });

  it('keeps single meanings as-is without commas', () => {
    expect(formatTagMeaning('con mèo')).toBe('con mèo');
    expect(formatTagMeaning('trung tâm thương mại')).toBe('trung tâm thương mại');
  });

  it('shortens long synonym lists like "điện thoại, máy điện thoại, dây nói, phôn"', () => {
    const raw = 'điện thoại, máy điện thoại, dây nói, phôn';
    const formatted = formatTagMeaning(raw);
    expect(formatted).toBe('điện thoại');
  });

  it('preserves clean 2-synonym phrases that fit within maxChars like "tạo, tạo nên"', () => {
    const raw = 'tạo, tạo nên, tạo ra, tạo thành, sáng tạo';
    const formatted = formatTagMeaning(raw);
    expect(formatted).toBe('tạo, tạo nên');
  });

  it('respects custom maxChars limit for compact screens', () => {
    const raw = 'bắt đầu, khởi đầu, mở màn';
    const compactFormatted = formatTagMeaning(raw, 12);
    expect(compactFormatted).toBe('bắt đầu');
  });
});

