import React, { useEffect, useState } from 'react';
import { useApp } from '../app/appStore';
import { awardRunRewards } from '../economy/rewards';
import { PaperPanel } from '../components/PaperPanel';
import { StickerButton } from '../components/StickerButton';
import { CoinBadge } from '../components/CoinBadge';
import confetti from 'canvas-confetti';
import { useAuth } from '../auth/AuthContext';
import { Trophy, Skull, RotateCcw, BookOpen, ShoppingBag, Home, Sparkles, CheckCircle2 } from 'lucide-react';

export const ResultsPage: React.FC = () => {
  const { account } = useAuth();
  const { lastRunSummary, navigateTo, refreshUserData, settings } = useApp();
  const [reward, setReward] = useState<{ coins: number; xp: number }>({ coins: 0, xp: 0 });

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
  }, [lastRunSummary]);

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
      <div style={{ width: '100%', maxWidth: '650px' }}>
        <PaperPanel style={{ textAlign: 'center', padding: '30px' }}>
          {/* Result Icon & Title */}
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: isWin ? 'var(--color-accent-yellow)' : '#FFEBEE',
              border: 'var(--border-ink-thick)',
              boxShadow: 'var(--shadow-sticker)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
            }}
          >
            {isWin ? <Trophy size={42} color="#F57F17" /> : <Skull size={42} color="#D32F2F" />}
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2.4rem',
              fontWeight: 900,
              color: isWin ? '#2E7D32' : 'var(--color-danger)',
            }}
          >
            {isWin ? 'CHIẾN THẮNG VANG DỘI!' : 'HẾT MÁU RỒI! CỐ LÊN NHÉ'}
          </h1>
          <p style={{ color: 'var(--color-muted-ink)', marginTop: '4px', fontSize: '1rem' }}>
            {isWin
              ? 'Bạn đã xuất sắc đánh bại toàn bộ quái vật và trùm Alien!'
              : 'Đừng nản lòng, hãy xem lại các từ chưa nhớ và thử lại nhé!'}
          </p>

          {/* Reward Highlights */}
          {!account && <div className="notice guest-notice">
            <p>Bạn vừa chơi miễn phí. Đăng nhập Google để lưu tiến trình và nhận xu, XP từ các trận tiếp theo.</p>
            <button className="primary-button" onClick={() => navigateTo('account')}>Đăng nhập Google</button>
          </div>}
          {account && <div
            style={{
              margin: '24px 0',
              padding: '16px',
              backgroundColor: '#FFF9E6',
              border: '2px solid var(--color-ink)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              justifyContent: 'space-around',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-muted-ink)', fontWeight: 700 }}>
                XU THƯỞNG NHẬN ĐƯỢC
              </div>
              <div style={{ marginTop: '4px' }}>
                <CoinBadge amount={reward.coins} size="lg" showLabel />
              </div>
            </div>

            <div style={{ width: '2px', height: '40px', backgroundColor: 'var(--color-grid)' }} />

            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-muted-ink)', fontWeight: 700 }}>
                KINH NGHIỆM (XP)
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.4rem',
                  fontWeight: 900,
                  color: 'var(--color-ink)',
                  marginTop: '4px',
                }}
              >
                +{reward.xp} XP
              </div>
            </div>
          </div>}
          {/* Stats Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '12px',
              textAlign: 'left',
              marginBottom: '26px',
            }}
          >
            <div
              style={{
                padding: '12px',
                backgroundColor: 'var(--color-paper)',
                border: '1.5px solid var(--color-ink)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div style={{ fontSize: '0.8rem', color: 'var(--color-muted-ink)' }}>Tổng Điểm Trận Đấu</div>
              <div style={{ fontWeight: 900, fontSize: '1.2rem', fontFamily: 'var(--font-mono)' }}>
                {lastRunSummary.totalScore.toLocaleString()}
              </div>
            </div>

            <div
              style={{
                padding: '12px',
                backgroundColor: 'var(--color-paper)',
                border: '1.5px solid var(--color-ink)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div style={{ fontSize: '0.8rem', color: 'var(--color-muted-ink)' }}>Độ Chính Xác Gõ Phím</div>
              <div style={{ fontWeight: 900, fontSize: '1.2rem', fontFamily: 'var(--font-mono)' }}>
                {lastRunSummary.accuracy}%
              </div>
            </div>

            <div
              style={{
                padding: '12px',
                backgroundColor: 'var(--color-paper)',
                border: '1.5px solid var(--color-ink)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div style={{ fontSize: '0.8rem', color: 'var(--color-muted-ink)' }}>Từ Nhớ Độc Lập (Recall)</div>
              <div style={{ fontWeight: 900, fontSize: '1.2rem', color: '#E06C96' }}>
                {lastRunSummary.independentRecallCorrect} từ
              </div>
            </div>

            <div
              style={{
                padding: '12px',
                backgroundColor: 'var(--color-paper)',
                border: '1.5px solid var(--color-ink)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div style={{ fontSize: '0.8rem', color: 'var(--color-muted-ink)' }}>Số Đợt Vượt Qua</div>
              <div style={{ fontWeight: 900, fontSize: '1.2rem' }}>
                {lastRunSummary.wavesCleared} / 3 đợt
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <StickerButton
                variant="primary"
                size="lg"
                onClick={() => navigateTo('prepare')}
                icon={<RotateCcw size={20} />}
                style={{ flex: '1 1 180px' }}
              >
                Chơi Lại Trận Mới
              </StickerButton>

              <StickerButton
                variant="accent"
                size="lg"
                onClick={() => navigateTo('store')}
                icon={<ShoppingBag size={20} />}
                style={{ flex: '1 1 180px' }}
              >
                Vào Cửa Hàng
              </StickerButton>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <StickerButton
                onClick={() => navigateTo('review')}
                icon={<BookOpen size={18} />}
                style={{ flex: '1 1 180px' }}
              >
                Ôn Tập Từ Vừa Học
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
        </PaperPanel>
      </div>
    </div>
  );
};
