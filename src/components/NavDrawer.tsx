import React, { useEffect } from "react";
import {
  BookOpen,
  CalendarDays,
  Coins,
  Gamepad2,
  Gift,
  ShoppingBag,
  Trophy,
  UserRound,
  X,
  ShieldCheck,
} from "lucide-react";
import { AppRoute } from "../app/appStore";
import { useAuth } from "../auth/AuthContext";
import { Wallet } from "../types/economy";

export const DRAWER_NAV = [
  {
    route: "home",
    label: "Chơi ngay",
    desc: "Đấu thường & Sảnh màn",
    icon: Gamepad2,
    group: ["prepare", "results"],
  },
  {
    route: "library",
    label: "Bài học",
    desc: "3000 từ vựng Oxford & SRS",
    icon: BookOpen,
    group: ["editor", "review"],
  },
  {
    route: "store",
    label: "Cửa hàng",
    desc: "Vật phẩm & Trang phục",
    icon: ShoppingBag,
    group: ["wardrobe"],
  },
  {
    route: "leaderboard",
    label: "Bảng xếp hạng",
    desc: "Vinh danh cao thủ",
    icon: Trophy,
    group: ["progress"],
  },
  {
    route: "gifts",
    label: "Quà tặng",
    desc: "Nhận 50 xu mỗi ngày",
    icon: Gift,
    group: [],
  },
  {
    route: "events",
    label: "Sự kiện",
    desc: "Thử thách & Nhiệm vụ",
    icon: CalendarDays,
    group: [],
  },
  {
    route: "account",
    label: "Tài khoản",
    desc: "Hồ sơ, bảo mật & ví",
    icon: UserRound,
    group: ["settings"],
  },
] as const;

interface NavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  wallet?: Wallet | null;
}

export const NavDrawer: React.FC<NavDrawerProps> = ({
  isOpen,
  onClose,
  currentRoute,
  onNavigate,
  wallet,
}) => {
  const { account } = useAuth();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="mobile-nav-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="mobile-nav-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="mobile-nav-header">
          <div className="mobile-nav-brand">
            <span className="mobile-nav-wordmark">pempom</span>
            <span className="mobile-nav-badge">Menu</span>
          </div>
          <button
            className="mobile-nav-close"
            onClick={onClose}
            aria-label="Đóng menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* User status strip in Drawer */}
        <div className="mobile-nav-user-strip">
          <button
            className="drawer-user-info-btn"
            onClick={() => {
              onNavigate("account");
              onClose();
            }}
            title="Đến trang tài khoản"
          >
            <span className="drawer-user-avatar">
              {account?.displayName ? (
                account.displayName.charAt(0).toUpperCase()
              ) : (
                <UserRound size={15} />
              )}
            </span>
            <span className="drawer-user-name">
              {account?.displayName || "Đăng nhập / Hồ sơ"}
            </span>
          </button>

          <button
            className="drawer-wallet-pill"
            onClick={() => {
              onNavigate("account");
              onClose();
            }}
            title="Xem ví xu"
          >
            <Coins size={14} className="drawer-coin-icon" />
            <span>{(wallet?.balance || 0).toLocaleString("vi-VN")} Xu</span>
          </button>
        </div>

        {/* Grid of Navigation Items */}
        <nav className="mobile-nav-grid" aria-label="Điều hướng chính mobile">
          {DRAWER_NAV.map(({ route, label, icon: Icon, group }) => {
            const active =
              currentRoute === route ||
              (group as readonly string[]).includes(currentRoute);
            return (
              <button
                key={route}
                onClick={() => {
                  onNavigate(route as AppRoute);
                  onClose();
                }}
                className={`drawer-nav-item ${active ? "active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <div className="drawer-nav-icon-box">
                  <Icon size={18} strokeWidth={2} aria-hidden="true" />
                </div>
                <div className="drawer-nav-text">
                  <span className="drawer-nav-label">{label}</span>
                </div>
              </button>
            );
          })}

          {account?.role === "admin" && (
            <button
              onClick={() => {
                onNavigate("admin");
                onClose();
              }}
              className={`drawer-nav-item drawer-nav-admin ${currentRoute === "admin" ? "active" : ""}`}
            >
              <div className="drawer-nav-icon-box">
                <ShieldCheck size={18} strokeWidth={2} aria-hidden="true" />
              </div>
              <div className="drawer-nav-text">
                <span className="drawer-nav-label">Quản trị</span>
              </div>
            </button>
          )}
        </nav>
      </div>
    </div>
  );
};
