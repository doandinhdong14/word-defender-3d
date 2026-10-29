import React from 'react';
import { GameMode } from '../types/game';

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

  // Render content according to the 3 Tiers (Nấc 1, Nấc 2, Nấc 3)
  const renderContent = () => {
    // If revealed by Reveal Bullet in the last 0.5s:
    if (isRevealed) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
          <span style={{ fontSize: '0.62rem', color: '#D4AC0D', fontWeight: 900 }}>👁️ SOI SÁNG (0.5s)</span>
          <span style={{ fontFamily: 'var(--font-english)', fontWeight: 800, fontSize: '0.9rem', color: '#B45309' }}>
            {expectedWord}
          </span>
          {displayMeaning && <small style={{ fontSize: '0.65rem', color: '#666' }}>{displayMeaning}</small>}
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

      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
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
              style={{
                fontFamily: 'var(--font-vietnamese)',
                fontWeight: 700,
                fontSize: compact ? '0.62rem' : '0.72rem',
                color: '#64748B',
                lineHeight: 1.1,
              }}
            >
              {displayMeaning}
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

      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
          {/* 1. NGHĨA TIẾNG VIỆT TO RÕ - LUÔN HIỂN THỊ */}
          <div
            style={{
              fontFamily: 'var(--font-vietnamese)',
              fontWeight: 800,
              fontSize: meaningFontSize,
              color: '#0F172A',
              lineHeight: 1.2,
              wordBreak: 'break-word',
            }}
          >
            {displayMeaning}
          </div>

          {/* 2. CÁC Ô CHỮ TIẾNG ANH (GÕ CHỮ ĐÚNG SẼ ĐIỀN XANH LÁ) */}
          <div
            style={{
              fontFamily: 'var(--font-english)',
              fontWeight: 800,
              fontSize: englishFontSize,
              letterSpacing: '1.5px',
              lineHeight: 1.2,
              display: 'flex',
              alignItems: 'center',
              gap: '1px',
              backgroundColor: isSelected ? '#F0FDF4' : '#F8FAFC',
              padding: '1px 6px',
              borderRadius: '4px',
              border: isSelected ? '1px solid #86EFAC' : '1px dashed #CBD5E1',
            }}
          >
            {typedPart.length > 0 && (
              <span style={{ color: '#16A34A', textDecoration: 'underline' }}>{typedPart}</span>
            )}
            <span style={{ color: '#94A3B8' }}>
              {Array.from({ length: remainingSlots }).map((_, i) => (
                <span key={i} style={{ display: 'inline-block', width: '8px', textAlign: 'center' }}>
                  _
                </span>
              ))}
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
        <span style={{ color: '#9CA3AF' }}>
          {Array.from({ length: remainingSlots }).map((_, i) => (
            <span key={i} style={{ display: 'inline-block', width: '10px', textAlign: 'center' }}>
              _
            </span>
          ))}
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
        padding: compact ? (isBoss ? '4px 8px' : '3px 6px') : (isBoss ? '7px 14px' : '4px 10px'),
        backgroundColor: '#FFFFFF',
        border: isSelected ? '3px solid var(--color-ponpi-pink)' : '2px solid var(--color-ink)',
        borderRadius: 'var(--radius-md)',
        boxShadow: isSelected
          ? '0 0 0 3px rgba(245, 138, 176, 0.4), 3px 3px 0 var(--color-ink)'
          : 'var(--shadow-sticker-sm)',
        cursor: 'pointer',
        userSelect: 'none',
        maxWidth: compact ? (isBoss ? '140px' : '90px') : (isBoss ? '240px' : '170px'),
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
        <div style={{ display: 'flex', gap: '4px', marginBottom: '3px', alignItems: 'center' }}>
          {archetype === 'tank' && (
            <span style={{ fontSize: '0.62rem', fontWeight: 900, background: '#EBDEF0', color: '#7D3C98', padding: '1px 5px', borderRadius: '4px' }}>
              🛡️ {hp || 1}/{maxHp || 2} từ
            </span>
          )}
          {archetype === 'shooter' && (
            <span style={{ fontSize: '0.62rem', fontWeight: 900, background: '#FADBD8', color: '#C0392B', padding: '1px 5px', borderRadius: '4px' }}>
              🎯 Bắn đạn
            </span>
          )}
          {archetype === 'speedster' && (
            <span style={{ fontSize: '0.62rem', fontWeight: 900, background: '#FDEBD0', color: '#D35400', padding: '1px 5px', borderRadius: '4px' }}>
              ⚡ Nhanh
            </span>
          )}
        </div>
      )}

      {/* Main Tag Content */}
      {renderContent()}
    </div>
  );
};
