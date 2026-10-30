import React, { useState } from "react";
import {
  ArrowLeft, ArrowRight, BookOpen, CalendarDays, Crosshair, Gift, LockKeyhole,
  ShoppingBag, Sparkles, Swords, Trophy, UserRound,
} from "lucide-react";
import { useApp } from "../app/appStore";
import { HomeBattleScene } from "../components/HomeBattleScene";
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
        <div className="page-heading"><h1>Chế độ chơi</h1></div>
        <div className="mode-grid">
          <button className="mode-card available" onClick={() => navigateTo("prepare")}>
            <span className="tag green"><span className="status-dot" /> {account ? 'ĐANG MỞ' : 'MIỄN PHÍ'}</span>
            <Swords size={52} strokeWidth={1.5} />
            <h2>Đấu thường</h2>
            <span className="mode-cta">Vào trận <ArrowRight size={18} /></span>
          </button>
          {[
            { name: "Xếp hạng", icon: Trophy },
            { name: "Bạn bè", icon: Crosshair },
            { name: "Thử thách", icon: Sparkles },
          ].map(({ name, icon: Icon }) => (
            <div className="mode-card locked" key={name}>
              <span className="tag"><LockKeyhole size={12} /> SẮP RA MẮT</span>
              <Icon size={44} strokeWidth={1.4} />
              <h2>{name}</h2>
            </div>
          ))}
        </div>
      </div>
    </main>
  );

  return (
    <main className="doodle-home notebook-grid-bg" aria-labelledby="doodle-title">
      {/* Top Utilities (Icon + 1 word) */}
      <nav className="doodle-utilities" aria-label="Tiện ích">
        <button onClick={() => setAlmanacOpen(true)}>
          <BookOpen aria-hidden="true" />
          <span>Sách quái</span>
        </button>
        <button onClick={() => navigateTo("gifts")}>
          <Gift aria-hidden="true" />
          <span>Quà</span>
        </button>
        <button onClick={() => navigateTo("events")}>
          <CalendarDays aria-hidden="true" />
          <span>Sự kiện</span>
        </button>
      </nav>

      {/* Main Interactive Battle Stage */}
      <div className="doodle-scene">
        {/* Title Header */}
        <div className="doodle-header-title">
          <h1 id="doodle-title">pempom</h1>
          <span className="doodle-subtitle-badge">Arcade Typing</span>
        </div>

        {/* Real-time motion battle scene: Ponpi shooting falling monsters */}
        <div className="doodle-battle-wrapper">
          <HomeBattleScene />
        </div>

        {/* Action Buttons (Plump, Rounded, Minimal Text) */}
        <nav className="doodle-play-menu" aria-label="Bắt đầu">
          <button className="doodle-oval doodle-play" onClick={() => setModesOpen(true)}>
            <Swords size={26} />
            <span>Chơi</span>
          </button>
          <button className="doodle-oval doodle-lessons" onClick={() => navigateTo("library")}>
            <BookOpen size={20} />
            <span>Bài học</span>
          </button>
        </nav>
      </div>

      {/* Bottom Dock Navigation (Icon + 1 word) */}
      <nav className="doodle-bottom-nav" aria-label="Khám phá">
        <button onClick={() => navigateTo("store")}>
          <ShoppingBag aria-hidden="true" />
          <span>Store</span>
        </button>
        <button onClick={() => navigateTo("leaderboard")}>
          <Trophy aria-hidden="true" />
          <span>BXH</span>
        </button>
        <button onClick={() => navigateTo("account")}>
          <UserRound aria-hidden="true" />
          <span>Tài khoản</span>
        </button>
      </nav>

      <MonsterAlmanacModal isOpen={almanacOpen} onClose={() => setAlmanacOpen(false)} />
    </main>
  );
};
