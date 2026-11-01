import React, { useEffect, useState } from 'react';
import { useApp } from '../app/appStore';
import { db } from '../data/db';
import { RunSummary } from '../types/game';
import { LearningRecord, MemoryStage } from '../types/learning';
import { PaperPanel } from '../components/PaperPanel';
import { StickerButton } from '../components/StickerButton';
import { CoinBadge } from '../components/CoinBadge';
import { ArrowLeft, Award, BookCheck, Flame, History, Target } from 'lucide-react';
import { getActiveProfileId } from '../auth/authService';

export const ProgressPage: React.FC = () => {
  const { navigateTo, profile, wallet } = useApp();
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [srsCounts, setSrsCounts] = useState({
    new: 0,
    stage1: 0,
    stage2: 0,
    stage3: 0,
    stage4: 0,
    stage5: 0,
    stage6: 0,
    due: 0,
    struggling: 0,
  });
  const [totalAttempts, setTotalAttempts] = useState(0);

  useEffect(() => {
    const loadProgress = async () => {
      const profileId = getActiveProfileId();
      // 1. Last 10 runs
      const recentRuns = await db.runs.where('profileId').equals(profileId).toArray();
      recentRuns.sort((left, right) => right.startedAt.localeCompare(left.startedAt));
      recentRuns.splice(10);
      setRuns(recentRuns);

      // 2. Learning Records
      const now = new Date().toISOString();
      const records = await db.learningRecords.where('profileId').equals(profileId).toArray();
      const counts = {
        new: 0,
        stage1: 0,
        stage2: 0,
        stage3: 0,
        stage4: 0,
        stage5: 0,
        stage6: 0,
        due: 0,
        struggling: 0,
      };

      for (const r of records) {
        const srsStage = r.srsStage ?? (r.stage === 'remembered' ? 2 : r.stage === 'learning' ? 1 : 0);
        if (r.nextDueAt && r.nextDueAt <= now) {
          counts.due++;
        }
        if (r.stage === 'struggling') {
          counts.struggling++;
        }

        if (srsStage === 1) counts.stage1++;
        else if (srsStage === 2) counts.stage2++;
        else if (srsStage === 3) counts.stage3++;
        else if (srsStage === 4) counts.stage4++;
        else if (srsStage === 5) counts.stage5++;
        else if (srsStage >= 6) counts.stage6++;
      }

      // Words never reviewed count as 'new'
      const totalWords = await db.words.count();
      const inRoadmapWordIds = new Set(
        records
          .filter((r) => (r.srsStage ?? 0) >= 1 || r.stage === 'learning' || r.stage === 'remembered')
          .map((r) => r.wordId ?? r.entryId)
      );
      counts.new = Math.max(0, totalWords - inRoadmapWordIds.size);

      setSrsCounts(counts);

      const attemptsCount = await db.attempts.where('profileId').equals(profileId).count();
      setTotalAttempts(attemptsCount);
    };

    loadProgress();
  }, []);

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
        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <StickerButton onClick={() => navigateTo('home')} icon={<ArrowLeft size={18} />}>
            Trang Chủ
          </StickerButton>
          <CoinBadge amount={wallet?.balance || 0} size="md" showLabel />
        </div>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 900, marginBottom: '6px' }}>
          Tiến Trình & Thống Kê Học Tập
        </h1>
        <p style={{ color: 'var(--color-muted-ink)', marginBottom: '24px' }}>
          Theo dõi bằng chứng hồi tưởng từ vựng độc lập và lịch sử các trận chiến.
        </p>

        {/* Top Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          <PaperPanel style={{ padding: '16px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-muted-ink)', fontWeight: 700 }}>CẤP ĐỘ PHI CÔNG</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginTop: '4px' }}>
              Cấp {profile?.level || 1}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#0288D1', marginTop: '2px' }}>{profile?.xp || 0} XP tích lũy</div>
          </PaperPanel>

          <PaperPanel style={{ padding: '16px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-muted-ink)', fontWeight: 700 }}>TỔNG LẦN GÕ TỪ</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginTop: '4px' }}>
              {totalAttempts}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#2E7D32', marginTop: '2px' }}>Lần thử thách</div>
          </PaperPanel>

          <PaperPanel style={{ padding: '16px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-muted-ink)', fontWeight: 700 }}>TỔNG XU ĐÃ KIẾM</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginTop: '4px' }}>
              {wallet?.totalEarned.toLocaleString() || 0}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#F57F17', marginTop: '2px' }}>Xu trong đời</div>
          </PaperPanel>
        </div>

        {/* Memory Stages Breakdown */}
        <PaperPanel style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.25rem', margin: 0 }}>
              Lộ Trình Lặp Lại Ngắt Quãng (Spaced Repetition Roadmap)
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-muted-ink)' }}>
              Đã vào lộ trình: <strong>{srsCounts.stage1 + srsCounts.stage2 + srsCounts.stage3 + srsCounts.stage4 + srsCounts.stage5 + srsCounts.stage6}</strong> từ
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
            <div style={{ padding: '12px', backgroundColor: '#F8FAFC', border: '1.5px solid var(--color-ink)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>Chưa Vào Lộ Trình</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, marginTop: '4px' }}>{srsCounts.new}</div>
              <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: '2px' }}>Từ mới</div>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#EFF6FF', border: '1.5px solid var(--color-ink)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1D4ED8' }}>Nấc 1</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, marginTop: '4px', color: '#1D4ED8' }}>{srsCounts.stage1}</div>
              <div style={{ fontSize: '0.7rem', color: '#3B82F6', marginTop: '2px' }}>Khoảng cách 1 ngày</div>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#EFF6FF', border: '1.5px solid var(--color-ink)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1D4ED8' }}>Nấc 2</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, marginTop: '4px', color: '#1D4ED8' }}>{srsCounts.stage2}</div>
              <div style={{ fontSize: '0.7rem', color: '#3B82F6', marginTop: '2px' }}>Khoảng cách 3 ngày</div>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#EFF6FF', border: '1.5px solid var(--color-ink)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1D4ED8' }}>Nấc 3</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, marginTop: '4px', color: '#1D4ED8' }}>{srsCounts.stage3}</div>
              <div style={{ fontSize: '0.7rem', color: '#3B82F6', marginTop: '2px' }}>Khoảng cách 7 ngày</div>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#ECFDF5', border: '1.5px solid var(--color-ink)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#047857' }}>Nấc 4</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, marginTop: '4px', color: '#047857' }}>{srsCounts.stage4}</div>
              <div style={{ fontSize: '0.7rem', color: '#10B981', marginTop: '2px' }}>Khoảng cách 14 ngày</div>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#ECFDF5', border: '1.5px solid var(--color-ink)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#047857' }}>Nấc 5</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, marginTop: '4px', color: '#047857' }}>{srsCounts.stage5}</div>
              <div style={{ fontSize: '0.7rem', color: '#10B981', marginTop: '2px' }}>Khoảng cách 30 ngày</div>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#FAF5FF', border: '1.5px solid var(--color-ink)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#7E22CE' }}>Nấc 6</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, marginTop: '4px', color: '#7E22CE' }}>{srsCounts.stage6}</div>
              <div style={{ fontSize: '0.7rem', color: '#A855F7', marginTop: '2px' }}>Dài hạn (60 ngày)</div>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#FFFBEB', border: '1.5px solid var(--color-ink)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#B45309' }}>Đến Hạn Ôn</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, marginTop: '4px', color: '#B45309' }}>{srsCounts.due}</div>
              <div style={{ fontSize: '0.7rem', color: '#D97706', marginTop: '2px' }}>Cần ôn hôm nay</div>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#FEF2F2', border: '1.5px solid var(--color-ink)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#B91C1C' }}>Hay Sai / Ôn Gấp</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, marginTop: '4px', color: '#B91C1C' }}>{srsCounts.struggling}</div>
              <div style={{ fontSize: '0.7rem', color: '#EF4444', marginTop: '2px' }}>Ôn lại sau 10 phút</div>
            </div>
          </div>
        </PaperPanel>

        {/* Recent 10 Runs */}
        <PaperPanel>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <History size={20} />
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.25rem' }}>
              Lịch Sử 10 Trận Chiến Gần Nhất
            </h3>
          </div>

          {runs.length === 0 ? (
            <p style={{ color: 'var(--color-muted-ink)' }}>Bạn chưa hoàn thành trận đấu nào.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {runs.map((r) => (
                <div
                  key={r.id}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: 'var(--color-paper)',
                    border: '1.5px solid var(--color-ink)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontWeight: 800,
                          color: r.result === 'win' ? '#2E7D32' : 'var(--color-danger)',
                        }}
                      >
                        {r.result === 'win' ? 'CHIẾN THẮNG' : r.result === 'lose' ? 'THẤT BẠI' : 'THOÁT TRẬN'}
                      </span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-muted-ink)' }}>
                        • Chế độ: {r.mode} • Độ khó: {{ beginner: 'Siêu dễ', easy: 'Dễ', normal: 'Vừa', hard: 'Khó', nightmare: 'Cực khó' }[r.difficulty] || r.difficulty}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-muted-ink)', marginTop: '2px' }}>
                      {new Date(r.startedAt).toLocaleString('vi-VN')}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800 }}>{r.totalScore.toLocaleString()} điểm</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-muted-ink)' }}>
                        Độ chính xác: {r.accuracy}%
                      </div>
                    </div>
                    <CoinBadge amount={r.coinsEarned || 0} size="sm" showLabel />
                  </div>
                </div>
              ))}
            </div>
          )}
        </PaperPanel>
      </div>
    </div>
  );
};
