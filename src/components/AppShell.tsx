import React from "react";
import {
  BookOpen,
  CalendarDays,
  Coins,
  Gamepad2,
  Gift,
  Plus,
  ShoppingBag,
  Trophy,
  UserRound,
} from "lucide-react";
import { AppRoute, useApp } from "../app/appStore";
import { useAuth } from "../auth/AuthContext";

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
  const { currentRoute, navigateTo, wallet, profile } = useApp();
  const { account } = useAuth();
  return (
    <div className="game-shell">
      <aside className="game-sidebar">
        <button
          className="mini-brand"
          onClick={() => navigateTo("home")}
          aria-label="Sảnh pempom"
        >
          p<span>•</span>
        </button>
        <nav aria-label="Điều hướng chính — 7 mục">
          {GAME_NAV.map(({ route, label, icon: Icon, group }, index) => {
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
                <span className="nav-icon">
                  <Icon size={23} strokeWidth={1.8} />
                  {index === 5 && <i />}
                </span>
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
        <span className="sidebar-caption">
          PLAY. LEARN.
          <br />
          LEVEL UP.
        </span>
      </aside>
      <div className="game-main">
        <header className="game-header">
          <button
            className="wordmark"
            aria-label="pempom — về sảnh"
            onClick={() => navigateTo("home")}
          >
            pempom<span>✳</span>
          </button>
          <div className="header-world">
            <span className="status-dot" /> THẾ GIỚI CỦA NHỮNG TỪ VỰNG
          </div>
          <div className="header-player">
            <button
              className="wallet-pill"
              onClick={() => navigateTo("account")}
              aria-label="Xu và mua xu"
            >
              <Coins size={19} />
              <strong>{(wallet?.balance || 0).toLocaleString("vi-VN")}</strong>
              <span>
                <Plus size={15} />
              </span>
            </button>
            <button
              className="player-pill"
              onClick={() => navigateTo("account")}
            >
              <span className="player-avatar">
                {account?.displayName.charAt(0).toUpperCase() || "P"}
              </span>
              <span>
                <strong>{account?.displayName || "Nhà thám hiểm"}</strong>
                <small>
                  Cấp {profile?.level || 1} · {profile?.xp || 0} XP
                </small>
              </span>
            </button>
          </div>
        </header>
        <main className="game-content">{children}</main>
        <footer className="game-footer">
          <span>© {new Date().getFullYear()} pempom</span>
          <span>
            Mỗi từ mới, một cuộc phiêu lưu. <span>✦</span>
          </span>
          <span>v1.0 · Học mà chơi</span>
        </footer>
      </div>
    </div>
  );
};
