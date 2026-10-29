import React, { useState } from "react";
import {
  ArrowLeft, ArrowRight, BookOpen, CalendarDays, Crosshair, Gift, LockKeyhole,
  ShoppingBag, Sparkles, Swords, Trophy, UserRound,
} from "lucide-react";
import { useApp } from "../app/appStore";
import { PonpiPreview } from "../components/PonpiPreview";
import "../styles/doodle-home.css";
import { useAuth } from '../auth/AuthContext';
import { MonsterAlmanacModal } from "../components/MonsterAlmanacModal";

export const HomePage: React.FC = () => {
  const { navigateTo } = useApp();
  const { account } = useAuth();
  const [modesOpen, setModesOpen] = useState(false);
  const [almanacOpen, setAlmanacOpen] = useState(false);

  if (modesOpen) return (
    <main className="doodle-modes notebook-grid-bg">
      <div className="portal-page">
        <button className="text-button" onClick={() => setModesOpen(false)}>
          <ArrowLeft size={17} /> Về sảnh
        </button>
        <div className="page-heading"><h1>Chơi gì hôm nay?</h1></div>
        <div className="mode-grid">
          <button className="mode-card available" onClick={() => navigateTo("prepare")}>
            <span className="tag green"><span className="status-dot" /> {account ? 'ĐANG MỞ' : 'MIỄN PHÍ · KHÔNG CẦN ĐĂNG NHẬP'}</span>
            <Swords size={56} strokeWidth={1.4} />
            <h2>Đấu thường</h2>
            {!account && <p>Bộ từ cơ bản · pempom nguyên bản · map ô ly</p>}
            <span className="mode-cta">Vào trận <ArrowRight size={20} /></span>
          </button>
          {[
            { name: "Đấu xếp hạng", icon: Trophy },
            { name: "Đấu cùng bạn bè", icon: Crosshair },
            { name: "Thử thách đặc biệt", icon: Sparkles },
          ].map(({ name, icon: Icon }) => (
            <div className="mode-card locked" key={name}>
              <span className="tag"><LockKeyhole size={12} /> SẮP RA MẮT</span>
              <Icon size={48} strokeWidth={1.3} />
              <h2>{name}</h2>
            </div>
          ))}
        </div>
      </div>
    </main>
  );

  return (
    <main className="doodle-home notebook-grid-bg" aria-labelledby="doodle-title">
      <nav className="doodle-utilities" aria-label="Tiện ích">
        <button onClick={() => setAlmanacOpen(true)}><BookOpen aria-hidden="true" /><span>Sách quái</span></button>
        <button onClick={() => navigateTo("gifts")}><Gift aria-hidden="true" /><span>Quà tặng</span></button>
        <button onClick={() => navigateTo("events")}><CalendarDays aria-hidden="true" /><span>Sự kiện</span></button>
      </nav>

      <div className="doodle-scene">
        <h1 id="doodle-title">pempom</h1>

        <div className="doodle-decorations" aria-hidden="true">
          <svg className="doodle-ufo" viewBox="0 0 180 130" fill="none">
            <path d="m58 55-29 67q62-14 119 0l-29-67" fill="#efd59a" opacity=".16" stroke="none" />
            <path d="M47 52Q64-9 101 13q16 11 24 39" fill="#b2c56b" />
            <path d="M9 59C3 38 173 33 170 54S23 80 9 59Z" fill="#d6d4b8" />
            <path d="M25 66q59 13 127-8M34 73l-5 9m112-13 7 9" />
            <path d="m72 24 5-4m15 0 4 2" stroke="#e3e9b9" strokeWidth="5" />
          </svg>
          <svg className="doodle-bug doodle-bug-green" viewBox="0 0 64 46" fill="none">
            <path d="m20 12-3-6m14 5 1-7m11 9 5-5M14 24l-8-1m11 12-5 6m18-5-1 7m14-9 4 6m4-16 7 1" />
            <path d="M12 23C11 8 48 10 51 23s-34 20-39 0Z" fill="#b2c56b" />
            <path d="m21 21 1 3m8-4 1 3" />
          </svg>
          <svg className="doodle-bug doodle-bug-blue" viewBox="0 0 64 46" fill="none">
            <path d="m20 12-3-6m14 5 1-7m11 9 5-5M14 24l-8-1m11 12-5 6m18-5-1 7m14-9 4 6m4-16 7 1" />
            <path d="M12 23C11 8 48 10 51 23s-34 20-39 0Z" fill="#91bfc4" />
            <path d="m21 21 1 3m8-4 1 3" />
          </svg>
          <svg className="doodle-star" viewBox="0 0 42 48" fill="none">
            <path d="m21 3 4 15 13 6-13 5-4 16-5-16-13-5 13-6Z" fill="#efcb7a" />
          </svg>
          <svg className="doodle-flight" viewBox="0 0 145 95" fill="none">
            <path d="M4 85q47 9 49-17c2-22-41-3-22 11q24 17 55-34" strokeDasharray="4 7" strokeWidth="1.5" />
            <path d="m80 23 55-17-20 43-10-18Z" fill="#f5e5b9" />
            <path d="m105 31 30-25m-30 25-2 15 12-12" />
          </svg>
        </div>

        <nav className="doodle-play-menu" aria-label="Bắt đầu">
          <button className="doodle-oval doodle-play" onClick={() => setModesOpen(true)}>Chơi</button>
          <button className="doodle-oval doodle-lessons" onClick={() => navigateTo("library")}>Bài học</button>
        </nav>

        <div className="doodle-mascot" role="img" aria-label="Nhân vật pempom mặc định">
          <PonpiPreview
            width={280} height={260} scale={2.1}
            styleId="style_yellow" outfitId={null}
            frameless showPoseSelector={false}
          />
          <svg className="doodle-platform" viewBox="0 0 180 32" fill="none" aria-hidden="true">
            <path d="M15 7C40 3 143 2 164 7q17 5 3 17C134 30 44 28 14 25Q0 20 15 7Z" fill="#a9c56a" stroke="currentColor" strokeWidth="2.6" />
            <path d="m22 12-5 7m13-8-5 9m116-9-4 10m13-9-4 7m-107 2 86 1" stroke="#e3edb9" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      <nav className="doodle-bottom-nav" aria-label="Khám phá">
        <button onClick={() => navigateTo("store")}><ShoppingBag aria-hidden="true" /><span>Store</span></button>
        <button onClick={() => navigateTo("leaderboard")}><Trophy aria-hidden="true" /><span>Bảng xếp hạng</span></button>
        <button onClick={() => navigateTo("account")}><UserRound aria-hidden="true" /><span>Tài khoản</span></button>
      </nav>

      <MonsterAlmanacModal isOpen={almanacOpen} onClose={() => setAlmanacOpen(false)} />
    </main>
  );
};
