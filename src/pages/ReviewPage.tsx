import React, { useEffect, useState } from 'react';
import { useApp } from '../app/appStore';
import { Attempt, LearningRecord } from '../types/learning';
import { VocabularyEntry } from '../types/vocabulary';
import { db } from '../data/db';
import { PaperPanel } from '../components/PaperPanel';
import { StickerButton } from '../components/StickerButton';
import { ArrowLeft, Play, RotateCcw, Volume2, Check, X, BookOpen } from 'lucide-react';
import { speakEnglishWord } from '../learning/pronunciation';
import { getActiveProfileId } from '../auth/authService';

export const ReviewPage: React.FC = () => {
  const { navigateTo } = useApp();
  const [dueEntries, setDueEntries] = useState<{ entry: VocabularyEntry; record?: LearningRecord }[]>([]);
  const [recentMistakes, setRecentMistakes] = useState<{ entry: VocabularyEntry; attempt: Attempt }[]>([]);

  // Flashcard practice test
  const [activeWord, setActiveWord] = useState<VocabularyEntry | null>(null);
  const [practiceInput, setPracticeInput] = useState('');
  const [practiceResult, setPracticeResult] = useState<'idle' | 'correct' | 'wrong'>('idle');

  useEffect(() => {
    const loadData = async () => {
      const now = new Date().toISOString();
      const profileId = getActiveProfileId();
      const allRecords = await db.learningRecords.where('profileId').equals(profileId).toArray();
      const allWords = await db.words.toArray();
      const wordMap = new Map(allWords.map((w) => [w.id, w]));

      // 1. Due today
      const dueList: { entry: VocabularyEntry; record?: LearningRecord }[] = [];
      for (const rec of allRecords) {
        if (rec.nextDueAt && rec.nextDueAt <= now) {
          const entry = wordMap.get(rec.wordId ?? rec.entryId);
          if (entry) {
            dueList.push({ entry, record: rec });
          }
        }
      }
      setDueEntries(dueList);

      // 2. Recent mistakes from attempts
      const attempts = await db.attempts
        .where('profileId')
        .equals(profileId)
        .filter((attempt) => Boolean(attempt.occurredAt))
        .toArray();
      attempts.sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
      attempts.splice(30);
      const mistakes: { entry: VocabularyEntry; attempt: Attempt }[] = [];
      const seen = new Set<string>();

      for (const att of attempts) {
        if ((att.outcome === 'wrong' || att.outcome === 'timeout' || att.hadHint) && !seen.has(att.entryId)) {
          seen.add(att.entryId);
          const entry = wordMap.get(att.entryId);
          if (entry) {
            mistakes.push({ entry, attempt: att });
          }
        }
      }
      setRecentMistakes(mistakes);

      if (dueList.length > 0) {
        setActiveWord(dueList[0].entry);
      } else if (mistakes.length > 0) {
        setActiveWord(mistakes[0].entry);
      }
    };

    loadData();
  }, []);

  const handleTestPractice = () => {
    if (!activeWord) return;
    const cleanIn = practiceInput.trim().toLowerCase();
    const isMatch = activeWord.acceptedAnswers.some((ans) => ans.toLowerCase().trim() === cleanIn);
    setPracticeResult(isMatch ? 'correct' : 'wrong');
  };

  return (
    <div
      className="notebook-grid-bg app-page"
      style={{
        minHeight: '100vh',
        padding: '30px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div style={{ width: '100%', maxWidth: '850px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <StickerButton onClick={() => navigateTo('home')} icon={<ArrowLeft size={18} />}>
            Trang Chủ
          </StickerButton>

          {dueEntries.length > 0 && (
            <StickerButton
              variant="primary"
              onClick={() => navigateTo('prepare')}
              icon={<Play fill="var(--color-ink)" size={16} />}
            >
              Bắt Đầu Trận Ôn Tập ({dueEntries.length} từ)
            </StickerButton>
          )}
        </div>

        <PaperPanel style={{ marginBottom: '24px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 900, marginBottom: '6px' }}>
            Trung Tâm Ôn Tập Lặp Lại
          </h1>
          <p style={{ color: 'var(--color-muted-ink)' }}>
            Hệ thống tự động theo dõi và nhắc bạn ôn các từ đến hạn hoặc các từ hay gõ sai/timeout.
          </p>

          {/* Flashcard Quick Practice Box */}
          {activeWord && (
            <div
              style={{
                marginTop: '20px',
                padding: '20px',
                backgroundColor: 'var(--color-paper)',
                border: '2px solid var(--color-ink)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-sticker-sm)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '0.85rem', color: 'var(--color-muted-ink)', fontWeight: 700 }}>
                LUYỆN TẬP GÕ LẠI NHANH
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.8rem',
                  fontWeight: 900,
                  color: 'var(--color-ink)',
                  margin: '10px 0',
                }}
              >
                {activeWord.vietnamese}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--color-muted-ink)', marginBottom: '16px' }}>
                {activeWord.ipa && <span>{activeWord.ipa} • </span>}
                {activeWord.partOfSpeech && <span>({activeWord.partOfSpeech})</span>}
              </div>

              {/* Input for practice */}
              <div style={{ display: 'flex', gap: '8px', maxWidth: '360px', margin: '0 auto' }}>
                <input
                  type="text"
                  placeholder="Gõ từ tiếng Anh..."
                  value={practiceInput}
                  onChange={(e) => {
                    setPracticeInput(e.target.value);
                    setPracticeResult('idle');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleTestPractice();
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    fontFamily: 'var(--font-english)',
                    fontWeight: 700,
                    fontSize: '1.15rem',
                    border: 'var(--border-ink)',
                    borderRadius: 'var(--radius-md)',
                    outline: 'none',
                  }}
                />
                <StickerButton variant="primary" onClick={handleTestPractice}>
                  Kiểm Tra
                </StickerButton>
                <StickerButton
                  size="sm"
                  onClick={() => speakEnglishWord(activeWord.english, activeWord.audioUrl)}
                  icon={<Volume2 size={16} />}
                />
              </div>

              {practiceResult === 'correct' && (
                <div style={{ marginTop: '12px', color: '#2E7D32', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Check size={18} /> Chính xác: <strong style={{ fontFamily: 'var(--font-english)' }}>{activeWord.english}</strong>
                </div>
              )}
              {practiceResult === 'wrong' && (
                <div style={{ marginTop: '12px', color: 'var(--color-danger)', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <X size={18} /> Chưa đúng! Đáp án đúng là: <strong style={{ fontFamily: 'var(--font-english)' }}>{activeWord.english}</strong>
                </div>
              )}
            </div>
          )}
        </PaperPanel>

        {/* Word Lists */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {/* Due Words */}
          <PaperPanel>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', marginBottom: '12px' }}>
              Từ Cần Ôn Hôm Nay ({dueEntries.length})
            </h3>
            {dueEntries.length === 0 ? (
              <p style={{ color: 'var(--color-muted-ink)', fontSize: '0.9rem' }}>
                Tuyệt vời! Hiện tại không có từ nào bị trễ hạn ôn tập.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                {dueEntries.map(({ entry, record }) => (
                  <div
                    key={entry.id}
                    onClick={() => {
                      setActiveWord(entry);
                      setPracticeInput('');
                      setPracticeResult('idle');
                    }}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: activeWord?.id === entry.id ? '#FFF0F5' : 'var(--color-paper)',
                      border: '1.5px solid var(--color-ink)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 800, fontFamily: 'var(--font-english)', fontSize: '1.05rem' }}>{entry.english}</span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1D4ED8', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '1px 6px', borderRadius: '4px' }}>
                        Nấc {record?.srsStage || 1}
                      </span>
                    </div>
                    <span style={{ color: '#E06C96', fontWeight: 700, fontFamily: 'var(--font-vietnamese)' }}>{entry.vietnamese}</span>
                  </div>
                ))}
              </div>
            )}
          </PaperPanel>

          {/* Recent Mistakes */}
          <PaperPanel>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', marginBottom: '12px' }}>
              Từ Hay Sai / Hết Giờ ({recentMistakes.length})
            </h3>
            {recentMistakes.length === 0 ? (
              <p style={{ color: 'var(--color-muted-ink)', fontSize: '0.9rem' }}>
                Chưa có lỗi sai nào được ghi nhận trong các trận gần đây.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                {recentMistakes.map(({ entry, attempt }) => (
                  <div
                    key={entry.id}
                    onClick={() => {
                      setActiveWord(entry);
                      setPracticeInput('');
                      setPracticeResult('idle');
                    }}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: activeWord?.id === entry.id ? '#FFF0F5' : 'var(--color-paper)',
                      border: '1.5px solid var(--color-ink)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 800, fontFamily: 'var(--font-english)', fontSize: '1.05rem' }}>{entry.english}</span>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-danger)', fontFamily: 'var(--font-vietnamese)' }}>
                        {attempt.outcome === 'timeout' ? 'Hết giờ (quái chạm phòng thủ)' : 'Có dùng gợi ý hoặc gõ sai'}
                      </div>
                    </div>
                    <span style={{ color: '#E06C96', fontWeight: 700, fontFamily: 'var(--font-vietnamese)' }}>{entry.vietnamese}</span>
                  </div>
                ))}
              </div>
            )}
          </PaperPanel>
        </div>
      </div>
    </div>
  );
};
