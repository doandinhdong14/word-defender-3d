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
import { getDeckProgress, DeckProgressInfo } from "../learning/sessionSelector";
import type { Difficulty } from "../types/game";

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; description: string }[] = [
  { value: "easy", label: "Dễ", description: "Quái thường chậm hơn 30%, thêm thời gian luyện gõ." },
  { value: "normal", label: "Vừa", description: "Tốc độ tiêu chuẩn, phù hợp khi đã quen tay." },
  { value: "hard", label: "Khó", description: "Quái thường nhanh hơn 35%, thử thách phản xạ." },
];

type ActiveModal = "hero" | "map" | "ammo" | "wordset" | "almanac" | "chunk" | null;

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
    selectedChunkIndex,
    setSelectedChunkIndex,
    selectedDifficulty,
    setSelectedDifficulty,
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
  const [deckProgress, setDeckProgress] = useState<DeckProgressInfo | null>(null);
  const [busyAction, setBusyAction] = useState(false);

  useEffect(() => {
    if (selectedSetId) {
      getDeckProgress(selectedSetId, selectedWordCount || 30).then(setDeckProgress);
    }
  }, [selectedSetId, selectedWordCount]);

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
  const difficultyIndex = DIFFICULTY_OPTIONS.findIndex((option) => option.value === selectedDifficulty);
  const difficultyOption = DIFFICULTY_OPTIONS[difficultyIndex];

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

  const handlePayOsBuyHero = async (heroId: string) => {
    if (isGuest) { navigateTo('account'); return; }
    if (busyAction) return;
    setBusyAction(true);
    setError("");
    try {
      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skinId: heroId }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Chưa tạo được liên kết PayOS.');
      }
      const data = await response.json();
      if (data.checkoutUrl) {
        window.location.assign(data.checkoutUrl);
      }
    } catch (e: any) {
      setError(e.message || "Không thể tạo liên kết thanh toán PayOS.");
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
      </div>

      {/* 3-Round Format Summary */}
      <div className="prepare-round-strip">
        <div className="round-pill r1">
          <span className="round-num-badge">1</span>
          <span className="round-pill-label">Round 1</span>
          <div className="round-tooltip">
            <strong>VÒNG 1: Gõ Chữ Có Sẵn</strong>
            <small>Nhìn từ tiếng Anh gõ mẫu ➔ Trùm R1</small>
          </div>
        </div>
        <div className="round-pill r2">
          <span className="round-num-badge">2</span>
          <span className="round-pill-label">Round 2</span>
          <div className="round-tooltip">
            <strong>VÒNG 2: Đoán Ra Mà Gõ</strong>
            <small>Hiện nghĩa tiếng Việt ➔ Bấm tiếng Anh ➔ Trùm R2</small>
          </div>
        </div>
        <div className="round-pill r3">
          <span className="round-num-badge">3</span>
          <span className="round-pill-label">Round 3</span>
          <div className="round-tooltip">
            <strong>VÒNG 3: Thử Thách & Đại Trùm</strong>
            <small>Quái tốc độ, quái trâu ➔ Đại Trùm Alien</small>
          </div>
        </div>
      </div>

      {/* 4 Selection Cards (Skin, Map, Đạn, Tài liệu) */}
      <div className="prepare-main-grid">
        {/* CARD 1: SKIN */}
        <div
          className="prepare-card prepare-card-minimal"
          onClick={() => setActiveModal("hero")}
          title={activeHero?.title || "pempom nguyên bản"}
        >
          <div className="prepare-card-visual skin-visual">
            <div className="stage-aura-ring" aria-hidden="true" />
            <img
              src={getAssetUrl(activeHero?.iconUrl || "/assets/ponpi/ponpi_idle.png")}
              alt=""
              className="prepare-card-img skin-img"
            />
          </div>
          <button
            type="button"
            className="prepare-card-center-btn"
            onClick={(e) => {
              e.stopPropagation();
              setActiveModal("hero");
            }}
          >
            Thay đổi
          </button>
        </div>

        {/* CARD 2: MAP */}
        <div
          className="prepare-card prepare-card-minimal"
          onClick={() => setActiveModal("map")}
          title={MAP_CONFIGS[selectedMap].name}
        >
          <div
            className={`prepare-card-visual map-visual ${selectedMap === 'default' ? 'map-default-notebook' : ''}`}
            style={{
              backgroundColor: MAP_CONFIGS[selectedMap].previewBg,
              backgroundImage: MAP_CONFIGS[selectedMap].previewImage
                ? `url(${getAssetUrl(MAP_CONFIGS[selectedMap].previewImage)})`
                : undefined,
            }}
          >
            {selectedMap === 'default' && (
              <div className="default-map-watermark">
                <span className="default-map-icon">📝</span>
                <span className="default-map-grid-text">TẬP VỞ Ô LY</span>
              </div>
            )}
            <div className="map-bottom-shade" />
          </div>
          <button
            type="button"
            className="prepare-card-center-btn"
            onClick={(e) => {
              e.stopPropagation();
              setActiveModal("map");
            }}
          >
            Thay đổi
          </button>
        </div>

        {/* CARD 3: ĐẠN */}
        <div
          className="prepare-card prepare-card-minimal"
          onClick={() => setActiveModal("ammo")}
          title={activeBullet.title}
        >
          <div className="prepare-card-visual bullet-visual">
            <div className="bullet-energy-ring" aria-hidden="true" />
            <img
              src={getAssetUrl(activeBullet.iconUrl || "/assets/items/bullet_default_icon.png")}
              alt=""
              className="prepare-card-img bullet-img"
            />
          </div>
          <button
            type="button"
            className="prepare-card-center-btn"
            onClick={(e) => {
              e.stopPropagation();
              setActiveModal("ammo");
            }}
          >
            Thay đổi
          </button>
        </div>

        {/* CARD 4: TÀI LIỆU */}
        <div
          className="prepare-card prepare-card-minimal"
          onClick={() => setActiveModal("wordset")}
          title={activeSet?.title || "Tài liệu học"}
        >
          <div className="prepare-card-visual book-visual">
            <div className="book-doodle-bg" aria-hidden="true">
              <span className="doodle-letter d1">Aa</span>
              <span className="doodle-letter d2">✦</span>
              <span className="doodle-letter d3">Bb</span>
              <span className="doodle-letter d4">✎</span>
            </div>
            <div className="book-hero-icon">
              <BookOpen size={92} strokeWidth={2} color="#C0392B" />
            </div>
          </div>
          <button
            type="button"
            className="prepare-card-center-btn"
            onClick={(e) => {
              e.stopPropagation();
              setActiveModal("wordset");
            }}
          >
            Thay đổi
          </button>
        </div>
      </div>

      <section className="prepare-difficulty" aria-labelledby="prepare-difficulty-label">
        <div className="prepare-difficulty-heading">
          <label id="prepare-difficulty-label" htmlFor="prepare-difficulty-slider">Độ khó</label>
          <output htmlFor="prepare-difficulty-slider">{difficultyOption.label}</output>
        </div>
        <input
          id="prepare-difficulty-slider"
          className="prepare-difficulty-slider"
          type="range"
          min={0}
          max={DIFFICULTY_OPTIONS.length - 1}
          step={1}
          value={difficultyIndex}
          aria-valuetext={difficultyOption.label}
          aria-describedby="prepare-difficulty-description"
          disabled={launching}
          onChange={(event) => setSelectedDifficulty(DIFFICULTY_OPTIONS[Number(event.target.value)].value)}
        />
        <div className="prepare-difficulty-stops">
          {DIFFICULTY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={option.value === selectedDifficulty}
              disabled={launching}
              onClick={() => setSelectedDifficulty(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p id="prepare-difficulty-description">{difficultyOption.description}</p>
      </section>

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
                    <small>
                      {h.priceCoins} xu {h.priceVnd ? `· ${h.priceVnd.toLocaleString("vi-VN")}đ` : ""}
                    </small>

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
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "100%" }}>
                        <button
                          className="compact-buy-btn"
                          onClick={() => handleBuyHero(h.id)}
                          disabled={busyAction}
                        >
                          {isGuest ? 'Đăng nhập Google' : `Mua (${h.priceCoins} xu)`}
                        </button>
                        {!isGuest && h.priceVnd && (
                          <button
                            className="compact-buy-btn"
                            style={{ background: "#0052CC", color: "#FFF" }}
                            onClick={() => handlePayOsBuyHero(h.id)}
                            disabled={busyAction}
                          >
                            PayOS ({h.priceVnd.toLocaleString("vi-VN")}đ)
                          </button>
                        )}
                      </div>
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
              <h3>Tài Liệu & Tiến Độ Học</h3>
              <button className="almanac-close-btn" onClick={() => setActiveModal(null)}><X size={18} /></button>
            </div>

            {/* Word count & Mode Selector inside modal */}
            <div style={{ padding: '12px 16px', borderBottom: '1.5px solid rgba(40,38,35,0.1)', background: '#FDFBF7' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 800 }}>Số từ mỗi trận:</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[20, 30, 40, 50].map((count) => (
                    <button
                      key={count}
                      type="button"
                      className={`count-pill ${selectedWordCount === count ? "active" : ""}`}
                      onClick={() => setSelectedWordCount(count)}
                    >
                      {count} từ
                    </button>
                  ))}
                </div>
              </div>

              {/* Chunk Selector shortcut */}
              <button
                type="button"
                onClick={() => setActiveModal("chunk")}
                style={{
                  width: '100%',
                  padding: '6px 12px',
                  backgroundColor: selectedChunkIndex !== null ? '#FFF8E1' : '#E8F5E9',
                  border: `1.5px solid ${selectedChunkIndex !== null ? '#FFA000' : '#2E7D32'}`,
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: selectedChunkIndex !== null ? '#E65100' : '#1B5E20',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>
                  {selectedChunkIndex === null
                    ? '⚡ Tự Động Anki SRS (Ưu tiên từ cần ôn + từ mới)'
                    : `🎯 Đang chọn: Chặng ${selectedChunkIndex + 1}`}
                </span>
                <span style={{ fontSize: '0.75rem', textDecoration: 'underline' }}>Đổi chặng</span>
              </button>
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
      {/* MODAL 5: CHỌN CHẶNG / CHUNK SELECTION MODAL */}
      {/* ========================================================= */}
      {activeModal === "chunk" && (
        <div className="compact-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="compact-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="compact-modal-head">
              <h3>Chọn Chặng Luyện Tập ({activeSet?.title})</h3>
              <button className="almanac-close-btn" onClick={() => setActiveModal(null)}><X size={18} /></button>
            </div>
            <div className="compact-modal-scroll">
              {/* Option 0: Auto Anki SRS */}
              <button
                className={`compact-item-btn ${selectedChunkIndex === null ? "selected" : ""}`}
                onClick={() => {
                  setSelectedChunkIndex(null);
                  setActiveModal(null);
                }}
                style={{ textAlign: 'left', padding: '12px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <strong>⚡ Tự Động Anki Spaced Repetition (Khuyên dùng)</strong>
                  {selectedChunkIndex === null && <span style={{ color: "#27AE60", fontWeight: 800 }}>✓ Đang chọn</span>}
                </div>
                <small style={{ color: "#555", display: 'block', marginTop: '4px' }}>
                  Hệ thống tự động ưu tiên các từ đến hạn ôn tập ({deckProgress?.dueWords || 0} từ) và từ mới tiếp theo ({selectedWordCount || 30} từ/trận).
                </small>
              </button>

              {/* Chunks */}
              {deckProgress?.chunks.map((chk) => {
                const isSelected = selectedChunkIndex === chk.index;
                return (
                  <button
                    key={chk.index}
                    className={`compact-item-btn ${isSelected ? "selected" : ""}`}
                    onClick={() => {
                      setSelectedChunkIndex(chk.index);
                      setActiveModal(null);
                    }}
                    style={{ textAlign: 'left', padding: '12px' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <strong>{chk.title}</strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', color: chk.isCompleted ? '#2E7D32' : '#555', fontWeight: 700 }}>
                          {chk.mastered}/{chk.total} từ {chk.isCompleted ? '✓' : ''}
                        </span>
                        {isSelected && <span style={{ color: "#27AE60", fontWeight: 800 }}>✓ Chọn</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 6: SÁCH YÊU QUÁI (MONSTER ALMANAC) */}
      {/* ========================================================= */}
      <MonsterAlmanacModal isOpen={activeModal === "almanac"} onClose={() => setActiveModal(null)} />
    </div>
  );
};
