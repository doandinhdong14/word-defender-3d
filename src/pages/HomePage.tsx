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
      {/* 1. TOP HEADER BAR (Desktop & Mobile Portrait) */}
      <header className="doodle-top-bar">
        {/* Brand Logo & Tagline */}
        <div className="doodle-brand">
          <h1 id="doodle-title">pempom</h1>
          <span className="doodle-subtitle-badge">Arcade Typing</span>
        </div>

        {/* Top Navigation & Utility Pills */}
        <nav className="doodle-header-nav" aria-label="Tiện ích & Menu">
          <button onClick={() => setAlmanacOpen(true)} className="doodle-pill-btn">
            <BookOpen size={16} aria-hidden="true" />
            <span>Sách quái</span>
          </button>
          <button onClick={() => navigateTo("gifts")} className="doodle-pill-btn">
            <Gift size={16} aria-hidden="true" />
            <span>Quà</span>
          </button>
          <button onClick={() => navigateTo("events")} className="doodle-pill-btn">
            <CalendarDays size={16} aria-hidden="true" />
            <span>Sự kiện</span>
          </button>

          {/* Desktop Direct Hub Links */}
          <div className="doodle-desktop-hub">
            <button onClick={() => navigateTo("store")} className="doodle-pill-btn">
              <ShoppingBag size={16} aria-hidden="true" />
              <span>Store</span>
            </button>
            <button onClick={() => navigateTo("leaderboard")} className="doodle-pill-btn">
              <Trophy size={16} aria-hidden="true" />
              <span>BXH</span>
            </button>
            <button onClick={() => navigateTo("account")} className="doodle-pill-btn account-pill">
              <UserRound size={16} aria-hidden="true" />
              <span>{account ? 'Tài khoản' : 'Đăng nhập'}</span>
            </button>
          </div>
        </nav>
      </header>

      {/* 2. MAIN LAYOUT STAGE */}
      <div className="doodle-main-stage">
        {/* Mobile Landscape Side Panel (Only visible in Landscape orientation) */}
        <aside className="doodle-landscape-panel" aria-label="Bảng điều khiển ngang">
          <div className="landscape-brand">
            <h2>pempom</h2>
            <span className="doodle-subtitle-badge">Arcade</span>
          </div>

          <div className="landscape-primary-actions">
            <button className="doodle-oval doodle-play" onClick={() => setModesOpen(true)}>
              <Swords size={22} />
              <span>Chơi</span>
            </button>
            <button className="doodle-oval doodle-lessons" onClick={() => navigateTo("library")}>
              <BookOpen size={18} />
              <span>Bài học</span>
            </button>
          </div>

          <nav className="landscape-grid-nav" aria-label="Phím tắt">
            <button onClick={() => setAlmanacOpen(true)} title="Sách quái">
              <BookOpen size={15} />
              <span>Sách</span>
            </button>
            <button onClick={() => navigateTo("gifts")} title="Quà">
              <Gift size={15} />
              <span>Quà</span>
            </button>
            <button onClick={() => navigateTo("store")} title="Store">
              <ShoppingBag size={15} />
              <span>Store</span>
            </button>
            <button onClick={() => navigateTo("leaderboard")} title="BXH">
              <Trophy size={15} />
              <span>BXH</span>
            </button>
            <button onClick={() => navigateTo("account")} title="Tài khoản">
              <UserRound size={15} />
              <span>TK</span>
            </button>
          </nav>
        </aside>

        {/* Real-time Battle Motion Arena */}
        <div className="doodle-arena-box">
          <HomeBattleScene />

          {/* Action CTAs (Desktop and Mobile Portrait) */}
          <nav className="doodle-action-row" aria-label="Bắt đầu chơi">
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
      </div>

      {/* 3. BOTTOM DOCK (Mobile Portrait only) */}
      <nav className="doodle-bottom-dock" aria-label="Điều hướng chính">
        <button onClick={() => navigateTo("store")}>
          <ShoppingBag size={19} aria-hidden="true" />
          <span>Store</span>
        </button>
        <button onClick={() => navigateTo("leaderboard")}>
          <Trophy size={19} aria-hidden="true" />
          <span>BXH</span>
        </button>
        <button onClick={() => navigateTo("account")}>
          <UserRound size={19} aria-hidden="true" />
          <span>Tài khoản</span>
        </button>
      </nav>

      <MonsterAlmanacModal isOpen={almanacOpen} onClose={() => setAlmanacOpen(false)} />
    </main>
  );
};
