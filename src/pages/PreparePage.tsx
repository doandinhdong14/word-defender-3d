import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Map,
  Play,
  Shield,
  Zap,
} from "lucide-react";
import { useApp } from "../app/appStore";
import { db } from "../data/db";
import { VocabularySet } from "../types/vocabulary";
import { ALL_MAP_IDS, MAP_CONFIGS } from "../config/maps";
import { STORE_CATALOG } from "../config/catalog";
import { getAssetUrl } from "../utils/assetUrl";
import { PonpiPreview } from "../components/PonpiPreview";
import { playWeaponShootSound } from "../utils/soundEffects";
import { useAuth } from '../auth/AuthContext';
import { BASIC_MAP_ID, BASIC_MODE, getBasicSets, getBasicWords, isBasicSet } from '../config/access';

const STEPS = [
  { label: "Chọn map", icon: Map },
  { label: "Chọn tướng", icon: Shield },
  { label: "Chọn đạn", icon: Zap },
  { label: "Tài liệu học", icon: BookOpen },
];
export const PreparePage: React.FC = () => {
  const { account } = useAuth();
  const isGuest = !account;
  const {
    navigateTo,
    selectedMap,
    setSelectedMap,
    selectedSetId,
    setSelectedSetId,
    selectedMode,
    setSelectedMode,
    selectedDifficulty,
    setSelectedDifficulty,
    inventory,
    refreshUserData,
  } = useApp();
  const [step, setStep] = useState(0);
  const [sets, setSets] = useState<VocabularySet[]>([]);
  const [outfit, setOutfit] = useState<string | null>(
    inventory?.equippedOutfitId || null,
  );
  const [bullet, setBullet] = useState(
    inventory?.equippedBulletId || "bullet_default",
  );
  const [error, setError] = useState("");
  const [launching, setLaunching] = useState(false);
  useEffect(() => {
    (isGuest ? Promise.resolve(getBasicSets()) : db.wordSets.toArray())
      .then((all) => {
        setSets(all);
        if (!all.some((s) => s.id === selectedSetId) && all[0])
          setSelectedSetId(all[0].id);
      })
      .catch(() => setError("Không tải được tài liệu. Hãy thử lại."));
  }, []);
  const outfits = STORE_CATALOG.filter(
    (i) => i.category === "outfit" && inventory?.ownedItemIds.includes(i.id),
  );
  const bullets = STORE_CATALOG.filter(
    (i) => i.id.startsWith("bullet_") && inventory?.ownedItemIds.includes(i.id),
  );
  const activeSet = sets.find((s) => s.id === selectedSetId);
  const launch = async () => {
    if (launching) return;
    setLaunching(true);
    setError("");
    try {
      if (!inventory)
        throw new Error("Hãy đăng nhập để chọn trang bị và vào trận.");
      if (isGuest && (!isBasicSet(selectedSetId) || selectedMap !== BASIC_MAP_ID || selectedMode !== BASIC_MODE || outfit || bullet !== 'bullet_default')) {
        navigateTo('account');
        return;
      }
      if (
        !activeSet ||
        !(isGuest ? getBasicWords(activeSet.id).length : await db.words.where("setId").equals(activeSet.id).count())
      )
        throw new Error("Hãy chọn tài liệu có ít nhất một từ vựng.");
      if (
        (outfit && !inventory.ownedItemIds.includes(outfit)) ||
        !inventory.ownedItemIds.includes(bullet)
      )
        throw new Error("Bạn chưa sở hữu trang bị này.");
      if (!isGuest) {
        await db.inventories.update(inventory.profileId, {
          equippedOutfitId: outfit,
          equippedBulletId: bullet,
        });
      }
      await refreshUserData();
      navigateTo("battle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể vào trận.");
      setLaunching(false);
    }
  };
  return (
    <div className="portal-page prepare-page">
      <div className="page-heading">
        <h1>Chuẩn bị</h1>
      </div>
      {isGuest && <div className="notice guest-notice">
        <p><strong>Chơi miễn phí</strong> · Hai bộ từ cơ bản, tướng pempom nguyên bản, map ô ly và đạn cơ bản.</p>
        <button className="text-button" onClick={() => navigateTo('account')}>Đăng nhập Google để mở thêm tính năng</button>
      </div>}
      <div className="prepare-layout">
        <div className="surface prepare-options">
          <div className="step-tabs">
            {STEPS.map(({ label, icon: Icon }, i) => (
              <button
                key={label}
                onClick={() => setStep(i)}
                className={step === i ? "active" : ""}
              >
                <span>
                  {i < step ? <Check size={15} /> : <Icon size={16} />}
                </span>
                {label}
              </button>
            ))}
          </div>
          <div className="step-body">
            <span className="eyebrow">BƯỚC 0{step + 1} / 04</span>
            <h2>{STEPS[step].label}</h2>
            {step === 0 && (
              <div className="map-grid">
                {ALL_MAP_IDS.map((id) => {
                  const m = MAP_CONFIGS[id];
                  return (
                    <button
                      key={id}
                      className={`map-choice ${selectedMap === id ? "selected" : ""}`}
                      onClick={() => setSelectedMap(id)}
                      aria-pressed={selectedMap === id}
                    >
                      <span
                        className="map-thumb"
                        style={{
                          backgroundColor: m.previewBg,
                          backgroundImage: m.previewImage
                            ? `url(${getAssetUrl(m.previewImage)})`
                            : undefined,
                        }}
                      >
                        {!m.previewImage && "✎"}
                        {selectedMap === id && (
                          <span className="choice-check">
                            <Check size={14} />
                          </span>
                        )}
                      </span>
                      <strong>{m.name}</strong>
                      <small>{isGuest && id !== BASIC_MAP_ID ? 'Đăng nhập Google để mở' : m.badge}</small>
                    </button>
                  );
                })}
              </div>
            )}
            {step === 1 && (
              <div className="equipment-grid">
                <button
                  className={`equipment-choice ${!outfit ? "selected" : ""}`}
                  onClick={() => setOutfit(null)}
                  aria-pressed={!outfit}
                >
                  <img
                    src={getAssetUrl("/assets/ponpi/ponpi_idle.png")}
                    alt=""
                  />
                  <strong>pempom nguyên bản</strong>
                  <small>Luôn sẵn sàng phiêu lưu</small>
                </button>
                {outfits.map((i) => (
                  <button
                    className={`equipment-choice ${outfit === i.id ? "selected" : ""}`}
                    key={i.id}
                    onClick={() => setOutfit(i.id)}
                    aria-pressed={outfit === i.id}
                  >
                    <img src={getAssetUrl(i.iconUrl!)} alt="" />
                    <strong>{i.title}</strong>
                    <small>
                      {outfit === i.id ? "✓ Đang chọn" : "Đã sở hữu"}
                    </small>
                  </button>
                ))}
                {isGuest && <button className="equipment-choice" onClick={() => navigateTo('account')}><Shield size={32} /><strong>Thêm tướng</strong><small>Đăng nhập Google để mở</small></button>}
              </div>
            )}
            {step === 2 && (
              <div className="equipment-grid bullets-grid">
                {bullets.map((i) => (
                  <button
                    className={`equipment-choice ${bullet === i.id ? "selected" : ""}`}
                    key={i.id}
                    onClick={() => {
                      setBullet(i.id);
                      playWeaponShootSound(i.id, true);
                    }}
                    aria-pressed={bullet === i.id}
                  >
                    <img src={getAssetUrl(i.iconUrl!)} alt="" />
                    <strong>{i.title}</strong>
                    <small>
                      {bullet === i.id ? "✓ Đang chọn" : "Đã sở hữu"}
                    </small>
                  </button>
                ))}
                {isGuest && <button className="equipment-choice" onClick={() => navigateTo('account')}><Zap size={32} /><strong>Thêm đạn và kỹ năng</strong><small>Đăng nhập Google để mở</small></button>}
              </div>
            )}
            {step === 3 && (
              <>
                <div className="lesson-choices">
                  {sets.map((s) => (
                    <button
                      key={s.id}
                      className={`lesson-choice ${selectedSetId === s.id ? "selected" : ""}`}
                      onClick={() => setSelectedSetId(s.id)}
                      aria-pressed={selectedSetId === s.id}
                    >
                      <BookOpen size={24} />
                      <span>
                        <strong>{s.title}</strong>
                        <small>{s.entryIds.length} từ vựng</small>
                      </span>
                      {selectedSetId === s.id && <Check size={18} />}
                    </button>
                  ))}
                </div>
                <button
                  className="text-button"
                  onClick={() => navigateTo("editor")}
                >
                  {isGuest ? 'Đăng nhập Google để thêm bộ từ và tải tài liệu' : '+ Tải tài liệu của bạn'}
                </button>
                <div className="prepare-settings">
                  <label>
                    Cách học
                    <select
                      value={selectedMode}
                      onChange={(e) =>
                        setSelectedMode(e.target.value as typeof selectedMode)
                      }
                    >
                      <option value="copy">Nhìn từ và gõ</option>
                      <option value="recall">Nhớ nghĩa và gõ{isGuest ? ' · Đăng nhập Google' : ''}</option>
                      <option value="listen">Nghe và gõ{isGuest ? ' · Đăng nhập Google' : ''}</option>
                    </select>
                  </label>
                  <label>
                    Độ khó
                    <select
                      value={selectedDifficulty}
                      onChange={(e) =>
                        setSelectedDifficulty(
                          e.target.value as typeof selectedDifficulty,
                        )
                      }
                    >
                      <option value="easy">Dễ</option>
                      <option value="normal">Bình thường</option>
                      <option value="hard">Khó</option>
                    </select>
                  </label>
                </div>
              </>
            )}
          </div>
          <div className="step-controls">
            <button
              className="secondary-button"
              disabled={step === 0}
              onClick={() => setStep(step - 1)}
            >
              <ArrowLeft size={16} /> Quay lại
            </button>
            {step < 3 ? (
              <button
                className="primary-button"
                onClick={() => setStep(step + 1)}
              >
                Tiếp tục <ArrowRight size={17} />
              </button>
            ) : (
              <button
                className="primary-button"
                onClick={launch}
                disabled={!activeSet || launching}
              >
                <Play size={17} fill="currentColor" />
                {launching ? "Đang vào trận…" : "Xác nhận & vào trận"}
              </button>
            )}
          </div>
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
        </div>
        <aside className="surface loadout">
          <span className="eyebrow">CHIẾN BINH CỦA BẠN</span>
          <PonpiPreview
            width={270}
            height={230}
            scale={1.15}
            styleId={inventory?.equippedStyleId}
            outfitId={outfit}
            frameless
            showPoseSelector={false}
          />
          <h3>
            {STORE_CATALOG.find((i) => i.id === outfit)?.title ||
              "pempom nguyên bản"}
          </h3>
          <div className="loadout-row">
            <Map size={17} />
            <span>
              <small>BẢN ĐỒ</small>
              <strong>{MAP_CONFIGS[selectedMap].name}</strong>
            </span>
          </div>
          <div className="loadout-row">
            <Zap size={17} />
            <span>
              <small>ĐẠN</small>
              <strong>
                {STORE_CATALOG.find((i) => i.id === bullet)?.title}
              </strong>
            </span>
          </div>
          <div className="loadout-row">
            <BookOpen size={17} />
            <span>
              <small>TÀI LIỆU</small>
              <strong>{activeSet?.title || "Chưa chọn"}</strong>
            </span>
          </div>
          <p>
            {isGuest ? 'Gõ đúng từ để bắn. Đăng nhập Google để lưu tiến trình và nhận phần thưởng từ các trận tiếp theo.' : 'Gõ đúng từ để bắn. Dùng phím số 1–3 để kích hoạt kỹ năng đã trang bị.'}
          </p>
        </aside>
      </div>
    </div>
  );
};
