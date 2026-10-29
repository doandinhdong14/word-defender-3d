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

export const GAME_NAV = [
  {
    route: "home",
    label: "Chơi",
    icon: Gamepad2,
    group: ["prepare", "results"],
  },
  { route: "store", label: "Store", icon: ShoppingBag, group: ["wardrobe"] },
  {
    route: "leaderboard",
    label: "Bảng xếp hạng",
    icon: Trophy,
    group: ["progress"],
  },
  {
    route: "account",
    label: "Tài khoản",
    icon: UserRound,
    group: ["settings", "admin"],
  },
  {
    route: "library",
    label: "Bài học",
    icon: BookOpen,
    group: ["editor", "review"],
  },
  { route: "gifts", label: "Quà tặng", icon: Gift, group: [] },
  { route: "events", label: "Sự kiện", icon: CalendarDays, group: [] },
] as const;

export const AppShell: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { currentRoute, navigateTo, wallet } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (currentRoute === "home") return <>{children}</>;

  return (
    <div className="doodle-shell notebook-grid-bg">
      {/* STICKY TOP APP HEADER WITH NAVIGATION & HAMBURGER */}
      <header className="doodle-app-header">
        <div className="doodle-header-inner">
          {/* Left: Back button & Brand Logo */}
          <div className="doodle-header-left">
            <button className="doodle-back" onClick={() => navigateTo("home")} aria-label="Về sảnh">
              <ArrowLeft size={17} aria-hidden="true" />
              <span className="doodle-back-text">Về sảnh</span>
            </button>
            <button
              className="doodle-wordmark"
              aria-label="pempom — về sảnh"
              onClick={() => navigateTo("home")}
            >
              pempom
            </button>
          </div>

          {/* Top Desktop Navigation (Visible on Desktop / Tablet) */}
          <nav className="game-navigation desktop-nav" aria-label="Điều hướng chính — 7 mục">
            {GAME_NAV.map(({ route, label, icon: Icon, group }) => {
              const active =
                currentRoute === route ||
                (group as readonly string[]).includes(currentRoute);
              return (
                <button
                  key={route}
                  onClick={() => navigateTo(route as AppRoute)}
                  className={active ? "active" : ""}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon size={18} strokeWidth={2} aria-hidden="true" />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right: Wallet Balance & Mobile 3-Stripe Hamburger Button */}
          <div className="doodle-header-right">
            <button
              className="doodle-wallet"
              onClick={() => navigateTo("account")}
              aria-label="Xu và tài khoản"
            >
              <Coins size={17} aria-hidden="true" />
              <span>{(wallet?.balance || 0).toLocaleString("vi-VN")}</span>
            </button>

            {/* Mobile 3-Stripe Hamburger Button (☰) */}
            <button
              className="doodle-hamburger"
              aria-label={mobileMenuOpen ? "Đóng menu" : "Mở menu điều hướng (3 sọc)"}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Hamburger Drawer Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="mobile-nav-backdrop" onClick={() => setMobileMenuOpen(false)}>
            <div
              className="mobile-nav-drawer"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mobile-nav-header">
                <span className="mobile-nav-title">Menu Điều Hướng</span>
                <button
                  className="mobile-nav-close"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Đóng menu"
                >
                  <X size={18} />
                </button>
              </div>

              <nav className="game-navigation mobile-nav-grid" aria-label="Điều hướng chính mobile — 7 mục">
                {GAME_NAV.map(({ route, label, icon: Icon, group }) => {
                  const active =
                    currentRoute === route ||
                    (group as readonly string[]).includes(currentRoute);
                  return (
                    <button
                      key={route}
                      onClick={() => {
                        navigateTo(route as AppRoute);
                        setMobileMenuOpen(false);
                      }}
                      className={active ? "active" : ""}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon size={20} strokeWidth={2} aria-hidden="true" />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area with Smooth Scrolling */}
      <main className="doodle-content">{children}</main>
    </div>
  );
};
