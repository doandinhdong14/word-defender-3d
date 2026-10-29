import React, { useEffect, useState } from 'react';
import { useApp } from '../app/appStore';
import { awardRunRewards } from '../economy/rewards';
import { PaperPanel } from '../components/PaperPanel';
import { StickerButton } from '../components/StickerButton';
import { CoinBadge } from '../components/CoinBadge';
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
  RotateCcw,
  BookOpen,
  ShoppingBag,
  Home,
  CheckCircle2,
  Volume2,
  BookmarkCheck,
  TrendingUp,
  Award,
  Zap,
  Target,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

export const ResultsPage: React.FC = () => {
  const { account } = useAuth();
  const { lastRunSummary, navigateTo, refreshUserData, settings, selectedWordCount } = useApp();
  const [reward, setReward] = useState<{ coins: number; xp: number }>({ coins: 0, xp: 0 });
  const [deckProgress, setDeckProgress] = useState<DeckProgressInfo | null>(null);
  const [wordResults, setWordResults] = useState<RunWordSummary[]>([]);
  const [wordMasteredStates, setWordMasteredStates] = useState<Record<string, boolean>>({});
  const [activeWordFilter, setActiveWordFilter] = useState<'all' | 'mastered' | 'unmastered'>('all');
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [deckTitle, setDeckTitle] = useState<string>('Bộ từ vựng');

  useEffect(() => {
    if (!lastRunSummary) return;

    // Trigger paper confetti on win
    if (lastRunSummary.result === 'win' && !settings?.reduceMotion) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#F58AB0', '#FFD47D', '#A9DDC3', '#70B9E1'],
      });
    }

    // Award rewards idempotently
    const award = async () => {
      const res = await awardRunRewards(lastRunSummary);
      setReward({ coins: res.coinsEarned, xp: res.xpEarned });
      refreshUserData();
    };
    if (account) void award();

    // Load deck title and progress
    db.wordSets.get(lastRunSummary.setId).then((s) => {
      if (s) setDeckTitle(s.title);
    });

    getDeckProgress(lastRunSummary.setId, selectedWordCount || 30).then(setDeckProgress);

    // Extract wordResults from lastRunSummary or reconstruct from attemptedEntryIds
    if (lastRunSummary.wordResults && lastRunSummary.wordResults.length > 0) {
      setWordResults(lastRunSummary.wordResults);
      const initialStates: Record<string, boolean> = {};
      lastRunSummary.wordResults.forEach((w) => {
        initialStates[w.entryId] = w.isMastered;
      });
      setWordMasteredStates(initialStates);
    } else if (lastRunSummary.attemptedEntryIds && lastRunSummary.attemptedEntryIds.length > 0) {
      db.words.bulkGet(lastRunSummary.attemptedEntryIds).then((entries) => {
        const fallbackResults: RunWordSummary[] = entries
          .filter(Boolean)
          .map((entry) => ({
            entryId: entry!.id,
            english: entry!.english,
            vietnamese: entry!.vietnamese,
            ipa: entry!.ipa,
            partOfSpeech: entry!.partOfSpeech,
            outcome: 'correct',
            hadHint: false,
            wrongKeystrokes: 0,
            timeToAnswerMs: 1200,
            isMastered: true,
          }));
        setWordResults(fallbackResults);
        const initialStates: Record<string, boolean> = {};
        fallbackResults.forEach((w) => {
          initialStates[w.entryId] = true;
        });
        setWordMasteredStates(initialStates);
      });
    }
  }, [lastRunSummary]);

  const toggleWordMastered = (entryId: string) => {
    setWordMasteredStates((prev) => ({
      ...prev,
      [entryId]: !prev[entryId],
    }));
  };

  const handleConfirmAndSaveProgress = async () => {
    if (!lastRunSummary || isSaved || saving) return;

    setSaving(true);
    try {
      const itemsToSave = wordResults.map((w) => ({
        entryId: w.entryId,
        isMastered: wordMasteredStates[w.entryId] ?? w.isMastered,
        mode: lastRunSummary.mode,
        hadHint: w.hadHint,
      }));

      const res = await batchSaveLearningProgress(itemsToSave);
      setIsSaved(true);
      setSaveSuccessMessage(
        `✓ Đã cập nhật ${res.updatedCount} từ vào hệ thống Anki Spaced Repetition! (${res.masteredCount} từ đã thuộc được dời lịch ôn, lần sau sẽ ưu tiên từ mới).`
      );

      // Refresh deck progress to reflect the newly saved data
      const updated = await getDeckProgress(lastRunSummary.setId, selectedWordCount || 30);
      setDeckProgress(updated);
      refreshUserData();
    } catch (err: any) {
      console.error('Error saving SRS progress:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!lastRunSummary) {
    return (
      <div className="notebook-grid-bg" style={{ minHeight: '100vh', padding: '40px', textAlign: 'center' }}>
        <PaperPanel style={{ maxWidth: '400px', margin: '0 auto' }}>
          <h2>Chưa có dữ liệu trận đấu vừa qua.</h2>
          <div style={{ marginTop: '20px' }}>
            <StickerButton onClick={() => navigateTo('home')}>Về Trang Chủ</StickerButton>
          </div>
        </PaperPanel>
      </div>
    );
  }

  const isWin = lastRunSummary.result === 'win';
  const masteredList = wordResults.filter((w) => wordMasteredStates[w.entryId] ?? w.isMastered);
  const unmasteredList = wordResults.filter((w) => !(wordMasteredStates[w.entryId] ?? w.isMastered));

  const filteredWords =
    activeWordFilter === 'mastered'
      ? masteredList
      : activeWordFilter === 'unmastered'
      ? unmasteredList
      : wordResults;

  return (
    <div
      className="notebook-grid-bg app-page"
      style={{
        minHeight: '100vh',
        padding: '30px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div style={{ width: '100%', maxWidth: '820px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* PANEL 1: MATCH RESULT & REWARD */}
        <PaperPanel style={{ textAlign: 'center', padding: '28px 20px' }}>
          <div
            style={{
              width: '76px',
              height: '76px',
              borderRadius: '50%',
              backgroundColor: isWin ? 'var(--color-accent-yellow)' : '#FFEBEE',
              border: 'var(--border-ink-thick)',
              boxShadow: 'var(--shadow-sticker)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px auto',
            }}
          >
            {isWin ? <Trophy size={40} color="#F57F17" /> : <Skull size={40} color="#D32F2F" />}
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2.2rem',
              fontWeight: 900,
              color: isWin ? '#2E7D32' : 'var(--color-danger)',
              marginBottom: '6px',
            }}
          >
            {isWin ? 'CHIẾN THẮNG VANG DỘI!' : 'HẾT MÁU RỒI! CỐ LÊN NHÉ'}
          </h1>
          <p style={{ color: 'var(--color-muted-ink)', fontSize: '0.95rem', margin: 0 }}>
            {isWin
              ? 'Bạn đã hạ gục toàn bộ quái vật và trùm Alien!'
              : 'Đừng nản lòng, hãy xem lại các từ chưa thuộc và ôn tập nhé!'}
          </p>

          {/* Guest Notice */}
          {!account && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px 16px',
                backgroundColor: '#E3F2FD',
                border: '1.5px solid #0288D1',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.9rem',
                color: '#01579B',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <span>Tiến trình Spaced Repetition của bạn được lưu trực tiếp trên trình duyệt này!</span>
              <button
                onClick={() => navigateTo('account')}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#0288D1',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Đăng nhập Google để đồng bộ
              </button>
            </div>
          )}

          {/* Reward Badges */}
          {account && (
            <div
              style={{
                margin: '20px 0 16px 0',
                padding: '14px',
                backgroundColor: '#FFF9E6',
                border: '2px solid var(--color-ink)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-muted-ink)', fontWeight: 800 }}>
                  XU THƯỞNG NHẬN ĐƯỢC
                </div>
                <div style={{ marginTop: '4px' }}>
                  <CoinBadge amount={reward.coins} size="lg" showLabel />
                </div>
              </div>

              <div style={{ width: '2px', height: '36px', backgroundColor: 'var(--color-grid)' }} />

              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-muted-ink)', fontWeight: 800 }}>
                  KINH NGHIỆM (XP)
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.3rem',
                    fontWeight: 900,
                    color: 'var(--color-ink)',
                    marginTop: '4px',
                  }}
                >
                  +{reward.xp} XP
                </div>
              </div>
            </div>
          )}

          {/* Match Stats Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '10px',
              textAlign: 'left',
              marginTop: '16px',
            }}
          >
            <div
              style={{
                padding: '10px 12px',
                backgroundColor: 'var(--color-paper)',
                border: '1.5px solid var(--color-ink)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--color-muted-ink)', fontWeight: 700 }}>
                Tổng Điểm Trận
              </div>
              <div style={{ fontWeight: 900, fontSize: '1.2rem', fontFamily: 'var(--font-mono)' }}>
                {lastRunSummary.totalScore.toLocaleString()}
              </div>
            </div>

            <div
              style={{
                padding: '10px 12px',
                backgroundColor: 'var(--color-paper)',
                border: '1.5px solid var(--color-ink)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--color-muted-ink)', fontWeight: 700 }}>
                Độ Chính Xác Gõ
              </div>
              <div style={{ fontWeight: 900, fontSize: '1.2rem', color: lastRunSummary.accuracy >= 90 ? '#2E7D32' : '#F57F17' }}>
                {lastRunSummary.accuracy}%
              </div>
            </div>

            <div
              style={{
                padding: '10px 12px',
                backgroundColor: 'var(--color-paper)',
                border: '1.5px solid var(--color-ink)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--color-muted-ink)', fontWeight: 700 }}>
                Nhớ Độc Lập (Recall)
              </div>
              <div style={{ fontWeight: 900, fontSize: '1.2rem', color: '#E06C96' }}>
                {lastRunSummary.independentRecallCorrect} từ
              </div>
            </div>

            <div
              style={{
                padding: '10px 12px',
                backgroundColor: 'var(--color-paper)',
                border: '1.5px solid var(--color-ink)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--color-muted-ink)', fontWeight: 700 }}>
                Số Đợt Vượt Qua
              </div>
              <div style={{ fontWeight: 900, fontSize: '1.2rem' }}>
                {lastRunSummary.wavesCleared} / 3 đợt
              </div>
            </div>
          </div>
        </PaperPanel>

        {/* PANEL 2: DECK ROADMAP & COMPLETION PROGRESS BAR & CHART */}
        {deckProgress && (
          <PaperPanel style={{ padding: '24px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-muted-ink)', textTransform: 'uppercase' }}>
                  LỘ TRÌNH & TIẾN ĐỘ BỘ TỪ
                </span>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 900, margin: '2px 0 0 0' }}>
                  {deckTitle} ({deckProgress.totalWords} từ)
                </h2>
              </div>
              <div
                style={{
                  padding: '6px 14px',
                  backgroundColor: '#E8F5E9',
                  border: '2px solid #2E7D32',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <TrendingUp size={18} color="#2E7D32" />
                <span style={{ fontWeight: 900, color: '#2E7D32', fontSize: '1.1rem' }}>
                  {deckProgress.completionPercent}% Hoàn Thành
                </span>
              </div>
            </div>

            {/* Segmented Multi-Color Progress Bar */}
            <div style={{ marginBottom: '16px' }}>
              <div
                style={{
                  height: '22px',
                  width: '100%',
                  backgroundColor: '#ECEFF1',
                  borderRadius: '11px',
                  overflow: 'hidden',
                  display: 'flex',
                  border: '1.5px solid var(--color-ink)',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                {/* Mastered (Green) */}
                {deckProgress.masteredWords > 0 && (
                  <div
                    title={`Đã thuộc: ${deckProgress.masteredWords} từ`}
                    style={{
                      width: `${(deckProgress.masteredWords / deckProgress.totalWords) * 100}%`,
                      backgroundColor: '#2E7D32',
                      transition: 'width 0.6s ease',
                    }}
                  />
                )}
                {/* Learning (Yellow) */}
                {deckProgress.learningWords > 0 && (
                  <div
                    title={`Đang học: ${deckProgress.learningWords} từ`}
                    style={{
                      width: `${(deckProgress.learningWords / deckProgress.totalWords) * 100}%`,
                      backgroundColor: '#FBC02D',
                      transition: 'width 0.6s ease',
                    }}
                  />
                )}
                {/* Struggling (Red) */}
                {deckProgress.strugglingWords > 0 && (
                  <div
                    title={`Cần ôn tập gấp: ${deckProgress.strugglingWords} từ`}
                    style={{
                      width: `${(deckProgress.strugglingWords / deckProgress.totalWords) * 100}%`,
                      backgroundColor: '#D32F2F',
                      transition: 'width 0.6s ease',
                    }}
                  />
                )}
                {/* New / Unseen (Gray/White) */}
                {deckProgress.newWords > 0 && (
                  <div
                    title={`Chưa học: ${deckProgress.newWords} từ`}
                    style={{
                      width: `${(deckProgress.newWords / deckProgress.totalWords) * 100}%`,
                      backgroundColor: '#CFD8DC',
                    }}
                  />
                )}
              </div>

              {/* Progress Legend */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                  marginTop: '10px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#2E7D32' }} />
                  <span>Đã thuộc: <strong>{deckProgress.masteredWords}</strong> ({Math.round((deckProgress.masteredWords / deckProgress.totalWords) * 100)}%)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#FBC02D' }} />
                  <span>Đang học: <strong>{deckProgress.learningWords}</strong> ({Math.round((deckProgress.learningWords / deckProgress.totalWords) * 100)}%)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#D32F2F' }} />
                  <span>Cần ôn lại: <strong>{deckProgress.strugglingWords}</strong> ({Math.round((deckProgress.strugglingWords / deckProgress.totalWords) * 100)}%)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#90A4AE' }} />
                  <span>Chưa học: <strong>{deckProgress.newWords}</strong> ({Math.round((deckProgress.newWords / deckProgress.totalWords) * 100)}%)</span>
                </div>
              </div>
            </div>

            {/* Milestones Road */}
            <div
              style={{
                marginTop: '16px',
                paddingTop: '14px',
                borderTop: '1px solid #ECEFF1',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '8px',
              }}
            >
              {[
                { pct: 25, title: '🥉 Tập Sự', achieved: deckProgress.completionPercent >= 25 },
                { pct: 50, title: '🥈 Chiến Binh', achieved: deckProgress.completionPercent >= 50 },
                { pct: 75, title: '🥇 Tinh Anh', achieved: deckProgress.completionPercent >= 75 },
                { pct: 100, title: '💎 Bậc Thầy', achieved: deckProgress.completionPercent >= 100 },
              ].map((m) => (
                <div
                  key={m.pct}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    backgroundColor: m.achieved ? '#FFF9C4' : '#F5F5F5',
                    border: m.achieved ? '1.5px solid #FBC02D' : '1px dashed #BDBDBD',
                    textAlign: 'center',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: m.achieved ? '#F57F17' : '#9E9E9E',
                  }}
                >
                  <div>{m.title}</div>
                  <small style={{ fontSize: '0.75rem' }}>{m.pct}% ({Math.round((deckProgress.totalWords * m.pct) / 100)} từ)</small>
                </div>
              ))}
            </div>
          </PaperPanel>
        )}

        {/* PANEL 3: WORD-BY-WORD BREAKDOWN IN THIS MATCH */}
        <PaperPanel style={{ padding: '24px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 900, margin: 0 }}>
                Danh Sách Từ Vựng Vừa Chơi ({wordResults.length} từ)
              </h2>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-muted-ink)' }}>
                Bạn có thể bấm trực tiếp để đổi trạng thái "Đã thuộc" hoặc "Cần học lại" trước khi lưu.
              </span>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setActiveWordFilter('all')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '16px',
                  border: '1.5px solid var(--color-ink)',
                  backgroundColor: activeWordFilter === 'all' ? 'var(--color-ink)' : 'transparent',
                  color: activeWordFilter === 'all' ? '#FFF' : 'var(--color-ink)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Tất cả ({wordResults.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveWordFilter('mastered')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '16px',
                  border: '1.5px solid #2E7D32',
                  backgroundColor: activeWordFilter === 'mastered' ? '#2E7D32' : '#E8F5E9',
                  color: activeWordFilter === 'mastered' ? '#FFF' : '#2E7D32',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                ✓ Đã thuộc ({masteredList.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveWordFilter('unmastered')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '16px',
                  border: '1.5px solid #D32F2F',
                  backgroundColor: activeWordFilter === 'unmastered' ? '#D32F2F' : '#FFEBEE',
                  color: activeWordFilter === 'unmastered' ? '#FFF' : '#D32F2F',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                ⚠️ Chưa thuộc ({unmasteredList.length})
              </button>
            </div>
          </div>

          {/* Word List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
            {filteredWords.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-muted-ink)' }}>
                Không có từ nào trong danh mục này.
              </div>
            ) : (
              filteredWords.map((word) => {
                const isMastered = wordMasteredStates[word.entryId] ?? word.isMastered;
                return (
                  <div
                    key={word.entryId}
                    style={{
                      padding: '12px 14px',
                      backgroundColor: isMastered ? '#F1F8E9' : '#FFF3E0',
                      border: `1.5px solid ${isMastered ? '#81C784' : '#FFB74D'}`,
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                      flexWrap: 'wrap',
                    }}
                  >
                    {/* Left: Word, IPA, Audio, Meaning */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => speakEnglishWord(word.english)}
                        title="Nghe phát âm chuẩn tiếng Anh"
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          border: '1.5px solid var(--color-ink)',
                          backgroundColor: '#FFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <Volume2 size={16} color="#0288D1" />
                      </button>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                          <span style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-ink)' }}>
                            {word.english}
                          </span>
                          {word.ipa && (
                            <span style={{ fontSize: '0.85rem', color: '#555', fontFamily: 'var(--font-mono)' }}>
                              {word.ipa}
                            </span>
                          )}
                          {word.partOfSpeech && (
                            <span style={{ fontSize: '0.75rem', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#E0E0E0', color: '#424242' }}>
                              {word.partOfSpeech}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.92rem', color: '#1B5E20', fontWeight: 600, marginTop: '2px' }}>
                          {word.vietnamese}
                        </div>
                      </div>
                    </div>

                    {/* Right: Outcome badge & Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {word.hadHint && (
                        <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '12px', backgroundColor: '#FFF9C4', color: '#F57F17', fontWeight: 700 }}>
                          Có dùng gợi ý
                        </span>
                      )}
                      {word.outcome === 'timeout' && (
                        <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '12px', backgroundColor: '#FFCDD2', color: '#C62828', fontWeight: 700 }}>
                          Chạm phòng thủ
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleWordMastered(word.entryId)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '16px',
                          border: `1.5px solid ${isMastered ? '#2E7D32' : '#E65100'}`,
                          backgroundColor: isMastered ? '#2E7D32' : '#FFF',
                          color: isMastered ? '#FFF' : '#E65100',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {isMastered ? '✓ Đã thuộc' : '⚠️ Cần học lại'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </PaperPanel>

        {/* PANEL 4: CONFIRMATION & ANKI SPACED REPETITION SAVE */}
        <PaperPanel style={{ padding: '24px 20px', backgroundColor: '#F0F9FF', border: '2px solid #0288D1' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
            <div style={{ padding: '8px', borderRadius: '50%', backgroundColor: '#E1F5FE' }}>
              <ShieldCheck size={28} color="#0288D1" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#01579B', margin: '0 0 4px 0' }}>
                Xác Nhận Tiến Trình & Áp Dụng Thuật Toán Anki (SM-2)
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#0277BD', margin: 0, lineHeight: 1.5 }}>
                Khi bạn bấm xác nhận, hệ thống Spaced Repetition sẽ tự động ghi nhớ và <strong>loại trừ các từ đã thuộc</strong> khỏi các trận đấu tiếp theo. Các từ này sẽ chỉ xuất hiện lại khi đến chu kỳ ôn tập thông minh (1 ngày ➔ 3 ngày ➔ 7 ngày ➔ 14 ngày ➔ 30 ngày) giúp bạn đạt hiệu quả ghi nhớ vĩnh viễn!
              </p>
            </div>
          </div>

          {saveSuccessMessage && (
            <div
              style={{
                marginBottom: '16px',
                padding: '12px 16px',
                backgroundColor: '#E8F5E9',
                border: '1.5px solid #2E7D32',
                borderRadius: 'var(--radius-sm)',
                color: '#1B5E20',
                fontWeight: 700,
                fontSize: '0.95rem',
              }}
            >
              {saveSuccessMessage}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleConfirmAndSaveProgress}
              disabled={isSaved || saving}
              style={{
                flex: '1 1 280px',
                padding: '14px 20px',
                backgroundColor: isSaved ? '#78909C' : '#2E7D32',
                color: '#FFF',
                border: 'var(--border-ink-thick)',
                borderRadius: 'var(--radius-md)',
                boxShadow: isSaved ? 'none' : 'var(--shadow-sticker)',
                fontWeight: 900,
                fontSize: '1.05rem',
                cursor: isSaved ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s',
              }}
            >
              {saving ? (
                <>
                  <RefreshCw size={20} className="spin" /> Đang Lưu Vào Anki SRS...
                </>
              ) : isSaved ? (
                <>
                  <CheckCircle2 size={20} /> ĐÃ LƯU TIẾN TRÌNH VÀO ANKI SRS
                </>
              ) : (
                <>
                  <BookmarkCheck size={20} /> XÁC NHẬN & LƯU TIẾN TRÌNH (ANKI SRS)
                </>
              )}
            </button>
          </div>
        </PaperPanel>

        {/* NAVIGATION BUTTONS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <StickerButton
              variant="primary"
              size="lg"
              onClick={() => navigateTo('prepare')}
              icon={<ArrowRight size={20} />}
              style={{ flex: '1 1 200px' }}
            >
              Tiếp Tục Chặng Tiếp Theo ({selectedWordCount || 30} từ)
            </StickerButton>

            <StickerButton
              variant="accent"
              size="lg"
              onClick={() => navigateTo('battle')}
              icon={<RotateCcw size={20} />}
              style={{ flex: '1 1 200px' }}
            >
              Luyện Tập Lại Trận Này
            </StickerButton>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <StickerButton
              onClick={() => navigateTo('library')}
              icon={<BookOpen size={18} />}
              style={{ flex: '1 1 180px' }}
            >
              Về Thư Viện Bộ Từ
            </StickerButton>

            <StickerButton
              onClick={() => navigateTo('store')}
              icon={<ShoppingBag size={18} />}
              style={{ flex: '1 1 180px' }}
            >
              Vào Cửa Hàng
            </StickerButton>

            <StickerButton
              onClick={() => navigateTo('home')}
              icon={<Home size={18} />}
              style={{ flex: '1 1 180px' }}
            >
              Về Trang Chủ
            </StickerButton>
          </div>
        </div>
      </div>
    </div>
  );
};
