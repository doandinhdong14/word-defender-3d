import React, { useState } from 'react';
import {
  ArrowLeft,
  Check,
  Coins,
  Shield,
  ShoppingBag,
  Sparkles,
  Swords,
  Zap,
} from 'lucide-react';
import { useApp } from '../app/appStore';
import { useAuth } from '../auth/AuthContext';
import { STORE_CATALOG } from '../config/catalog';
import { StoreCategory, StoreItem } from '../types/economy';
import { buyStoreItem, equipItem, unequipItem } from '../economy/inventory';
import { PonpiPreview } from './PonpiPreview';
import { getAssetUrl } from '../utils/assetUrl';
import { playWeaponShootSound } from '../utils/soundEffects';
import '../styles/moba-hub.css';

interface MobaGameHubProps {
  initialTab?: 'hero' | 'loadout' | 'store';
}

export const MobaGameHub: React.FC<MobaGameHubProps> = ({ initialTab = 'hero' }) => {
  const { account } = useAuth();
  const { navigateTo, inventory, wallet, refreshUserData } = useApp();

  const [activeTab, setActiveTab] = useState<'hero' | 'loadout' | 'store'>(initialTab);
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);
  const [gearSlot, setGearSlot] = useState<StoreCategory>('skill');
  const [subFilter, setSubFilter] = useState<string>('all');
  const [notice, setNotice] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);

  // Equipped references
  const equippedOutfit = STORE_CATALOG.find((i) => i.id === inventory?.equippedOutfitId);
  const equippedStyle = STORE_CATALOG.find((i) => i.id === inventory?.equippedStyleId) || STORE_CATALOG.find((i) => i.id === 'style_yellow');
  const equippedBullet =
    STORE_CATALOG.find((i) => i.id === inventory?.equippedBulletId) ||
    STORE_CATALOG.find((i) => (inventory?.equippedBulletId === 'normal' || !inventory?.equippedBulletId) && i.id === 'bullet_default') ||
    STORE_CATALOG.find((i) => inventory?.equippedBulletId === 'slow_shot' && i.id === 'skill_slow_shot') ||
    STORE_CATALOG.find((i) => i.id === 'bullet_default');

  // Active inspected item fallback
  const previewOutfitId = selectedItem?.category === 'outfit' ? selectedItem.id : inventory?.equippedOutfitId;
  const previewStyleId = selectedItem?.category === 'style' ? selectedItem.id : inventory?.equippedStyleId || 'style_yellow';
  const previewBulletId = selectedItem?.category === 'skill' ? selectedItem.id : inventory?.equippedBulletId || 'bullet_default';

  // Action: Equip or Buy
  const handleItemAction = async (item: StoreItem) => {
    if (!account) {
      navigateTo('account');
      return;
    }
    if (busy) return;
    setBusy(true);

    try {
      const isOwned = inventory?.ownedItemIds.includes(item.id) || item.priceCoins === 0;

      if (isOwned) {
        if (item.category === 'skill') {
          playWeaponShootSound(item.id, true);
        }
        await equipItem(item.category, item.id);
        setNotice(`Đã trang bị: ${item.title}`);
      } else {
        await buyStoreItem(item.id);
        await equipItem(item.category, item.id);
        setNotice(`Đã mua & trang bị: ${item.title}`);
      }
      await refreshUserData();
    } catch (err) {
      setNotice((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleUnequipAction = async (category: StoreCategory, id?: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await unequipItem(category, id);
      setNotice(`Đã tháo trang bị.`);
      await refreshUserData();
    } catch (err) {
      setNotice((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Filter items for Roster, Loadout, or Store
  const getDisplayItems = () => {
    if (activeTab === 'hero') {
      const outfits = STORE_CATALOG.filter((i) => i.category === 'outfit');
      if (subFilter === 'owned') {
        return outfits.filter((i) => inventory?.ownedItemIds.includes(i.id));
      }
      return outfits;
    }

    if (activeTab === 'loadout') {
      return STORE_CATALOG.filter(
        (i) => i.category === gearSlot && (inventory?.ownedItemIds.includes(i.id) || i.priceCoins === 0)
      );
    }

    // Store tab
    let items = STORE_CATALOG;
    if (subFilter === 'outfit') items = items.filter((i) => i.category === 'outfit');
    else if (subFilter === 'skill') items = items.filter((i) => i.category === 'skill');
    else if (subFilter === 'style') items = items.filter((i) => i.category === 'style');
    return items;
  };

  const displayItems = getDisplayItems();

  const isCurrentEquipped = (item: StoreItem) => {
    if (item.category === 'outfit') return inventory?.equippedOutfitId === item.id;
    if (item.category === 'style') return inventory?.equippedStyleId === item.id;
    if (item.category === 'skill') {
      return (
        inventory?.equippedBulletId === item.id ||
        (item.id === 'bullet_default' && (!inventory?.equippedBulletId || inventory?.equippedBulletId === 'normal')) ||
        (item.id === 'skill_slow_shot' && inventory?.equippedBulletId === 'slow_shot')
      );
    }
    return false;
  };

  return (
    <div className="moba-hub notebook-grid-bg">
      <div className="moba-container">
        {/* TOP MOBA APP BAR */}
        <header className="moba-top-bar">
          <button className="moba-back-btn" onClick={() => navigateTo('home')}>
            <ArrowLeft size={16} />
            <span>Sảnh</span>
          </button>

          {/* 3 PRIMARY MOBA TABS */}
          <nav className="moba-nav-tabs" aria-label="MOBA Navigation">
            <button
              className={`moba-tab-btn ${activeTab === 'hero' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('hero');
                setSelectedItem(null);
                setSubFilter('all');
              }}
            >
              <Shield size={16} />
              <span>TƯỚNG</span>
            </button>
            <button
              className={`moba-tab-btn ${activeTab === 'loadout' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('loadout');
                setSelectedItem(null);
                setGearSlot('skill');
              }}
            >
              <Swords size={16} />
              <span>TRANG BỊ</span>
            </button>
            <button
              className={`moba-tab-btn ${activeTab === 'store' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('store');
                setSelectedItem(null);
                setSubFilter('all');
              }}
            >
              <ShoppingBag size={16} />
              <span>CỬA HÀNG</span>
            </button>
          </nav>

          {/* RIGHT WALLET DISPLAY */}
          <div className="moba-wallet-badge">
            <Coins size={16} />
            <span>{(wallet?.balance || 0).toLocaleString('vi-VN')}</span>
          </div>
        </header>

        {notice && (
          <div className="moba-notice" role="status">
            {notice}
          </div>
        )}

        {/* MAIN 2-COLUMN MOBA GRID */}
        <div className="moba-stage-grid">
          {/* LEFT: HERO SPOTLIGHT STAGE */}
          <section className="moba-hero-spotlight">
            <div className="moba-pedestal-glow" />

            <PonpiPreview
              width={260}
              height={250}
              scale={1.35}
              styleId={previewStyleId}
              outfitId={previewOutfitId}
              bulletId={previewBulletId}
              frameless
              showPoseSelector={false}
            />

            <div className="moba-hero-info">
              <h2 className="moba-hero-title">
                {selectedItem ? selectedItem.title : equippedOutfit?.title || 'pempom Vàng'}
              </h2>
              <span className="moba-role-tag">XẠ THỦ · CƠ ĐỘNG</span>
            </div>

            {/* MOBA ATTRIBUTE METERS */}
            <div className="moba-stat-bars">
              <div className="moba-stat-row">
                <span className="moba-stat-label">⚔️ Công kích</span>
                <div className="moba-stat-track">
                  <div className="moba-stat-fill" style={{ width: '85%', background: '#E74C3C' }} />
                </div>
              </div>
              <div className="moba-stat-row">
                <span className="moba-stat-label">⚡ Tốc đánh</span>
                <div className="moba-stat-track">
                  <div className="moba-stat-fill" style={{ width: '92%', background: '#F39C12' }} />
                </div>
              </div>
              <div className="moba-stat-row">
                <span className="moba-stat-label">🛡️ Sinh mệnh</span>
                <div className="moba-stat-track">
                  <div className="moba-stat-fill" style={{ width: '75%', background: '#27AE60' }} />
                </div>
              </div>
              <div className="moba-stat-row">
                <span className="moba-stat-label">🎯 Khống chế</span>
                <div className="moba-stat-track">
                  <div className="moba-stat-fill" style={{ width: '80%', background: '#2980B9' }} />
                </div>
              </div>
            </div>

            {/* MOBA ABILITIES ROW (Q - W - E - R) */}
            <div className="moba-ability-row">
              <div className="moba-ability-socket" title="Nội tại: Tụ Lực Gõ Nhanh">
                <span>⚡</span>
                <span className="moba-ability-key">P</span>
              </div>
              <div className="moba-ability-socket" title="Chiêu 1: Băng Tiễn Làm Chậm">
                <span>❄️</span>
                <span className="moba-ability-key">Q</span>
              </div>
              <div className="moba-ability-socket" title="Chiêu 2: Hỏa Tiễn Tầm Nhiệt">
                <span>🚀</span>
                <span className="moba-ability-key">W</span>
              </div>
              <div className="moba-ability-socket" title="Tuyệt Kỹ: Bão Băng Toàn Sân">
                <span>✨</span>
                <span className="moba-ability-key">R</span>
              </div>
            </div>

            {/* CTA BUTTON */}
            {selectedItem ? (
              <button
                className={`moba-hero-action-btn ${isCurrentEquipped(selectedItem) ? 'active' : 'primary'}`}
                onClick={() => handleItemAction(selectedItem)}
                disabled={busy || isCurrentEquipped(selectedItem)}
              >
                {isCurrentEquipped(selectedItem) ? (
                  <>
                    <Check size={18} /> Đang Dùng
                  </>
                ) : inventory?.ownedItemIds.includes(selectedItem.id) || selectedItem.priceCoins === 0 ? (
                  'Trang Bị Ngay'
                ) : (
                  <>
                    <Coins size={18} /> Mua ({selectedItem.priceCoins} xu)
                  </>
                )}
              </button>
            ) : (
              <button
                className="moba-hero-action-btn primary"
                onClick={() => navigateTo('prepare')}
              >
                <Swords size={18} /> Vào Trận Ngay
              </button>
            )}
          </section>

          {/* RIGHT: CONTENT PANEL */}
          <section className="moba-content-panel">
            {/* TAB: TƯỚNG (HEROES / SKINS) */}
            {activeTab === 'hero' && (
              <>
                <div className="moba-sub-filters">
                  <button
                    className={`moba-filter-pill ${subFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setSubFilter('all')}
                  >
                    Tất Cả
                  </button>
                  <button
                    className={`moba-filter-pill ${subFilter === 'owned' ? 'active' : ''}`}
                    onClick={() => setSubFilter('owned')}
                  >
                    Đã Có
                  </button>
                </div>

                <div className="moba-cards-grid">
                  {displayItems.map((item) => {
                    const owned = inventory?.ownedItemIds.includes(item.id) || item.priceCoins === 0;
                    const equipped = isCurrentEquipped(item);
                    const selected = selectedItem?.id === item.id;

                    return (
                      <article
                        key={item.id}
                        className={`moba-card ${selected ? 'selected' : ''}`}
                        onClick={() => setSelectedItem(item)}
                      >
                        <div className="moba-card-icon-frame">
                          {item.iconUrl ? (
                            <img src={getAssetUrl(item.iconUrl)} alt={item.title} />
                          ) : (
                            <span
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                backgroundColor: item.color || '#FFD47D',
                              }}
                            />
                          )}
                        </div>
                        <h4 className="moba-card-title">{item.title}</h4>
                        {equipped ? (
                          <span className="moba-card-badge equipped">✓ Đang Dùng</span>
                        ) : owned ? (
                          <span className="moba-card-badge owned">Đã Có</span>
                        ) : (
                          <span className="moba-card-badge price">{item.priceCoins} xu</span>
                        )}
                      </article>
                    );
                  })}
                </div>
              </>
            )}

            {/* TAB: TRANG BỊ (6-SLOT MOBA LOADOUT) */}
            {activeTab === 'loadout' && (
              <>
                {/* 6-Slot Grid */}
                <div className="moba-loadout-slots">
                  <div
                    className={`moba-gear-slot ${gearSlot === 'skill' ? 'active' : ''} filled`}
                    onClick={() => setGearSlot('skill')}
                  >
                    <span className="moba-gear-slot-label">VŨ KHÍ CHÍNH</span>
                    <span className="moba-gear-slot-val">{equippedBullet?.title || 'Kẹo Tròn'}</span>
                  </div>

                  <div
                    className={`moba-gear-slot ${gearSlot === 'outfit' ? 'active' : ''} ${equippedOutfit ? 'filled' : ''}`}
                    onClick={() => setGearSlot('outfit')}
                  >
                    <span className="moba-gear-slot-label">CHIẾN BÀO</span>
                    <span className="moba-gear-slot-val">{equippedOutfit?.title || 'Mặc Định'}</span>
                  </div>

                  <div
                    className={`moba-gear-slot ${gearSlot === 'style' ? 'active' : ''} filled`}
                    onClick={() => setGearSlot('style')}
                  >
                    <span className="moba-gear-slot-label">NGỌC MÀU</span>
                    <span className="moba-gear-slot-val">{equippedStyle?.title || 'Golden Sun'}</span>
                  </div>
                </div>

                {/* Backpack Grid for selected gear slot */}
                <div className="moba-cards-grid">
                  {displayItems.map((item) => {
                    const equipped = isCurrentEquipped(item);
                    const selected = selectedItem?.id === item.id;

                    return (
                      <article
                        key={item.id}
                        className={`moba-card ${selected ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedItem(item);
                          if (item.category === 'skill') {
                            playWeaponShootSound(item.id, true);
                          }
                        }}
                      >
                        <div className="moba-card-icon-frame">
                          {item.iconUrl ? (
                            <img src={getAssetUrl(item.iconUrl)} alt={item.title} />
                          ) : (
                            <span
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                backgroundColor: item.color || '#FFD47D',
                              }}
                            />
                          )}
                        </div>
                        <h4 className="moba-card-title">{item.title}</h4>
                        {equipped ? (
                          <span className="moba-card-badge equipped">✓ Đang Lắp</span>
                        ) : (
                          <span className="moba-card-badge owned">Sẵn Sàng</span>
                        )}
                      </article>
                    );
                  })}
                </div>

                {/* Unequip Option */}
                {gearSlot === 'outfit' && inventory?.equippedOutfitId && (
                  <button
                    className="moba-filter-pill"
                    style={{ alignSelf: 'center', marginTop: '8px' }}
                    onClick={() => handleUnequipAction('outfit')}
                  >
                    Tháo Chiến Bào (Về Mặc Định)
                  </button>
                )}
              </>
            )}

            {/* TAB: CỬA HÀNG (MOBA STORE) */}
            {activeTab === 'store' && (
              <>
                <div className="moba-sub-filters">
                  <button
                    className={`moba-filter-pill ${subFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setSubFilter('all')}
                  >
                    Tất Cả
                  </button>
                  <button
                    className={`moba-filter-pill ${subFilter === 'outfit' ? 'active' : ''}`}
                    onClick={() => setSubFilter('outfit')}
                  >
                    Tướng & Skin
                  </button>
                  <button
                    className={`moba-filter-pill ${subFilter === 'skill' ? 'active' : ''}`}
                    onClick={() => setSubFilter('skill')}
                  >
                    Vũ Khí & Đạn
                  </button>
                  <button
                    className={`moba-filter-pill ${subFilter === 'style' ? 'active' : ''}`}
                    onClick={() => setSubFilter('style')}
                  >
                    Màu Sắc
                  </button>
                </div>

                <div className="moba-cards-grid">
                  {displayItems.map((item) => {
                    const owned = inventory?.ownedItemIds.includes(item.id) || item.priceCoins === 0;
                    const equipped = isCurrentEquipped(item);
                    const selected = selectedItem?.id === item.id;

                    return (
                      <article
                        key={item.id}
                        className={`moba-card ${selected ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedItem(item);
                          if (item.category === 'skill') {
                            playWeaponShootSound(item.id, true);
                          }
                        }}
                      >
                        <div className="moba-card-icon-frame">
                          {item.iconUrl ? (
                            <img src={getAssetUrl(item.iconUrl)} alt={item.title} />
                          ) : (
                            <span
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                backgroundColor: item.color || '#FFD47D',
                              }}
                            />
                          )}
                        </div>
                        <h4 className="moba-card-title">{item.title}</h4>
                        {equipped ? (
                          <span className="moba-card-badge equipped">✓ Đang Dùng</span>
                        ) : owned ? (
                          <span className="moba-card-badge owned">Đã Có</span>
                        ) : (
                          <span className="moba-card-badge price">{item.priceCoins} xu</span>
                        )}
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
