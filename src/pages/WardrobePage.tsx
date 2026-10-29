import React, { useState } from 'react';
import { useApp } from '../app/appStore';
import { equipItem, unequipItem } from '../economy/inventory';
import { STORE_CATALOG } from '../config/catalog';
import { PaperPanel } from '../components/PaperPanel';
import { StickerButton } from '../components/StickerButton';
import { PonpiPreview } from '../components/PonpiPreview';
import { StoreCategory } from '../types/economy';
import { getAssetUrl } from '../utils/assetUrl';
import { playWeaponShootSound } from '../utils/soundEffects';
import { ArrowLeft, Play, Shirt, ShoppingBag, X } from 'lucide-react';

export const WardrobePage: React.FC = () => {
  const { navigateTo, inventory, refreshUserData } = useApp();
  const [activeTab, setActiveTab] = useState<StoreCategory>('style');

  const ownedItems = STORE_CATALOG.filter(
    (item) => inventory?.ownedItemIds.includes(item.id) && item.category === activeTab
  );

  const handleEquip = async (itemId: string) => {
    if (activeTab === 'skill') {
      playWeaponShootSound(itemId, true);
    }
    await equipItem(activeTab, itemId);
    await refreshUserData();
  };

  const handleUnequip = async (category: StoreCategory, skillId?: string) => {
    await unequipItem(category, skillId);
    await refreshUserData();
  };

  const equippedOutfit = STORE_CATALOG.find((i) => i.id === inventory?.equippedOutfitId);
  const equippedStyle = STORE_CATALOG.find((i) => i.id === inventory?.equippedStyleId) || STORE_CATALOG.find((i) => i.id === 'style_yellow');
  const equippedBullet =
    STORE_CATALOG.find((i) => i.id === inventory?.equippedBulletId) ||
    STORE_CATALOG.find((i) => (inventory?.equippedBulletId === 'normal' || !inventory?.equippedBulletId) && i.id === 'bullet_default') ||
    STORE_CATALOG.find((i) => inventory?.equippedBulletId === 'slow_shot' && i.id === 'skill_slow_shot') ||
    STORE_CATALOG.find((i) => i.id === 'bullet_default') ||
    STORE_CATALOG.find((i) => i.id === 'bullet_missile');
  const equippedSkills = (inventory?.equippedSkillIds || [])
    .map((id) => STORE_CATALOG.find((i) => i.id === id))
    .filter(Boolean);

  return (
    <div
      className="notebook-grid-bg app-page"
      style={{
        minHeight: '100vh',
        padding: '30px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div style={{ width: '100%', maxWidth: '850px' }}>
        {/* Top Header */}
        <div className="doodle-toolbar">
          <div style={{ display: 'flex', gap: '10px' }}>
            <StickerButton variant="accent" size="sm" onClick={() => navigateTo('store')} icon={<ShoppingBag size={16} />}>
              Store
            </StickerButton>
            <StickerButton variant="primary" size="sm" onClick={() => navigateTo('prepare')} icon={<Play fill="var(--color-ink)" size={16} />}>
              Vào trận
            </StickerButton>
          </div>
        </div>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 900, marginBottom: '6px' }}>
          Tủ đồ
        </h1>
        <p style={{ color: 'var(--color-muted-ink)', marginBottom: '24px' }}>
          Chọn trang phục và trang bị.
        </p>

        {/* Main Grid: Preview on Left + Equipment Slots on Right */}
        <div className="mobile-stack-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '20px' }}>
          {/* Left: Interactive Rig Preview */}
          <PaperPanel style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>
            <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: '12px', color: 'var(--color-muted-ink)' }}>
              XEM 5 HƯỚNG BẮN CỦA pempom
            </div>

            <PonpiPreview
              styleId={inventory?.equippedStyleId}
              outfitId={inventory?.equippedOutfitId}
              bulletId={inventory?.equippedBulletId || 'bullet_missile'}
              scale={1.25}
              width={240}
              height={240}
              showPoseSelector={true}
            />

            {/* Currently Equipped Summary */}
            <div
              style={{
                marginTop: '16px',
                width: '100%',
                backgroundColor: 'var(--color-paper)',
                border: '1.5px solid var(--color-ink)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                fontSize: '0.85rem',
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: '6px' }}>Đang Trang Bị:</div>
              <div>• Trang phục: <strong>{equippedOutfit ? equippedOutfit.title : 'Mặc định (pempom Vàng)'}</strong></div>
              <div>• Màu sắc: <strong>{equippedStyle ? equippedStyle.title : 'Golden Sun (Vàng)'}</strong></div>
              <div>
                • Đạn bắn chính: <strong>{equippedBullet ? equippedBullet.title : 'Tên Lửa Hỏa Tiễn (Rocket)'}</strong>
              </div>
              <div>
                • Kỹ năng ({equippedSkills.length}/3):{' '}
                <strong>{equippedSkills.map((s) => s?.title).join(', ') || 'Chưa có'}</strong>
              </div>
            </div>
          </PaperPanel>

          {/* Right: Wardrobe Slots & Selection */}
          <PaperPanel>
            {/* Category Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
              <StickerButton
                size="sm"
                variant={activeTab === 'style' ? 'primary' : 'default'}
                onClick={() => setActiveTab('style')}
              >
                Thay Màu (Colors)
              </StickerButton>
              <StickerButton
                size="sm"
                variant={activeTab === 'skill' ? 'primary' : 'default'}
                onClick={() => setActiveTab('skill')}
              >
                Thay Đạn (Bullets)
              </StickerButton>
              <StickerButton
                size="sm"
                variant={activeTab === 'outfit' ? 'primary' : 'default'}
                onClick={() => setActiveTab('outfit')}
              >
                Thay Trang Phục (Outfits)
              </StickerButton>
            </div>

            {/* Active Items in this category */}
            <div style={{ minHeight: '260px' }}>
              {ownedItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-muted-ink)' }}>
                  <p>Bạn chưa sở hữu món đồ nào trong danh mục này.</p>
                  <div style={{ marginTop: '12px' }}>
                    <StickerButton variant="accent" size="sm" onClick={() => navigateTo('store')}>
                      Đến Cửa Hàng Mua Ngay
                    </StickerButton>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                  {ownedItems.map((item) => {
                    const isEquipped =
                      (activeTab === 'outfit' && inventory?.equippedOutfitId === item.id) ||
                      (activeTab === 'style' && inventory?.equippedStyleId === item.id) ||
                      (activeTab === 'skill' && (
                        inventory?.equippedBulletId === item.id ||
                        (item.id === 'bullet_default' && (inventory?.equippedBulletId === 'normal' || !inventory?.equippedBulletId)) ||
                        (item.id === 'skill_slow_shot' && inventory?.equippedBulletId === 'slow_shot') ||
                        (inventory?.equippedSkillIds || []).includes(item.id)
                      ));

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (activeTab === 'skill') {
                            playWeaponShootSound(item.id, true);
                          }
                        }}
                        style={{
                          padding: '12px',
                          cursor: activeTab === 'skill' ? 'pointer' : 'default',
                          backgroundColor: isEquipped ? '#FFF0F5' : 'var(--color-paper)',
                          border: isEquipped ? '2.5px solid var(--color-ponpi-pink)' : '1.5px solid var(--color-ink)',
                          borderRadius: 'var(--radius-md)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            {item.iconUrl ? (
                              <img
                                src={getAssetUrl(item.iconUrl)}
                                alt={item.title}
                                style={{
                                  width: '26px',
                                  height: '26px',
                                  objectFit: 'contain',
                                  display: 'inline-block',
                                }}
                              />
                            ) : (
                              <span
                                style={{
                                  width: '16px',
                                  height: '16px',
                                  borderRadius: '50%',
                                  backgroundColor: item.color || '#FFD47D',
                                  border: '1px solid var(--color-ink)',
                                  display: 'inline-block',
                                }}
                              />
                            )}
                            {isEquipped && (
                              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#E06C96' }}>
                                ✓ Đang trang bị
                              </span>
                            )}
                          </div>

                          <div style={{ fontWeight: 800, marginTop: '6px', fontSize: '1rem', fontFamily: 'var(--font-english)' }}>
                            {item.title}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted-ink)', marginTop: '2px', fontFamily: 'var(--font-vietnamese)' }}>
                            {item.description}
                          </div>
                        </div>

                        <div style={{ marginTop: '12px' }}>
                          {isEquipped ? (
                            activeTab !== 'style' && (
                              <StickerButton
                                size="sm"
                                variant="danger"
                                onClick={() => handleUnequip(activeTab, item.id)}
                                style={{ width: '100%' }}
                              >
                                Tháo Đồ Ra
                              </StickerButton>
                            )
                          ) : (
                            <StickerButton
                              variant="mint"
                              size="sm"
                              onClick={() => handleEquip(item.id)}
                              style={{ width: '100%' }}
                            >
                              Trang Bị Món Này
                            </StickerButton>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Unequip Default Button */}
            {(activeTab === 'outfit' && inventory?.equippedOutfitId) && (
              <div style={{ marginTop: '16px', borderTop: '1px dashed var(--color-grid)', paddingTop: '12px' }}>
                <StickerButton size="sm" onClick={() => handleUnequip('outfit')}>
                  Tháo Trang Phục (Về pempom Vàng Mặc Định)
                </StickerButton>
              </div>
            )}
          </PaperPanel>
        </div>
      </div>
    </div>
  );
};
