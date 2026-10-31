import React, { useEffect, useState } from 'react';
import { useApp } from '../app/appStore';
import { awardRunRewards } from '../economy/rewards';
import { StickerButton } from '../components/StickerButton';
import confetti from 'canvas-confetti';
import { useAuth } from '../auth/AuthContext';
import { db } from '../data/db';
import { getDeckProgress, DeckProgressInfo } from '../learning/sessionSelector';
import { batchSaveLearningProgress } from '../learning/scheduler';
import { speakEnglishWord } from '../learning/pronunciation';
import { RunWordSummary } from '../types/game';
import {
  Trophy,
  Skull,
  Coins,
  CheckCircle2,
  Volume2,
  X,
  Sparkles,
} from 'lucide-react';

export const ResultsPage: React.FC = () => {
  const { account } = useAuth();
  const { lastRunSummary, navigateTo, refreshUserData, settings, selectedWordCount } = useApp();
  const [reward, setReward] = useState<{ coins: number; xp: number }>({ coins: 0, xp: 0 });
  const [deckProgress, setDeckProgress] = useState<DeckProgressInfo | null>(null);
  const [wordResults, setWordResults] = useState<RunWordSummary[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!lastRunSummary) return;

    const isWin = lastRunSummary.result === 'win';

    // Trigger confetti on win
    if (isWin && !settings?.reduceMotion) {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.55 },
        colors: ['#EE7772', '#FFD47D', '#AFCB86', '#70B9E1'],
      });
    }

    // Award rewards
    if (account) {
      awardRunRewards(lastRunSummary).then((res) => {
        setReward({ coins: res.coinsEarned, xp: res.xpEarned });
        refreshUserData();
      });
    }

    // Prepare word results
    let results: RunWordSummary[] = [];
    if (lastRunSummary.wordResults && lastRunSummary.wordResults.length > 0) {
      results = lastRunSummary.wordResults;
      setWordResults(results);
    } else if (lastRunSummary.attemptedEntryIds && lastRunSummary.attemptedEntryIds.length > 0) {
      db.words.bulkGet(lastRunSummary.attemptedEntryIds).then((entries) => {
        const fallbacks: RunWordSummary[] = entries.filter(Boolean).map((e) => ({
          entryId: e!.id,
          english: e!.english,
          vietnamese: e!.vietnamese,
          ipa: e!.ipa,
          partOfSpeech: e!.partOfSpeech,
          outcome: isWin ? 'correct' : 'wrong',
          hadHint: false,
          wrongKeystrokes: 0,
          timeToAnswerMs: 1000,
          isMastered: isWin,
        }));
        setWordResults(fallbacks);
        results = fallbacks;
      });
    }

    // AUTO-SAVE PROGRESS TO ACCOUNT IMMEDIATELY:
    // Guarantees next run progresses to subsequent words in the deck!
    const autoSaveProgress = async () => {
      try {
        const items = (results.length > 0 ? results : lastRunSummary.wordResults || []).map((w) => ({
          entryId: w.entryId,
          isMastered: w.isMastered,
          mode: 'recall' as const, // Battle rounds test recall, advancing Spaced Repetition stages
          hadHint: w.hadHint,
        }));
        if (items.length > 0) {
          const { records } = await batchSaveLearningProgress(items);
          setWordResults((prev) =>
            prev.map((w) => {
              const rec = records[w.entryId];
              return {
                ...w,
                srsStage: rec?.srsStage ?? (w.isMastered ? 1 : 0),
                intervalDays: rec?.intervalDays ?? (w.isMastered ? 1 : 0),
                nextDueAt: rec?.nextDueAt,
              };
            })
          );
        }
        const updated = await getDeckProgress(lastRunSummary.setId, selectedWordCount || 30);
        setDeckProgress(updated);
        refreshUserData();
      } catch (e) {
        console.error('Auto save progress error:', e);
      }
    };
    void autoSaveProgress();
  }, [lastRunSummary]);

  if (!lastRunSummary) {
    return (
      <main
        className="notebook-grid-bg"
        style={{
          height: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
        }}
      >
        <h2>Chưa có dữ liệu trận đấu.</h2>
        <StickerButton onClick={() => navigateTo('home')}>Về Sảnh</StickerButton>
      </main>
    );
  }

  const isWin = lastRunSummary.result === 'win';
  const masteredCount = wordResults.filter((w) => w.isMastered).length;

  return (
    <main
      className="notebook-grid-bg"
      style={{
        height: '100dvh',
        maxHeight: '100dvh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 16px',
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      {/* COMPACT SINGLE-VIEWPORT RESULT CARD */}
      <div
        style={{
          width: 'min(100%, 460px)',
          background: 'rgba(255, 255, 255, 0.95)',
          border: '2.5px solid var(--color-ink)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 6px 0 var(--color-ink), 0 16px 36px rgba(40, 38, 35, 0.12)',
          padding: 'clamp(16px, 4vh, 28px) clamp(16px, 4vw, 28px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 'clamp(8px, 2vh, 16px)',
        }}
      >
        {/* ICON BADGE */}
        <div
          style={{
            width: 'clamp(54px, 10vh, 72px)',
            height: 'clamp(54px, 10vh, 72px)',
            borderRadius: '50%',
            backgroundColor: isWin ? '#FEE2E2' : '#DBEAFE',
            border: '2.5px solid var(--color-ink)',
            boxShadow: '0 3px 0 var(--color-ink)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isWin ? (
            <Trophy size={36} color="#DC2626" strokeWidth={2.2} />
          ) : (
            <Skull size={36} color="#1D4ED8" strokeWidth={2.2} />
          )}
        </div>

        {/* PROMINENT TITLE: "THẮNG" (RED) / "THUA" (DEEP BLUE) */}
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(3.2rem, 12vh, 4.8rem)',
            fontWeight: 900,
            lineHeight: 0.95,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            margin: 0,
            color: isWin ? '#D32F2F' : '#0D47A1', // Win: Red, Lose: Dark Blue
            textShadow: '0 2px 0 rgba(0,0,0,0.06)',
          }}
        >
          {isWin ? 'THẮNG' : 'THUA'}
        </h1>

        {/* MINIMALIST SUMMARY BADGES */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '8px',
            width: '100%',
          }}
        >
          <div
            style={{
              padding: '6px 14px',
              border: '1.8px solid var(--color-ink)',
              borderRadius: 'var(--radius-pill)',
              background: '#FFF',
              font: '800 14px/1.2 var(--font-display)',
              boxShadow: '0 2px 0 var(--color-ink)',
            }}
          >
            ⭐ {lastRunSummary.totalScore.toLocaleString()}
          </div>

          <div
            style={{
              padding: '6px 14px',
              border: '1.8px solid var(--color-ink)',
              borderRadius: 'var(--radius-pill)',
              background: '#FFF8E1',
              color: '#B57C1E',
              font: '800 14px/1.2 var(--font-display)',
              boxShadow: '0 2px 0 var(--color-ink)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Coins size={15} />
            <span>+{reward.coins > 0 ? reward.coins : isWin ? 30 : 10} xu</span>
          </div>

          <div
            style={{
              padding: '6px 14px',
              border: '1.8px solid var(--color-ink)',
              borderRadius: 'var(--radius-pill)',
              background: '#FFF',
              font: '800 14px/1.2 var(--font-display)',
              boxShadow: '0 2px 0 var(--color-ink)',
            }}
          >
            ⚡ {masteredCount}/{wordResults.length || lastRunSummary.completedWords} từ thăng nấc SRS
          </div>
        </div>

        {/* PLUMP ROUNDED ACTION BUTTONS */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            width: '100%',
            maxWidth: '300px',
            marginTop: '4px',
          }}
        >
          <button
            className="sticker-btn sticker-btn-primary sticker-btn-lg"
            style={{ width: '100%' }}
            onClick={() => navigateTo('prepare')}
          >
            {isWin ? 'Chơi tiếp' : 'Tái đấu'}
          </button>

          <button
            className="sticker-btn"
            style={{ width: '100%' }}
            onClick={() => navigateTo('home')}
          >
            Về sảnh
          </button>
        </div>

        {/* OPTIONAL EXPAND DETAILS BUTTON */}
        <button
          onClick={() => setShowDetails(true)}
          style={{
            background: 'none',
            border: 'none',
            color: '#766B59',
            font: '700 13px/1.2 var(--font-display)',
            cursor: 'pointer',
            padding: '4px 8px',
            textDecoration: 'underline',
          }}
        >
          Xem chi tiết ▾
        </button>
      </div>

      {/* MODAL: DETAILED BREAKDOWN (ONLY SHOWN IF USER CLICKS) */}
      {showDetails && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(40, 38, 35, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setShowDetails(false)}
        >
          <div
            style={{
              width: 'min(100%, 520px)',
              maxHeight: '85vh',
              backgroundColor: '#FFFFFF',
              border: '2.5px solid var(--color-ink)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                borderBottom: '2px solid var(--color-ink)',
                backgroundColor: '#FFFDF5',
              }}
            >
              <h3 style={{ margin: 0, font: '900 18px var(--font-display)' }}>Chi Tiết Trận Đấu & Lộ Trình SRS</h3>
              <button
                onClick={() => setShowDetails(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '1.5px solid var(--color-ink)',
                  background: '#FFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body: Stats & Words List */}
            <div style={{ padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ padding: '10px', background: '#F8F9FA', borderRadius: '12px', border: '1px solid #E5E7EB', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>Độ chính xác</div>
                  <div style={{ fontSize: '20px', fontWeight: 800 }}>{Math.round(lastRunSummary.accuracy)}%</div>
                </div>
                <div style={{ padding: '10px', background: '#F8F9FA', borderRadius: '12px', border: '1px solid #E5E7EB', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>Vòng vượt qua</div>
                  <div style={{ fontSize: '20px', fontWeight: 800 }}>{lastRunSummary.wavesCleared}/3</div>
                </div>
              </div>

              {/* LỘ TRÌNH LẶP LẠI NGẮT QUÃNG CỦA TÀI KHOẢN */}
              {deckProgress && (
                <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: '12px', border: '1.5px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#1E293B' }}>Lộ trình Lặp lại ngắt quãng (SRS):</span>
                    <strong style={{ fontSize: '13px', color: '#0284C7' }}>
                      {deckProgress.srsDistribution.inRoadmapCount}/{deckProgress.totalWords} từ đã vào lộ trình
                    </strong>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', fontSize: '11px' }}>
                    <span style={{ padding: '3px 7px', background: '#EFF6FF', color: '#1D4ED8', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
                      Nấc 1 (1d): <strong>{deckProgress.srsDistribution.srs1}</strong>
                    </span>
                    <span style={{ padding: '3px 7px', background: '#EFF6FF', color: '#1D4ED8', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
                      Nấc 2 (3d): <strong>{deckProgress.srsDistribution.srs2}</strong>
                    </span>
                    <span style={{ padding: '3px 7px', background: '#EFF6FF', color: '#1D4ED8', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
                      Nấc 3 (7d): <strong>{deckProgress.srsDistribution.srs3}</strong>
                    </span>
                    <span style={{ padding: '3px 7px', background: '#ECFDF5', color: '#047857', borderRadius: '6px', border: '1px solid #A7F3D0' }}>
                      Nấc 4 (14d): <strong>{deckProgress.srsDistribution.srs4}</strong>
                    </span>
                    <span style={{ padding: '3px 7px', background: '#ECFDF5', color: '#047857', borderRadius: '6px', border: '1px solid #A7F3D0' }}>
                      Nấc 5 (30d): <strong>{deckProgress.srsDistribution.srs5}</strong>
                    </span>
                    <span style={{ padding: '3px 7px', background: '#FAF5FF', color: '#7E22CE', borderRadius: '6px', border: '1px solid #E9D5FF' }}>
                      Nấc 6 (60d): <strong>{deckProgress.srsDistribution.srs6}</strong>
                    </span>
                    {deckProgress.srsDistribution.dueCount > 0 && (
                      <span style={{ padding: '3px 7px', background: '#FFFBEB', color: '#B45309', borderRadius: '6px', border: '1px solid #FDE68A' }}>
                        Đến hạn ôn: <strong>{deckProgress.srsDistribution.dueCount}</strong>
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Words list with SRS stages */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                {wordResults.map((w) => (
                  <div
                    key={w.entryId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: w.isMastered ? '#F0FDF4' : '#FEF2F2',
                      border: `1.5px solid ${w.isMastered ? '#86EFAC' : '#FECACA'}`,
                      borderRadius: '12px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '15px' }}>{w.english}</div>
                      <div style={{ fontSize: '13px', color: '#6B7280' }}>{w.vietnamese}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => speakEnglishWord(w.english)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                        title="Nghe phát âm"
                      >
                        <Volume2 size={18} color="#4B5563" />
                      </button>
                      {w.isMastered ? (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            color: '#15803D',
                            background: '#DCFCE7',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: '1px solid #86EFAC',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Nấc {w.srsStage || 1} • Ôn sau {w.intervalDays || 1} ngày
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            color: '#B91C1C',
                            background: '#FEE2E2',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: '1px solid #FECACA',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Chưa qua nấc • Ôn lại sau 10p
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '12px 18px', borderTop: '1px solid #E5E7EB', textAlign: 'right' }}>
              <button
                className="sticker-btn sticker-btn-sm"
                onClick={() => setShowDetails(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
