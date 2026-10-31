import React, { useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Coins,
  Gamepad2,
  Gift,
  ShoppingBag,
  Trophy,
  UserRound,
  Menu,
  X,
} from "lucide-react";
import { AppRoute, useApp } from "../app/appStore";
import { NavDrawer } from "./NavDrawer";

export const GAME_NAV = [
  {
    route: "home",
    label: "Chơi",
    icon: Gamepad2,
    group: ["prepare", "results"],
  },
  {
    route: "library",
    label: "Bài học",
    icon: BookOpen,
    group: ["editor", "review"],
  },
  { route: "store", label: "Store", icon: ShoppingBag, group: ["wardrobe"] },
  {
    route: "leaderboard",
    label: "BXH",
    icon: Trophy,
    group: ["progress"],
  },
  { route: "gifts", label: "Quà tặng", icon: Gift, group: [] },
  { route: "events", label: "Sự kiện", icon: CalendarDays, group: [] },
  {
    route: "account",
    label: "Tài khoản",
    icon: UserRound,
    group: ["settings", "admin"],
  },
] as const;

export const AppShell: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { currentRoute, navigateTo, wallet } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (currentRoute === "home") return <>{children}</>;

  return (
    <div className={`doodle-shell notebook-grid-bg${currentRoute === "prepare" ? " is-preparing" : ""}`}>
      {/* STICKY TOP APP HEADER */}
      <header className="doodle-app-header">
        <div className="doodle-header-inner">
          {/* Left: Unified Brand & Back to Home */}
          <div className="doodle-header-left">
            <button
              className="doodle-brand-nav-btn"
              onClick={() => navigateTo("home")}
              title="Về trang chủ pempom"
              aria-label="pempom — Về trang chủ"
            >
              <span className="doodle-brand-back-icon">
                <ArrowLeft size={15} strokeWidth={2.5} />
              </span>
              <span className="doodle-wordmark">pempom</span>
            </button>
          </div>

          {/* Desktop Navigation (Visible ONLY on Desktop >= 1025px) */}
          <nav className="desktop-nav" aria-label="Điều hướng chính — 7 mục">
            {GAME_NAV.map(({ route, label, icon: Icon, group }) => {
              const active =
                currentRoute === route ||
                (group as readonly string[]).includes(currentRoute);
              return (
                <button
                  key={route}
                  onClick={() => navigateTo(route as AppRoute)}
                  className={`desktop-nav-item ${active ? "active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon size={17} strokeWidth={active ? 2.3 : 1.8} aria-hidden="true" />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right: Wallet Balance & Mobile Hamburger Button */}
          <div className="doodle-header-right">
            <button
              className="doodle-wallet"
              onClick={() => navigateTo("account")}
              aria-label="Xu và tài khoản"
              title="Xem ví xu"
            >
              <Coins size={16} aria-hidden="true" />
              <span>{(wallet?.balance || 0).toLocaleString("vi-VN")}</span>
            </button>

            {/* Mobile/Tablet Hamburger Button (Strictly hidden on desktop via CSS) */}
            <button
              className="doodle-hamburger"
              aria-label={mobileMenuOpen ? "Đóng menu" : "Mở menu điều hướng (3 sọc)"}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Hamburger Drawer Dropdown */}
        <NavDrawer
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          currentRoute={currentRoute}
          onNavigate={navigateTo}
          wallet={wallet}
        />
      </header>

      {/* Main Content Area */}
      <main className="doodle-content">{children}</main>
    </div>
  );
};

