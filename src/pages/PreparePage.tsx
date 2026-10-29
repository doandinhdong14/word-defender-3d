import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Coins,
  Map as MapIcon,
  Play,
  RotateCcw,
  Shield,
  Zap,
  X,
} from "lucide-react";
import { useApp } from "../app/appStore";
import { db } from "../data/db";
import { VocabularySet } from "../types/vocabulary";
import { ALL_MAP_IDS, MAP_CONFIGS, GameMapId } from "../config/maps";
import { STORE_CATALOG } from "../config/catalog";
import { getAssetUrl } from "../utils/assetUrl";
import { useAuth } from "../auth/AuthContext";
import { BASIC_MAP_ID, BASIC_MODE, getBasicSets, getBasicWords, isBasicSet } from "../config/access";
import { buyStoreItem, buyAmmoPack } from "../economy/inventory";
import { MonsterAlmanacModal } from "../components/MonsterAlmanacModal";

type ActiveModal = "hero" | "map" | "ammo" | "wordset" | "almanac" | null;

export const PreparePage: React.FC = () => {
  const { account } = useAuth();
  const isGuest = !account;
  const {
    navigateTo,
    selectedMap,
    setSelectedMap,
    selectedSetId,
    setSelectedSetId,
    selectedWordCount,
    setSelectedWordCount,
    inventory,
    wallet,
    refreshUserData,
  } = useApp();

  const [sets, setSets] = useState<VocabularySet[]>([]);
  const [outfit, setOutfit] = useState<string | null>(inventory?.equippedOutfitId || null);
  const [bullet, setBullet] = useState<string>(inventory?.equippedBulletId || "bullet_default");
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState(false);

  useEffect(() => {
    (isGuest ? Promise.resolve(getBasicSets()) : db.wordSets.toArray())
      .then((all) => {
        setSets(all);
        if (!all.some((s) => s.id === selectedSetId) && all[0]) {
          setSelectedSetId(all[0].id);
        }
      })
      .catch(() => setError("Không tải được tài liệu. Hãy thử lại."));
  }, []);

  useEffect(() => {
    if (inventory) {
      if (inventory.equippedOutfitId !== undefined) setOutfit(inventory.equippedOutfitId);
      if (inventory.equippedBulletId) setBullet(inventory.equippedBulletId);
    }
  }, [inventory]);

  const activeSet = sets.find((s) => s.id === selectedSetId);
  const activeHero = STORE_CATALOG.find((i) => i.id === outfit);
  const activeBullet = STORE_CATALOG.find((i) => i.id === bullet) || STORE_CATALOG.find((i) => i.id === "bullet_default")!;
  const ammoCounts = inventory?.ammoCounts || {};

  const handleBuyHero = async (heroId: string) => {
    if (isGuest) { navigateTo('account'); return; }
    if (busyAction) return;
    setBusyAction(true);
    setError("");
    try {
      await buyStoreItem(heroId);
      await db.inventories.update(inventory!.profileId, { equippedOutfitId: heroId });
      setOutfit(heroId);
      await refreshUserData();
      setActiveModal(null);
    } catch (e: any) {
      setError(e.message || "Không thể mua tướng.");
    } finally {
      setBusyAction(false);
    }
  };

  const handleBuyAmmo = async (ammoId: string) => {
    if (isGuest) { navigateTo('account'); return; }
    if (busyAction) return;
    setBusyAction(true);
    setError("");
    try {
      await buyAmmoPack(ammoId, 1000, 200);
      await db.inventories.update(inventory!.profileId, { equippedBulletId: ammoId });
      setBullet(ammoId);
      await refreshUserData();
    } catch (e: any) {
      setError(e.message || "Không thể mua gói đạn.");
    } finally {
      setBusyAction(false);
    }
  };

  const launch = async () => {
    if (launching) return;
    setLaunching(true);
    setError("");
    try {
      if (!inventory) throw new Error("Hãy đăng nhập để chọn trang bị và vào trận.");
      if (isGuest && (!isBasicSet(selectedSetId) || selectedMap !== BASIC_MAP_ID || outfit || bullet !== "bullet_default")) {
        navigateTo("account");
        return;
      }
      if (!activeSet || !(isGuest ? getBasicWords(activeSet.id).length : await db.words.where("setId").equals(activeSet.id).count())) {
        throw new Error("Hãy chọn tài liệu có từ vựng.");
      }
      if (outfit && !inventory.ownedItemIds.includes(outfit)) {
        throw new Error("Bạn chưa sở hữu tướng này.");
      }
      if (bullet !== "bullet_default" && !inventory.ownedItemIds.includes(bullet)) {
        throw new Error("Bạn chưa sở hữu loại đạn này.");
      }

      if (!isGuest) {
        await db.inventories.update(inventory.profileId, {
          equippedOutfitId: outfit,
          equippedBulletId: bullet,
        });
      }
      await refreshUserData();
      navigateTo("battle");
    } catch (e: any) {
      setError(e.message || "Không thể vào trận.");
      setLaunching(false);
    }
  };

  return (
    <div className="prepare-compact-page">
      {/* Top Header Bar */}
      <div className="prepare-top-bar">
        <div className="prepare-title-area">
          <button className="prepare-back-btn" onClick={() => navigateTo("home")}>
            <ArrowLeft size={16} /> Về sảnh
          </button>
          <h1>Đấu Thường</h1>
        </div>

        <button className="prepare-almanac-btn" onClick={() => setActiveModal("almanac")}>
          <BookOpen size={16} /> Sách Yêu Quái
        </button>
      </div>

      {/* 3-Round Format Summary */}
      <div className="prepare-round-strip">
        <div className="round-pill r1">
          <span className="round-num-badge">1</span>
          <div className="round-desc">
            <strong>VÒNG 1: Gõ Tiếng Anh</strong>
            <small>Luyện từ vựng ➔ Trùm R1 tổng hợp</small>
          </div>
        </div>
        <div className="round-pill r2">
          <span className="round-num-badge">2</span>
          <div className="round-desc">
            <strong>VÒNG 2: Việt ➔ Gõ Anh</strong>
            <small>Nhớ nghĩa từ ➔ Trùm R2 tổng hợp</small>
          </div>
        </div>
        <div className="round-pill r3">
          <span className="round-num-badge">3</span>
          <div className="round-desc">
            <strong>VÒNG 3: Loạn Xạ Thử Thách</strong>
            <small>Quái tốc độ, bắn đạn, 2-3 từ ➔ Đại Trùm</small>
          </div>
        </div>
      </div>

      {/* 4 Selection Cards (Tướng, Map, Đạn, Bộ từ & Số từ) */}
      <div className="prepare-main-grid">
        {/* CARD 1: TƯỚNG (HERO) */}
        <div className="prepare-card">
          <div className="prepare-card-head">
            <span className="prepare-card-tag">TƯỚNG CHIẾN BINH</span>
            <button className="prepare-change-btn" onClick={() => setActiveModal("hero")}>
              <RotateCcw size={13} /> Đổi tướng
            </button>
          </div>
          <div className="prepare-card-content">
            <div className="prepare-card-thumb">
              <img
                src={getAssetUrl(activeHero?.iconUrl || "/assets/ponpi/ponpi_idle.png")}
                alt=""
              />
            </div>
            <div className="prepare-card-info">
              <strong>{activeHero?.title || "pempom nguyên bản"}</strong>
              <span>{activeHero ? `${activeHero.priceCoins} xu · Đã trang bị` : "Chiến binh khởi đầu (Miễn phí)"}</span>
            </div>
          </div>
        </div>

        {/* CARD 2: BẢN ĐỒ (MAP) */}
        <div className="prepare-card">
          <div className="prepare-card-head">
            <span className="prepare-card-tag">BẢN ĐỒ THI ĐẤU</span>
            <button className="prepare-change-btn" onClick={() => setActiveModal("map")}>
              <RotateCcw size={13} /> Đổi map
            </button>
          </div>
          <div className="prepare-card-content">
            <div
              className="prepare-card-thumb map-thumb"
              style={{
                backgroundColor: MAP_CONFIGS[selectedMap].previewBg,
                backgroundImage: MAP_CONFIGS[selectedMap].previewImage
                  ? `url(${getAssetUrl(MAP_CONFIGS[selectedMap].previewImage)})`
                  : undefined,
              }}
            >
              {!MAP_CONFIGS[selectedMap].previewImage && "✎"}
            </div>
            <div className="prepare-card-info">
              <strong>{MAP_CONFIGS[selectedMap].name}</strong>
              <span>{MAP_CONFIGS[selectedMap].badge}</span>
            </div>
          </div>
        </div>

        {/* CARD 3: LOẠI ĐẠN (AMMO) */}
        <div className="prepare-card">
          <div className="prepare-card-head">
            <span className="prepare-card-tag">LOẠI ĐẠN TRANG BỊ</span>
            <button className="prepare-change-btn" onClick={() => setActiveModal("ammo")}>
              <RotateCcw size={13} /> Đổi / Mua đạn
            </button>
          </div>
          <div className="prepare-card-content">
            <div className="prepare-card-thumb">
              <img src={getAssetUrl(activeBullet.iconUrl || "/assets/items/bullet_default_icon.png")} alt="" />
            </div>
            <div className="prepare-card-info">
              <strong>{activeBullet.title}</strong>
              {bullet === "bullet_default" ? (
                <span className="ammo-badge">✓ Đạn cơ bản vô hạn (0 xu)</span>
              ) : (
                <span className="ammo-badge special">
                  ⚡ Còn {(ammoCounts[bullet] || 0).toLocaleString("vi-VN")} viên
                </span>
              )}
            </div>
          </div>
        </div>

        {/* CARD 4: BỘ TỪ & SỐ TỪ THI ĐẤU */}
        <div className="prepare-card">
          <div className="prepare-card-head">
            <span className="prepare-card-tag">TÀI LIỆU & SỐ TỪ</span>
            <button className="prepare-change-btn" onClick={() => setActiveModal("wordset")}>
              <RotateCcw size={13} /> Đổi bộ từ
            </button>
          </div>
          <div className="prepare-card-content">
            <div className="prepare-card-thumb">
              <BookOpen size={28} color="#D35400" />
            </div>
            <div className="prepare-card-info">
              <strong>{activeSet?.title || "Chưa chọn bộ từ"}</strong>
              <div className="word-count-row">
                <span className="word-count-label">Số từ:</span>
                {[25, 30, 40, 50].map((count) => (
                  <button
                    key={count}
                    className={`count-pill ${selectedWordCount === count ? "active" : ""}`}
                    onClick={() => setSelectedWordCount(count)}
                  >
                    {count} từ
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Launch Row */}
      <div className="prepare-bottom-bar">
        <div className="wallet-chip">
          <Coins size={18} color="#D4AC0D" />
          <span>{(wallet?.balance || 0).toLocaleString("vi-VN")} xu</span>
        </div>

        {error && <span style={{ color: "#C0392B", fontSize: "0.8rem", fontWeight: 700 }}>{error}</span>}

        <button className="launch-btn" onClick={launch} disabled={launching || !activeSet}>
          <Play size={22} fill="currentColor" />
          {launching ? "Đang chuẩn bị…" : "VÀO TRẬN ĐẤU THƯỜNG"}
        </button>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: CHỌN TƯỚNG (HERO MODAL) */}
      {/* ========================================================= */}
      {activeModal === "hero" && (
        <div className="compact-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="compact-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="compact-modal-head">
              <h3>Chọn Tướng Chiến Binh</h3>
              <button className="almanac-close-btn" onClick={() => setActiveModal(null)}><X size={18} /></button>
            </div>
            <div className="compact-modal-scroll">
              {/* Default Hero */}
              <button
                className={`compact-item-btn ${!outfit ? "selected" : ""}`}
                onClick={() => {
                  setOutfit(null);
                  setActiveModal(null);
                }}
              >
                <div className="compact-item-thumb">
                  <img src={getAssetUrl("/assets/ponpi/ponpi_idle.png")} alt="" />
                </div>
                <strong>pempom nguyên bản</strong>
                <small>Miễn phí · Mặc định</small>
                {!outfit && <span style={{ color: "#27AE60", fontWeight: 800 }}>✓ Đang chọn</span>}
              </button>

              {/* All Heroes from Catalog */}
              {STORE_CATALOG.filter((i) => i.category === "outfit").map((h) => {
                const isOwned = inventory?.ownedItemIds.includes(h.id);
                const isSelected = outfit === h.id;
                return (
                  <div key={h.id} className={`compact-item-btn ${isSelected ? "selected" : ""}`}>
                    <div className="compact-item-thumb">
                      <img src={getAssetUrl(h.iconUrl!)} alt={h.title} />
                    </div>
                    <strong>{h.title}</strong>
                    <small>{h.priceCoins} xu</small>

                    {isOwned ? (
                      <button
                        className="compact-buy-btn"
                        style={{ background: isSelected ? "#27AE60" : "var(--color-accent-yellow)", color: isSelected ? "#FFF" : "#000" }}
                        onClick={() => {
                          setOutfit(h.id);
                          setActiveModal(null);
                        }}
                      >
                        {isSelected ? "✓ Đang chọn" : "Trang bị"}
                      </button>
                    ) : (
                      <button
                        className="compact-buy-btn"
                        onClick={() => handleBuyHero(h.id)}
                        disabled={busyAction}
                      >
                        {isGuest ? 'Đăng nhập Google' : `Mua (${h.priceCoins} xu)`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: CHỌN MAP (MAP MODAL) */}
      {/* ========================================================= */}
      {activeModal === "map" && (
        <div className="compact-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="compact-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="compact-modal-head">
              <h3>Chọn Bản Đồ Chiến Đấu</h3>
              <button className="almanac-close-btn" onClick={() => setActiveModal(null)}><X size={18} /></button>
            </div>
            <div className="compact-modal-scroll">
              {ALL_MAP_IDS.map((id) => {
                const m = MAP_CONFIGS[id];
                const isSelected = selectedMap === id;
                return (
                  <button
                    key={id}
                    className={`compact-item-btn ${isSelected ? "selected" : ""}`}
                    onClick={() => {
                      setSelectedMap(id as GameMapId);
                      setActiveModal(null);
                    }}
                  >
                    <div
                      className="compact-item-thumb map-thumb"
                      style={{
                        backgroundColor: m.previewBg,
                        backgroundImage: m.previewImage ? `url(${getAssetUrl(m.previewImage)})` : undefined,
                      }}
                    >
                      {!m.previewImage && "✎"}
                    </div>
                    <strong>{m.name}</strong>
                    <small>{isGuest && id !== BASIC_MAP_ID ? 'Đăng nhập Google để mở' : m.badge}</small>
                    {isSelected && <span style={{ color: "#27AE60", fontWeight: 800 }}>✓ Đang chọn</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: CHỌN & MUA ĐẠN (AMMO MODAL) */}
      {/* ========================================================= */}
      {activeModal === "ammo" && (
        <div className="compact-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="compact-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="compact-modal-head">
              <h3>Trang Bị & Mua Đạn</h3>
              <button className="almanac-close-btn" onClick={() => setActiveModal(null)}><X size={18} /></button>
            </div>
            <div className="compact-modal-scroll">
              {/* Bullets List */}
              {STORE_CATALOG.filter((i) => i.id.startsWith("bullet_")).map((b) => {
                const count = ammoCounts[b.id] || 0;
                const isSelected = bullet === b.id;
                const isDefault = b.id === "bullet_default";
                return (
                  <div key={b.id} className={`compact-item-btn ${isSelected ? "selected" : ""}`}>
                    <div className="compact-item-thumb">
                      <img src={getAssetUrl(b.iconUrl || "/assets/items/bullet_default_icon.png")} alt={b.title} />
                    </div>
                    <strong>{b.title}</strong>
                    <small style={{ color: "#555" }}>
                      {isDefault ? "Vô hạn (Miễn phí)" : `Còn ${count.toLocaleString("vi-VN")} viên`}
                    </small>

                    <div style={{ display: "flex", gap: "4px", width: "100%", justifyContent: "center", marginTop: "4px" }}>
                      <button
                        className="compact-buy-btn"
                        style={{ background: isSelected ? "#27AE60" : "#FFF", color: isSelected ? "#FFF" : "#000" }}
                        onClick={() => {
                          if (isGuest && !isDefault) { navigateTo('account'); return; }
                          setBullet(b.id);
                          setActiveModal(null);
                        }}
                      >
                        {isGuest && !isDefault ? 'Đăng nhập Google' : isSelected ? "✓ Đang chọn" : "Chọn đạn"}
                      </button>

                      {!isDefault && (
                        <button
                          className="compact-buy-btn"
                          style={{ background: "var(--color-accent-yellow)" }}
                          onClick={() => handleBuyAmmo(b.id)}
                          disabled={busyAction}
                          title="Mua 1.000 viên với giá 200 xu"
                        >
                          {isGuest ? 'Đăng nhập để mua' : '+1.000 viên (200 xu)'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: CHỌN BỘ TỪ (WORD SET MODAL) */}
      {/* ========================================================= */}
      {activeModal === "wordset" && (
        <div className="compact-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="compact-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="compact-modal-head">
              <h3>Chọn Tài Liệu Từ Vựng</h3>
              <button className="almanac-close-btn" onClick={() => setActiveModal(null)}><X size={18} /></button>
            </div>
            <div className="compact-modal-scroll">
              {sets.map((s) => {
                const isSelected = selectedSetId === s.id;
                return (
                  <button
                    key={s.id}
                    className={`compact-item-btn ${isSelected ? "selected" : ""}`}
                    onClick={() => {
                      setSelectedSetId(s.id);
                      setActiveModal(null);
                    }}
                  >
                    <div className="compact-item-thumb">
                      <BookOpen size={30} color="#D35400" />
                    </div>
                    <strong>{s.title}</strong>
                    <small>{s.entryIds.length} từ vựng</small>
                    {isSelected && <span style={{ color: "#27AE60", fontWeight: 800 }}>✓ Đang chọn</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: SÁCH YÊU QUÁI (MONSTER ALMANAC) */}
      {/* ========================================================= */}
      <MonsterAlmanacModal isOpen={activeModal === "almanac"} onClose={() => setActiveModal(null)} />
    </div>
  );
};
