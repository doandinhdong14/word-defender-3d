import React from "react";
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
  if (currentRoute === "home") return <>{children}</>;

  return (
    <div className="doodle-shell notebook-grid-bg">
      <header className="doodle-app-header">
        <button className="doodle-back" onClick={() => navigateTo("home")}>
          <ArrowLeft size={19} aria-hidden="true" /> Về sảnh
        </button>
        <button className="doodle-wordmark" aria-label="pempom — về sảnh" onClick={() => navigateTo("home")}>
          pempom
        </button>
        <button className="doodle-wallet" onClick={() => navigateTo("account")} aria-label="Xu và tài khoản">
          <Coins size={20} aria-hidden="true" />
          <span>{(wallet?.balance || 0).toLocaleString("vi-VN")}</span>
        </button>
      </header>
      <main className="doodle-content">{children}</main>
      <nav className="game-navigation" aria-label="Điều hướng chính — 7 mục">
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
                <Icon size={30} strokeWidth={1.6} aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          })}
      </nav>
    </div>
  );
};
