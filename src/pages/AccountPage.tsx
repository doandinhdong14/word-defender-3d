import React, { useState } from "react";
import {
  ArrowRight,
  Check,
  Coins,
  CreditCard,
  LockKeyhole,
  LogOut,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { useApp } from "../app/appStore";
import { useAuth } from "../auth/AuthContext";
import { AuthPage } from "./AuthPage";

const PACKS = [
  { id: "pocket", coins: 200, price: 20000, name: "Túi xu nhỏ" },
  { id: "adventure", coins: 550, price: 50000, name: "Túi phiêu lưu" },
  { id: "treasure", coins: 1200, price: 100000, name: "Rương kho báu" },
];
export const AccountPage: React.FC = () => {
  const { account, logout, isAdmin } = useAuth();
  const { wallet, profile, navigateTo } = useApp();
  const [pack, setPack] = useState(PACKS[1]);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const paymentApi = import.meta.env.VITE_PAYMENT_API_URL as string | undefined;
  const pay = async () => {
    if (!paymentApi || !account || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `${paymentApi.replace(/\/$/, "")}/checkout`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ packageId: pack.id }),
        },
      );
      if (!response.ok)
        throw new Error(
          response.status === 401
            ? "Cần đăng nhập tài khoản thanh toán trên máy chủ."
            : "Chưa tạo được giao dịch. Vui lòng thử lại.",
        );
      const result = await response.json();
      const url = new URL(result.checkoutUrl);
      if (
        url.protocol !== "https:" ||
        !["pay.payos.vn", "payos.vn"].includes(url.hostname)
      )
        throw new Error("Đường dẫn thanh toán không hợp lệ.");
      window.location.assign(url.href);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Không kết nối được cổng thanh toán.",
      );
      setBusy(false);
    }
  };
  if (!account)
    return (
      <div className="account-auth">
        <AuthPage />
      </div>
    );
  return (
    <div className="portal-page">
      <div className="page-heading">
        <h1>Tài khoản</h1>
      </div>
      <div className="account-layout">
        <aside className="surface profile-card">
          <span className="large-avatar">
            {account.displayName.charAt(0).toUpperCase()}
          </span>
          <h2>{account.displayName}</h2>
          <p>{account.email}</p>
          <span className="tag green">
            CẤP {profile?.level || 1} · {profile?.xp || 0} XP
          </span>
          <div className="wallet-total">
            <Coins size={28} />
            <strong>{(wallet?.balance || 0).toLocaleString("vi-VN")}</strong>
            <span>xu trong ví</span>
          </div>
          <button
            className="secondary-button"
            onClick={() => navigateTo("settings")}
          >
            <Settings size={16} /> Cài đặt tài khoản
          </button>
          {isAdmin && (
            <button className="text-button" onClick={() => navigateTo("admin")}>
              <ShieldCheck size={16} /> Quản trị
            </button>
          )}
          <button
            className="text-button logout-button"
            onClick={() => void logout().then(() => navigateTo("home"))}
          >
            <LogOut size={16} /> Đăng xuất
          </button>
          <p className="small-copy">
            Tài khoản và ví hiện lưu trên trình duyệt này.
          </p>
        </aside>
        <section className="surface topup-panel">
          <div className="section-heading">
            <Coins size={25} />
            <h2>Mua xu · Nạp thêm niềm vui.</h2>
          </div>
          <p>Chọn một gói xu để sắm trang bị yêu thích.</p>
          <div className="coin-packs">
            {PACKS.map((p) => (
              <button
                className={`coin-pack ${pack.id === p.id ? "selected" : ""}`}
                onClick={() => setPack(p)}
                key={p.id}
                aria-pressed={pack.id === p.id}
              >
                {p.id === "adventure" && (
                  <span className="pack-popular">ĐƯỢC ĐỀ XUẤT</span>
                )}
                <Coins size={34} />
                <strong>
                  {p.coins.toLocaleString("vi-VN")} <small>xu</small>
                </strong>
                <span>{p.name}</span>
                <b>{p.price.toLocaleString("vi-VN")}đ</b>
                {pack.id === p.id && <Check size={16} className="pack-check" />}
              </button>
            ))}
          </div>
          <div className="checkout-summary">
            <h3>Thông tin thanh toán</h3>
            <div>
              <span>Gói đã chọn</span>
              <strong>{pack.coins.toLocaleString("vi-VN")} xu</strong>
            </div>
            <div>
              <span>Phương thức</span>
              <strong className="payos-brand">
                pay<span>OS</span> <small>Chuyển khoản / QR</small>
              </strong>
            </div>
            <div className="checkout-total">
              <span>Tổng thanh toán</span>
              <strong>{pack.price.toLocaleString("vi-VN")}đ</strong>
            </div>
          </div>
          {!paymentApi && (
            <p className="notice">
              <LockKeyhole size={17} /> Cổng thanh toán đang được thiết lập.
              Chưa thể mua xu bằng tiền thật.
            </p>
          )}
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          <button
            className="primary-button checkout-button"
            onClick={pay}
            disabled={!paymentApi || busy}
          >
            <CreditCard size={19} />
            {busy ? "Đang mở payOS…" : "Thanh toán qua payOS"}
            <ArrowRight size={18} />
          </button>
          <p className="small-copy">
            <ShieldCheck size={14} /> Giao dịch chỉ hoàn tất sau khi máy chủ xác
            thực thanh toán.
          </p>
        </section>
      </div>
    </div>
  );
};
