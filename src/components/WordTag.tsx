import React from 'react';
import { GameMode } from '../types/game';

/**
 * Rút gọn chuỗi nghĩa tiếng Việt nếu chứa danh sách từ đồng nghĩa dài cách nhau bằng dấu phẩy
 * Giúp tag quái vật gọn gàng, vừa vặn khung thẻ, tránh tràn viền và vỡ giao diện.
 * Ví dụ:
 *  - "điện thoại, máy điện thoại, dây nói, phôn" -> "điện thoại"
 *  - "tạo, tạo nên, tạo ra, tạo thành, sáng tạo" -> "tạo, tạo nên"
 *  - "con mèo" -> "con mèo"
 */
export function formatTagMeaning(meaning?: string, maxChars = 20, maxParts = 2): string {
  if (!meaning) return '';
  const trimmed = meaning.trim();
  if (!trimmed.includes(',')) return trimmed;

  const parts = trimmed.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) return trimmed;

  let result = parts[0];
  for (let i = 1; i < Math.min(parts.length, maxParts); i++) {
    const candidate = `${result}, ${parts[i]}`;
    if (candidate.length <= maxChars) {
      result = candidate;
    } else {
      break;
    }
  }
  return result;
}

interface WordTagProps {
  promptText: string;
  expectedWord: string;
  meaningText?: string;
  typedBuffer: string;
  isSelected: boolean;
  mode: GameMode;
  isBoss?: boolean;
  bossSegmentsRemaining?: number;
  bossMaxSegments?: number;
  compact?: boolean;
  isRevealed?: boolean;
  archetype?: string;
  hp?: number;
  maxHp?: number;
  onClick?: () => void;
}

export const WordTag: React.FC<WordTagProps> = ({
  promptText,
  expectedWord,
  meaningText,
  typedBuffer,
  isSelected,
  mode,
  isBoss = false,
  bossSegmentsRemaining = 0,
  bossMaxSegments = 0,
  compact = false,
  isRevealed = false,
  archetype,
  hp,
  maxHp,
  onClick,
}) => {
  const displayMeaning = meaningText || promptText;
  const formattedMeaning = formatTagMeaning(displayMeaning, compact ? 16 : 22);

  // Render content according to the 3 Tiers (Nấc 1, Nấc 2, Nấc 3)
  const renderContent = () => {
    // If revealed by Reveal Bullet in the last 0.5s:
    if (isRevealed) {
      const meaningMaxWidth = compact ? '130px' : '180px';
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', width: '100%', minWidth: 0 }}>
          <span style={{ fontSize: '0.72rem' }}>👁️</span>
          <span style={{ fontFamily: 'var(--font-english)', fontWeight: 800, fontSize: '0.9rem', color: '#B45309' }}>
            {expectedWord}
          </span>
          {displayMeaning && (
            <small
              title={displayMeaning}
              style={{
                fontSize: '0.65rem',
                color: '#666',
                fontFamily: 'var(--font-vietnamese)',
                fontWeight: 600,
                lineHeight: 1.25,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: meaningMaxWidth,
                padding: '0 4px',
                display: 'block',
              }}
            >
              {formattedMeaning}
            </small>
          )}
        </div>
      );
    }

    // -----------------------------------------------------------------
    // NẤC 1: GÕ TỪ (Copy Mode)
    // Hiện chữ tiếng Anh (chữ đỏ chuyển xanh lá khi gõ đúng)
    // Kèm phụ đề nghĩa tiếng Việt bên dưới để học từ
    // -----------------------------------------------------------------
    if (mode === 'copy') {
      const typedLen = isSelected ? Math.min(typedBuffer.length, expectedWord.length) : 0;
      const typedPart = expectedWord.slice(0, typedLen);
      const remainingPart = expectedWord.slice(typedLen);

      const fontSize = compact ? (isBoss ? '0.8rem' : '0.72rem') : (isBoss ? '1.05rem' : '0.92rem');
      const meaningMaxWidth = compact ? (isBoss ? '180px' : '135px') : (isBoss ? '260px' : '190px');

      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', width: '100%', minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--font-english)',
              fontWeight: 800,
              fontSize,
              letterSpacing: '1px',
              lineHeight: 1.2,
            }}
          >
            {typedPart.length > 0 && (
              <span style={{ color: '#16A34A', textDecoration: 'underline' }}>{typedPart}</span>
            )}
            <span style={{ color: '#DC2626' }}>{remainingPart}</span>
          </div>
          {displayMeaning && (
            <span
              title={displayMeaning}
              style={{
                fontFamily: 'var(--font-vietnamese)',
                fontWeight: 700,
                fontSize: compact ? '0.62rem' : '0.72rem',
                color: '#64748B',
                lineHeight: 1.25,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: meaningMaxWidth,
                padding: '0 4px',
                display: 'block',
              }}
            >
              {formattedMeaning}
            </span>
          )}
        </div>
      );
    }

    // -----------------------------------------------------------------
    // NẤC 2: NHỚ NGHĨA (Recall Mode) - HIỆN TIẾNG VIỆT, BẤM TIẾNG ANH
    // Luôn hiện nghĩa tiếng Việt to rõ nét trên quái vật
    // Phía dưới là các ô chữ cái tiếng Anh cần gõ (xanh lá khi gõ đúng, ô trống/gạch dưới còn lại)
    // -----------------------------------------------------------------
    if (mode === 'recall') {
      const typedLen = isSelected ? Math.min(typedBuffer.length, expectedWord.length) : 0;
      const typedPart = expectedWord.slice(0, typedLen);
      const remainingSlots = Math.max(0, expectedWord.length - typedLen);
      const meaningFontSize = compact ? (isBoss ? '0.76rem' : '0.68rem') : (isBoss ? '0.96rem' : '0.86rem');
      const englishFontSize = compact ? (isBoss ? '0.74rem' : '0.66rem') : (isBoss ? '0.9rem' : '0.8rem');
      const meaningMaxWidth = compact ? (isBoss ? '180px' : '135px') : (isBoss ? '260px' : '190px');

      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', width: '100%', minWidth: 0 }}>
          {/* 1. NGHĨA TIẾNG VIỆT TO RÕ - LUÔN HIỂN THỊ TRÊN MỘT DÒNG KHÔNG VỠ CHỮ */}
          <div
            title={displayMeaning}
            style={{
              fontFamily: 'var(--font-vietnamese)',
              fontWeight: 800,
              fontSize: meaningFontSize,
              color: '#0F172A',
              lineHeight: 1.25,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: meaningMaxWidth,
              padding: '0 4px',
            }}
          >
            {formattedMeaning}
          </div>

          {/* 2. CÁC Ô CHỮ TIẾNG ANH (GÕ CHỮ ĐÚNG SẼ ĐIỀN XANH LÁ, LUÔN NẰM NGANG KHÔNG XẾP DỌC) */}
          <div
            style={{
              fontFamily: 'var(--font-english)',
              fontWeight: 800,
              fontSize: englishFontSize,
              letterSpacing: '1.5px',
              lineHeight: 1.2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              whiteSpace: 'nowrap',
              flexWrap: 'nowrap',
              flexShrink: 0,
              backgroundColor: isSelected ? '#F0FDF4' : '#F8FAFC',
              padding: '1px 6px',
              borderRadius: '4px',
              border: isSelected ? '1px solid #86EFAC' : '1px dashed #CBD5E1',
            }}
          >
            {typedPart.length > 0 && (
              <span style={{ color: '#16A34A', textDecoration: 'underline', whiteSpace: 'nowrap' }}>{typedPart}</span>
            )}
            <span style={{ color: '#94A3B8', whiteSpace: 'nowrap', letterSpacing: '2px', marginLeft: typedPart.length > 0 ? '2px' : 0 }}>
              {'_'.repeat(remainingSlots)}
            </span>
          </div>
        </div>
      );
    }

    // -----------------------------------------------------------------
    // NẤC 3: NGHE & GÕ (Listen Mode - Tương tự Nấc 2)
    // Quái chỉ hiện biểu tượng / prompt nghe.
    // Khi bắt đầu nhắm vào -> Mất prompt nghe, điền các chữ cái đúng (màu xanh).
    // -----------------------------------------------------------------
    if (!isSelected) {
      return (
        <div
          style={{
            fontFamily: 'var(--font-vietnamese)',
            fontWeight: 800,
            fontSize: compact ? (isBoss ? '0.72rem' : '0.64rem') : (isBoss ? '0.88rem' : '0.78rem'),
            color: 'var(--color-ink)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
          }}
        >
          <span style={{ fontSize: '1rem' }}>🔊</span>
          <span>[Nghe từ]</span>
        </div>
      );
    }

    // Targeted in Listen Mode
    const typedLen = Math.min(typedBuffer.length, expectedWord.length);
    const typedPart = expectedWord.slice(0, typedLen);
    const remainingSlots = Math.max(0, expectedWord.length - typedLen);
    const fontSize = compact ? (isBoss ? '0.8rem' : '0.72rem') : (isBoss ? '1.05rem' : '0.92rem');

    return (
      <div
        style={{
          fontFamily: 'var(--font-english)',
          fontWeight: 800,
          fontSize,
          letterSpacing: '1.5px',
          lineHeight: 1.2,
        }}
      >
        {typedPart.length > 0 ? (
          <span style={{ color: '#16A34A', textDecoration: 'underline' }}>{typedPart}</span>
        ) : null}
        <span style={{ color: '#9CA3AF', whiteSpace: 'nowrap', letterSpacing: '2px', marginLeft: typedPart.length > 0 ? '2px' : 0 }}>
          {'_'.repeat(remainingSlots)}
        </span>
      </div>
    );
  };

  return (
    <div
      onClick={onClick}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: compact
          ? (isBoss ? '4px 10px 5px' : '3px 8px 5px')
          : (isBoss ? '6px 14px 7px' : '4px 12px 6px'),
        backgroundColor: '#FFFFFF',
        border: isSelected ? '3px solid var(--color-ponpi-pink)' : '2px solid var(--color-ink)',
        borderRadius: '16px',
        boxShadow: isSelected
          ? '0 0 0 3px rgba(245, 138, 176, 0.4), 3px 3px 0 var(--color-ink)'
          : 'var(--shadow-sticker-sm)',
        cursor: 'pointer',
        userSelect: 'none',
        width: 'max-content',
        minWidth: compact ? (isBoss ? '110px' : '75px') : (isBoss ? '160px' : '95px'),
        maxWidth: compact ? (isBoss ? '200px' : '155px') : (isBoss ? '280px' : '220px'),
        boxSizing: 'border-box',
        textAlign: 'center',
        transition: 'transform 0.1s ease',
      }}
    >
      {/* Boss health segments indicator */}
      {isBoss && (
        <div
          style={{
            display: 'flex',
            gap: '4px',
            marginBottom: '4px',
            width: '100%',
            justifyContent: 'center',
          }}
        >
          {Array.from({ length: bossMaxSegments }).map((_, idx) => {
            const isFilled = idx < bossSegmentsRemaining;
            return (
              <div
                key={idx}
                style={{
                  height: '8px',
                  flex: 1,
                  borderRadius: '3px',
                  backgroundColor: isFilled ? 'var(--color-danger)' : '#E0E0E0',
                  border: '1px solid var(--color-ink)',
                }}
              />
            );
          })}
        </div>
      )}

      {/* Archetype or Tank HP badge */}
      {archetype && archetype !== 'normal' && !isBoss && (
        <div style={{ display: 'flex', gap: '3px', marginBottom: '2px', alignItems: 'center' }}>
          {archetype === 'tank' && (
            <span style={{ fontSize: '0.62rem', fontWeight: 900, background: '#EBDEF0', color: '#7D3C98', padding: '1px 4px', borderRadius: '4px' }}>
              🛡️ {hp || 1}/{maxHp || 2}
            </span>
          )}
          {archetype === 'shooter' && (
            <span style={{ fontSize: '0.62rem', fontWeight: 900, background: '#FADBD8', color: '#C0392B', padding: '1px 4px', borderRadius: '4px' }}>
              🎯
            </span>
          )}
          {archetype === 'speedster' && (
            <span style={{ fontSize: '0.62rem', fontWeight: 900, background: '#FDEBD0', color: '#D35400', padding: '1px 4px', borderRadius: '4px' }}>
              ⚡
            </span>
          )}
        </div>
      )}

      {/* Main Tag Content */}
      {renderContent()}
    </div>
  );
};
