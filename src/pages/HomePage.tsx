import React, { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Coins,
  Crosshair,
  Gift,
  LockKeyhole,
  ShoppingBag,
  Sparkles,
  Swords,
  Trophy,
  UserRound,
} from "lucide-react";
import { useApp } from "../app/appStore";
import { HomeBattleScene } from "../components/HomeBattleScene";
import "../styles/doodle-home.css";
import { useAuth } from "../auth/AuthContext";
import { MonsterAlmanacModal } from "../components/MonsterAlmanacModal";
import { getAssetUrl } from "../utils/assetUrl";

export const HomePage: React.FC = () => {
  const { navigateTo, wallet, profile } = useApp();
  const { account } = useAuth();
  const [modesOpen, setModesOpen] = useState(false);
  const [almanacOpen, setAlmanacOpen] = useState(false);

  // 1. GAME MODES SELECTION SCREEN
  if (modesOpen) {
    return (
      <main className="doodle-modes notebook-grid-bg">
        <div className="portal-container">
          <button className="portal-back-btn" onClick={() => setModesOpen(false)}>
            <ArrowLeft size={18} /> Về sảnh chính
          </button>

          <div className="portal-header-group">
            <span className="portal-eyebrow">CHỌN CHẾ ĐỘ CHƠI</span>
            <h1 className="portal-title">Sẵn sàng xuất kích?</h1>
          </div>

          <div className="mode-selection-grid">
            <button
              className="mode-select-card available"
              onClick={() => navigateTo("prepare")}
            >
              <span className="mode-card-tag tag-open">
                <span className="live-pulse-dot" /> {account ? "ĐANG MỞ" : "MIỄN PHÍ"}
              </span>
              <div className="mode-icon-circle">
                <Swords size={38} strokeWidth={1.8} />
              </div>
              <h2 className="mode-name">Đấu thường</h2>
              <p className="mode-desc">
                Bảo vệ cứ điểm bằng từ vựng. Tùy chọn bản đồ, tướng, đạn và bộ từ của bạn.
              </p>
              <span className="mode-cta-pill">
                Vào trận ngay <ArrowRight size={16} />
              </span>
            </button>

            {[
              {
                name: "Đấu xếp hạng",
                icon: Trophy,
                desc: "Thử thách tốc độ gõ đỉnh cao và leo lên bảng vàng danh dự.",
              },
              {
                name: "Đấu cùng bạn bè",
                icon: Crosshair,
                desc: "Tạo phòng riêng và thi thố kiến thức từ vựng trực tiếp.",
              },
              {
                name: "Thử thách đặc biệt",
                icon: Sparkles,
                desc: "Các ải quái vật bất ngờ với phần thưởng xu và danh hiệu độc quyền.",
              },
            ].map(({ name, icon: Icon, desc }) => (
              <div className="mode-select-card locked" key={name}>
                <span className="mode-card-tag tag-locked">
                  <LockKeyhole size={12} /> SẮP RA MẮT
                </span>
                <div className="mode-icon-circle">
                  <Icon size={34} strokeWidth={1.6} />
                </div>
                <h2 className="mode-name">{name}</h2>
                <p className="mode-desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // 2. MAIN LANDING PAGE
  return (
    <main className="pempom-landing notebook-grid-bg">
      {/* TOP NAVIGATION BAR */}
      <header className="landing-top-bar">
        <div className="landing-nav-inner">
          {/* Brand Logo & Title */}
          <button className="landing-brand-logo" onClick={() => navigateTo("home")}>
            <img
              src={getAssetUrl("/pempom.svg")}
              alt="pempom logo"
              className="landing-brand-icon"
            />
            <div className="landing-brand-text">
              <span className="landing-brand-title">pempom</span>
              <span className="landing-brand-badge">Arcade Typing</span>
            </div>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="landing-desktop-nav" aria-label="Điều hướng tiện ích">
            <button onClick={() => navigateTo("library")} className="landing-nav-pill">
              <BookOpen size={16} aria-hidden="true" />
              <span>Bài học</span>
            </button>
            <button onClick={() => setAlmanacOpen(true)} className="landing-nav-pill">
              <Sparkles size={16} aria-hidden="true" />
              <span>Sách quái</span>
            </button>
            <button onClick={() => navigateTo("store")} className="landing-nav-pill">
              <ShoppingBag size={16} aria-hidden="true" />
              <span>Store</span>
            </button>
            <button onClick={() => navigateTo("leaderboard")} className="landing-nav-pill">
              <Trophy size={16} aria-hidden="true" />
              <span>BXH</span>
            </button>
            <button onClick={() => navigateTo("gifts")} className="landing-nav-pill">
              <Gift size={16} aria-hidden="true" />
              <span>Quà</span>
            </button>
            <button onClick={() => navigateTo("events")} className="landing-nav-pill">
              <CalendarDays size={16} aria-hidden="true" />
              <span>Sự kiện</span>
            </button>
          </nav>

          {/* User Account & Wallet */}
          <div className="landing-user-group">
            <button
              className="landing-wallet-chip"
              onClick={() => navigateTo("account")}
              title="Xem ví xu và ưu đãi"
            >
              <Coins size={18} className="coin-icon" aria-hidden="true" />
              <span>{(wallet?.balance || 0).toLocaleString("vi-VN")}</span>
              <span className="plus-badge">+</span>
            </button>

            <button
              className="landing-profile-chip"
              onClick={() => navigateTo("account")}
              title={account ? "Hồ sơ của bạn" : "Đăng nhập Google"}
            >
              <span className="profile-avatar-circle">
                {account?.displayName ? (
                  account.displayName.charAt(0).toUpperCase()
                ) : (
                  <UserRound size={15} />
                )}
              </span>
              <span className="profile-name-text">
                {account?.displayName || "Đăng nhập"}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION: 2-COLUMN BALANCED STAGE */}
      <section className="landing-hero-section">
        {/* Left Column: Info & Rounded Juicy Play CTA */}
        <div className="landing-hero-card">
          {/* Landscape Cockpit Deck Brand */}
          <div className="landscape-deck-brand">
            <div className="landing-brand-text">
              <span className="landing-brand-title">pempom</span>
              <span className="landing-brand-badge">Arcade</span>
            </div>
          </div>

          <div>
            <div className="landing-eyebrow">
              <Sparkles size={13} aria-hidden="true" />
              <span>ARCADE TYPING · PHIÊU LƯU TỪ VỰNG</span>
            </div>

            <h1 className="landing-hero-headline">
              Thế giới nhỏ.<br />
              Phiêu lưu <span className="highlight-word">lớn.</span>
            </h1>

            <p className="landing-hero-desc">
              Gõ chuẩn, bắn nhanh, đẩy lùi quái vật và làm chủ kho từ vựng tiếng Anh qua từng trận đấu!
            </p>

            {/* Plump, Rounded Call-to-action buttons */}
            <div className="landing-cta-group">
              <button
                className="plump-btn plump-play"
                onClick={() => setModesOpen(true)}
              >
                <div className="plump-play-left">
                  <div className="plump-play-icon">
                    <Swords size={22} strokeWidth={2.2} />
                  </div>
                  <div className="plump-play-labels">
                    <strong>CHƠI NGAY</strong>
                    <small>Đấu thường · Vào trận</small>
                  </div>
                </div>
                <ChevronRight size={22} className="plump-arrow" />
              </button>

              <div className="landing-sub-cta-row">
                <button
                  className="plump-btn plump-secondary"
                  onClick={() => navigateTo("library")}
                >
                  <BookOpen size={18} />
                  <span>Bài học</span>
                </button>

                <button
                  className="plump-btn plump-secondary"
                  onClick={() => setAlmanacOpen(true)}
                >
                  <Sparkles size={18} />
                  <span>Sách quái</span>
                </button>
              </div>
            </div>
          </div>

          {/* Highlights */}
          <div className="landing-bullets-row">
            <span className="bullet-chip">
              <span className="bullet-dot" /> 5 Mạng mỗi trận
            </span>
            <span className="bullet-chip">
              <span className="bullet-dot" /> Quái phân tách & Đấu Boss
            </span>
            <span className="bullet-chip">
              <span className="bullet-dot" /> Chơi ngay không cần tài khoản
            </span>
          </div>

          {/* Landscape Cockpit Deck Navigation */}
          <div className="landing-landscape-nav">
            <button onClick={() => navigateTo("store")} className="landscape-nav-btn">
              <ShoppingBag size={14} />
              <span>Store</span>
            </button>
            <button onClick={() => navigateTo("leaderboard")} className="landscape-nav-btn">
              <Trophy size={14} />
              <span>BXH</span>
            </button>
            <button onClick={() => navigateTo("gifts")} className="landscape-nav-btn">
              <Gift size={14} />
              <span>Quà</span>
            </button>
            <button onClick={() => navigateTo("account")} className="landscape-nav-btn">
              <UserRound size={14} />
              <span>TK</span>
            </button>
          </div>
        </div>

        {/* Right Column: Interactive Motion Battle Arena Stage */}
        <div className="landing-arena-card">
          <div className="arena-card-topbar">
            <div className="arena-live-badge">
              <span className="live-pulse-dot" />
              <span>BATTLE MOTION ARENA</span>
            </div>
            <span className="arena-touch-hint">
              <Crosshair size={13} /> Chạm để nã đạn
            </span>
          </div>

          <div className="arena-card-viewport">
            {/* Live Interactive Canvas */}
            <HomeBattleScene />

            {/* Floating Speech & Word Badges */}
            <div className="arena-word-chip" aria-hidden="true">
              <strong>adventure</strong>
              <small>/ədˈventʃər/</small>
            </div>

            <div className="arena-speech-bubble" aria-hidden="true">
              Sẵn sàng chưa? <span>✦</span>
            </div>

            <button
              className="arena-gift-box"
              onClick={() => navigateTo("gifts")}
              title="Nhận quà 50 xu mỗi ngày"
            >
              <div className="gift-icon-draw">
                <Gift size={22} strokeWidth={1.8} />
              </div>
              <div className="gift-text-wrap">
                <strong>Quà hôm nay</strong>
                <small>Nhận 50 xu miễn phí</small>
              </div>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* 3 BOTTOM FEATURE PORTAL CARDS */}
      <section className="landing-bottom-cards">
        {/* Card 1: Store */}
        <button
          className="feature-portal-card"
          onClick={() => navigateTo("store")}
        >
          <div className="card-text-col">
            <span className="card-tag">TRANG BỊ CÁ TÍNH</span>
            <h3 className="card-heading">Nhỏ mà có võ.</h3>
            <p className="card-summary">Tướng xịn, đạn chất. Nâng cấp kho vũ khí bằng xu.</p>
            <span className="card-action-link">
              Khám phá Store <ArrowRight size={15} />
            </span>
          </div>
          <div className="card-visual-col">
            <img
              src={getAssetUrl("/assets/samurai/outfit_samurai_icon.png")}
              alt="Samurai"
              className="card-samurai-img"
            />
          </div>
        </button>

        {/* Card 2: Lessons */}
        <button
          className="feature-portal-card"
          onClick={() => navigateTo("library")}
        >
          <div className="card-text-col">
            <span className="card-tag">HÀNH TRANG TRI THỨC</span>
            <h3 className="card-heading">Từ mới, sức mạnh mới.</h3>
            <p className="card-summary">Kho từ vựng có sẵn hoặc tự tải file Excel/CSV của bạn.</p>
            <span className="card-action-link">
              Vào bài học <ArrowRight size={15} />
            </span>
          </div>
          <div className="card-visual-col">
            <div className="card-icon-art art-library">
              <BookOpen size={42} strokeWidth={1.6} />
              <span className="art-badge-text">Aa</span>
            </div>
          </div>
        </button>

        {/* Card 3: Events */}
        <button
          className="feature-portal-card"
          onClick={() => navigateTo("events")}
        >
          <div className="card-text-col">
            <span className="card-tag">THỬ THÁCH TRONG GAME</span>
            <h3 className="card-heading">Chơi vui. Rinh quà.</h3>
            <p className="card-summary">Hoàn thành nhiệm vụ mỗi ngày và săn quà tặng thú vị.</p>
            <span className="card-action-link">
              Xem sự kiện <ArrowRight size={15} />
            </span>
          </div>
          <div className="card-visual-col">
            <div className="card-icon-art art-events">
              <Trophy size={42} strokeWidth={1.6} />
              <Sparkles size={18} className="art-sparkle-icon" />
            </div>
          </div>
        </button>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <span>© {new Date().getFullYear()} pempom</span>
          <span className="landing-footer-tagline">
            Mỗi từ mới, một cuộc phiêu lưu ✦
          </span>
          <span>v1.0 · Học mà chơi</span>
        </div>
      </footer>

      {/* MOBILE PORTRAIT BOTTOM DOCK (max-width: 960px) */}
      <nav className="landing-mobile-dock" aria-label="Điều hướng nhanh mobile">
        <button
          onClick={() => setModesOpen(true)}
          className="mobile-dock-btn dock-play-highlight"
        >
          <Swords size={20} />
          <span>Chơi</span>
        </button>
        <button onClick={() => navigateTo("library")} className="mobile-dock-btn">
          <BookOpen size={19} />
          <span>Bài học</span>
        </button>
        <button onClick={() => navigateTo("store")} className="mobile-dock-btn">
          <ShoppingBag size={19} />
          <span>Store</span>
        </button>
        <button onClick={() => navigateTo("leaderboard")} className="mobile-dock-btn">
          <Trophy size={19} />
          <span>BXH</span>
        </button>
        <button onClick={() => navigateTo("account")} className="mobile-dock-btn">
          <UserRound size={19} />
          <span>Tài khoản</span>
        </button>
      </nav>

      {/* MONSTER ALMANAC MODAL */}
      <MonsterAlmanacModal
        isOpen={almanacOpen}
        onClose={() => setAlmanacOpen(false)}
      />
    </main>
  );
};
