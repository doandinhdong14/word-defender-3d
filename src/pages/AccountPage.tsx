import React, { useState, useEffect } from "react";
import {
  ArrowRight,
  Check,
  Coins,
  CreditCard,
  LockKeyhole,
  LogOut,
  PartyPopper,
  Settings,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import confetti from "canvas-confetti";
import { useApp } from "../app/appStore";
import { useAuth } from "../auth/AuthContext";
import { AuthPage } from "./AuthPage";
import { COIN_PACKS, CoinPackage } from "../config/catalog";
import { db } from "../data/db";
import { getActiveProfileId } from "../auth/authService";

export const AccountPage: React.FC = () => {
  const { account, logout, isAdmin } = useAuth();
  const { wallet, profile, navigateTo, refreshUserData } = useApp();
  const [pack, setPack] = useState<CoinPackage>(COIN_PACKS[1]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const paymentApi = (import.meta.env.VITE_PAYMENT_API_URL as string | undefined) || "/api/payments";

  // Check PayOS return callbacks
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get("payment");
    const orderCode = params.get("orderCode");

    if (paymentStatus === "success" && orderCode) {
      setBusy(true);
      fetch(`${paymentApi.replace(/\/$/, "")}/order/${orderCode}`, { credentials: "include" })
        .then((res) => res.json())
        .then(async (data) => {
          if (data.status === "PAID") {
            const activeId = getActiveProfileId();
            if (data.type === "pack" && data.coins > 0) {
              const w = await db.wallets.get(activeId);
              if (w) {
                w.balance = (w.balance || 0) + data.coins;
                w.totalEarned = (w.totalEarned || 0) + data.coins;
                await db.wallets.put(w);
              }
              const existingLedger = await db.ledger.get(`ledger_payos_${orderCode}`);
              if (!existingLedger) {
                await db.ledger.add({
                  id: `ledger_payos_${orderCode}`,
                  profileId: activeId,
                  kind: "earn",
                  amount: data.coins,
                  referenceId: `payos_pack_${orderCode}`,
                  at: new Date().toISOString(),
                });
              }
              setSuccessMessage(`🎉 Thanh toán thành công! Bạn đã nhận được +${data.coins.toLocaleString("vi-VN")} xu.`);
            } else if (data.type === "skin" && data.targetId) {
              const inv = await db.inventories.get(activeId);
              if (inv && !inv.ownedItemIds.includes(data.targetId)) {
                inv.ownedItemIds.push(data.targetId);
                await db.inventories.put(inv);
              }
              setSuccessMessage("🎉 Thanh toán thành công! Skin đã được mở khóa vào kho đồ của bạn.");
            }
            confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
            await refreshUserData();
          }
        })
        .catch(() => {
          setError("Không thể xác thực giao dịch từ máy chủ. Vui lòng kiểm tra lại số dư.");
        })
        .finally(() => {
          setBusy(false);
          window.history.replaceState(null, "", window.location.pathname);
        });
    } else if (paymentStatus === "cancelled") {
      setError("Giao dịch thanh toán đã bị hủy hoặc chưa hoàn tất.");
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [paymentApi, refreshUserData]);

  const pay = async () => {
    if (!paymentApi || !account || busy) return;
    setBusy(true);
    setError("");
    setSuccessMessage("");
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
            ? "Cần đăng nhập tài khoản trước khi thanh toán."
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
            {COIN_PACKS.map((p) => (
              <button
                className={`coin-pack ${pack.id === p.id ? "selected" : ""}`}
                onClick={() => setPack(p)}
                key={p.id}
                aria-pressed={pack.id === p.id}
              >
                {p.popular && (
                  <span className="pack-popular">ĐƯỢC ĐỀ XUẤT</span>
                )}
                <Coins size={34} />
                <strong>
                  {p.coins.toLocaleString("vi-VN")} <small>xu</small>
                </strong>
                <span>{p.name}</span>
                {p.bonus && <small style={{ color: "var(--color-primary-dark, #D35400)", fontWeight: 700 }}>{p.bonus}</small>}
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
                pay<span>OS</span> <small>Chuyển khoản / VietQR</small>
              </strong>
            </div>
            <div className="checkout-total">
              <span>Tổng thanh toán</span>
              <strong>{pack.price.toLocaleString("vi-VN")}đ</strong>
            </div>
          </div>
          {successMessage && (
            <p className="notice success" style={{ background: "#E8F8F5", color: "#117A65", border: "1.5px solid #A2D9CE", padding: "10px 14px", borderRadius: "10px", fontWeight: 600 }}>
              <PartyPopper size={18} /> {successMessage}
            </p>
          )}
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
