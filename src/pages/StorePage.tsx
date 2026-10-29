import React, { useState } from "react";
import { ArrowRight, Check, Coins, ShoppingBag, Sparkles } from "lucide-react";
import { useApp } from "../app/appStore";
import { useAuth } from "../auth/AuthContext";
import { STORE_CATALOG } from "../config/catalog";
import { StoreCategory, StoreItem } from "../types/economy";
import { buyStoreItem, equipItem } from "../economy/inventory";
import { PonpiPreview } from "../components/PonpiPreview";
import { getAssetUrl } from "../utils/assetUrl";
import { playWeaponShootSound } from "../utils/soundEffects";

export const StorePage: React.FC = () => {
  const { account } = useAuth();
  const { navigateTo, inventory, refreshUserData } = useApp();
  const [tab, setTab] = useState<StoreCategory>("outfit");
  const [preview, setPreview] = useState<StoreItem | null>(null);
  const [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const items = STORE_CATALOG.filter((i) => i.category === tab);
  const action = async (item: StoreItem) => {
    if (!account) {
      navigateTo("account");
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      if (inventory?.ownedItemIds.includes(item.id)) {
        if (item.category === "skill") {
          playWeaponShootSound(item.id, true);
        }
        await equipItem(item.category, item.id);
        setNotice(`Đã trang bị ${item.title}.`);
      } else {
        await buyStoreItem(item.id);
        setNotice(`Đã mua ${item.title}. Chọn Trang bị để sử dụng.`);
      }
      await refreshUserData();
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const equipped = (i: StoreItem) =>
    i.id === inventory?.equippedOutfitId ||
    i.id === inventory?.equippedStyleId ||
    i.id === inventory?.equippedBulletId ||
    (i.id === "skill_slow_shot" && inventory?.equippedBulletId === "slow_shot");
  return (
    <div className="portal-page">
      <div className="page-heading">
        <h1>Store</h1>
        <p>Trang phục, màu sắc & kỹ năng.</p>
      </div>
      <div className="store-layout">
        <div>
          <div className="pill-tabs">
            {[
              { id: "outfit", label: "Tướng & trang phục" },
              { id: "skill", label: "Đạn & kỹ năng" },
              { id: "style", label: "Màu sắc" },
            ].map((t) => (
              <button
                key={t.id}
                className={tab === t.id ? "active" : ""}
                onClick={() => {
                  setTab(t.id as StoreCategory);
                  setPreview(null);
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          {notice && (
            <p className="notice" role="status">
              {notice}
            </p>
          )}
          <div className="store-grid">
            {items.map((i) => {
              const owned =
                inventory?.ownedItemIds.includes(i.id) && Boolean(account);
              return (
                <article
                  key={i.id}
                  className={`store-item ${preview?.id === i.id ? "selected" : ""}`}
                >
                  <button
                    className="item-preview-button"
                    onClick={() => {
                      setPreview(i);
                      if (i.category === "skill") {
                        playWeaponShootSound(i.id, true);
                      }
                    }}
                    aria-label={`Thử ${i.title}`}
                  >
                    <span
                      className="item-stage"
                      style={
                        {
                          "--item-color": i.color || "#8daa75",
                        } as React.CSSProperties
                      }
                    >
                      {i.iconUrl ? (
                        <img src={getAssetUrl(i.iconUrl)} alt="" />
                      ) : (
                        <span
                          className="color-swatch"
                          style={{ background: i.color }}
                        />
                      )}
                    </span>
                    <h3>{i.title}</h3>
                  </button>
                  <p>{i.description}</p>
                  <div className="item-price">
                    {owned ? (
                      <span>
                        <Check size={13} /> Đã sở hữu
                      </span>
                    ) : (
                      <span>
                        <Coins size={15} /> {i.priceCoins} xu
                      </span>
                    )}
                    <button
                      className={
                        equipped(i) && owned
                          ? "text-button"
                          : "secondary-button"
                      }
                      onClick={() => action(i)}
                      disabled={busy || Boolean(equipped(i) && owned)}
                    >
                      {equipped(i) && owned
                        ? "Đang dùng"
                        : owned
                          ? "Trang bị"
                          : "Mua"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
        <aside className="surface store-preview">
          <span className="eyebrow">
            <Sparkles size={14} /> THỬ TRƯỚC KHI CHỌN
          </span>
          <PonpiPreview
            width={270}
            height={240}
            scale={1.2}
            styleId={
              preview?.category === "style"
                ? preview.id
                : inventory?.equippedStyleId
            }
            outfitId={
              preview?.category === "outfit"
                ? preview.id
                : inventory?.equippedOutfitId
            }
            bulletId={
              preview?.category === "skill"
                ? preview.id
                : inventory?.equippedBulletId
            }
            frameless
            showPoseSelector={false}
          />
          <h3>{preview?.title || "Chiến binh của bạn"}</h3>
          <p>
            {preview
              ? "Bản xem thử. Bấm Trang bị để dùng trong trận."
              : "Chạm vào vật phẩm để xem thử diện mạo mới."}
          </p>
          <button
            className="secondary-button"
            onClick={() => navigateTo("account")}
          >
            <ShoppingBag size={16} /> Mua thêm xu <ArrowRight size={15} />
          </button>
          <button
            className="text-button"
            onClick={() => navigateTo("wardrobe")}
          >
            Tùy chỉnh trang bị đang có <ArrowRight size={14} />
          </button>
        </aside>
      </div>
    </div>
  );
};
