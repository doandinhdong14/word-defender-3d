import { describe, it, expect, beforeEach } from 'vitest';
import { STORE_CATALOG, DEFAULT_INVENTORY_SEED } from '../../config/catalog';
import {
  getStyleColor,
  getSpriteForOutfit,
  CORAL_SPRITE_URLS,
  FOOTBALL_SPRITE_URLS,
  MUSICIAN_SPRITE_URLS,
  HACKER_SPRITE_URLS,
  SHINOBI_SPRITE_URLS,
  DINO_SPRITE_URLS,
  BANANA_CAT_SPRITE_URLS,
  BOBA_RABBIT_SPRITE_URLS,
  TEDDY_BEAR_SPRITE_URLS,
  HUNTER_SPRITE_URLS,
  HALLOWEEN_SPRITE_URLS,
  BASKETBALL_SPRITE_URLS,
  SOCCER_SPRITE_URLS,
  BUILDER_SPRITE_URLS,
  GLADIATOR_SPRITE_URLS,
} from '../../game/assets/PonpiRenderer';
import { equipItem, unequipItem } from '../../economy/inventory';
import { db } from '../../data/db';

describe('New Skins & Color Customization', () => {
  const brandNewSkinIds = [
    'outfit_coral',
    'outfit_football',
    'outfit_musician',
    'outfit_hacker',
    'outfit_shinobi',
    'outfit_dino',
    'outfit_banana_cat',
    'outfit_boba_rabbit',
    'outfit_teddy_bear',
    'outfit_hunter',
  ];

  const allSkinIds = [
    ...brandNewSkinIds,
    'outfit_halloween',
    'outfit_basketball',
    'outfit_soccer',
    'outfit_builder',
    'outfit_gladiator',
  ];

  it('contains all new skins in STORE_CATALOG with valid properties', () => {
    for (const skinId of brandNewSkinIds) {
      const item = STORE_CATALOG.find((i) => i.id === skinId);
      expect(item).toBeDefined();
      expect(item?.category).toBe('outfit');
      expect(item?.title.length).toBeGreaterThan(0);
      expect(item?.description.length).toBeGreaterThan(0);
      expect(item?.priceCoins).toBeGreaterThan(0);
      expect(item?.iconUrl).toBeDefined();
    }
  });

  it('contains Purple and Lavender color styles in STORE_CATALOG', () => {
    const lavender = STORE_CATALOG.find((i) => i.id === 'style_lavender');
    const purple = STORE_CATALOG.find((i) => i.id === 'style_purple');
    expect(lavender).toBeDefined();
    expect(purple).toBeDefined();

    expect(getStyleColor('style_lavender')).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(getStyleColor('style_purple')).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('provides all 6 action pose URLs for all new skins', () => {
    const maps = [
      CORAL_SPRITE_URLS,
      FOOTBALL_SPRITE_URLS,
      MUSICIAN_SPRITE_URLS,
      HACKER_SPRITE_URLS,
      SHINOBI_SPRITE_URLS,
      DINO_SPRITE_URLS,
      BANANA_CAT_SPRITE_URLS,
      BOBA_RABBIT_SPRITE_URLS,
      TEDDY_BEAR_SPRITE_URLS,
      HUNTER_SPRITE_URLS,
      HALLOWEEN_SPRITE_URLS,
      BASKETBALL_SPRITE_URLS,
      SOCCER_SPRITE_URLS,
      BUILDER_SPRITE_URLS,
      GLADIATOR_SPRITE_URLS,
    ];

    const requiredPoses = ['idle', 'fire_up', 'fire_up_left', 'fire_up_right', 'fire_left', 'fire_right'] as const;

    for (const map of maps) {
      for (const pose of requiredPoses) {
        expect(map[pose]).toBeDefined();
        expect(map[pose].length).toBeGreaterThan(0);
      }
    }
  });

  it('resolves correct sprite elements for all outfits and poses', () => {
    for (const skinId of allSkinIds) {
      const sprite = getSpriteForOutfit(skinId, 'idle');
      expect(sprite).toBeDefined();
      expect(sprite instanceof Image).toBe(true);
    }
  });

  it('allows equipping any of the skins alongside a purple body style', async () => {
    await db.inventories.clear();
    const profileId = 'guest_profile';

    await db.inventories.add({
      profileId,
      ownedItemIds: [
        'style_yellow',
        'style_lavender',
        'style_purple',
        ...allSkinIds,
      ],
      equippedHatId: null,
      equippedShirtId: null,
      equippedStyleId: 'style_yellow',
      equippedSkillIds: [],
    });

    // 1. Equip purple style
    await equipItem('style', 'style_purple');
    let inv = await db.inventories.get(profileId);
    expect(inv?.equippedStyleId).toBe('style_purple');

    // 2. Equip Coral skin
    await equipItem('outfit', 'outfit_coral');
    inv = await db.inventories.get(profileId);
    expect(inv?.equippedOutfitId).toBe('outfit_coral');
    // Confirm body color remains purple!
    expect(inv?.equippedStyleId).toBe('style_purple');

    // 3. Equip Football #10 skin
    await equipItem('outfit', 'outfit_football');
    inv = await db.inventories.get(profileId);
    expect(inv?.equippedOutfitId).toBe('outfit_football');
    expect(inv?.equippedStyleId).toBe('style_purple');

    // 4. Equip Hacker skin
    await equipItem('outfit', 'outfit_hacker');
    inv = await db.inventories.get(profileId);
    expect(inv?.equippedOutfitId).toBe('outfit_hacker');
    expect(inv?.equippedStyleId).toBe('style_purple');

    // 5. Unequip outfit back to default pempom with purple body
    await unequipItem('outfit');
    inv = await db.inventories.get(profileId);
    expect(inv?.equippedOutfitId).toBeNull();
    expect(inv?.equippedStyleId).toBe('style_purple');
  });

  it('includes all new skins and purple styles in DEFAULT_INVENTORY_SEED', () => {
    for (const skinId of brandNewSkinIds) {
      expect(DEFAULT_INVENTORY_SEED.ownedItemIds).toContain(skinId);
    }
    expect(DEFAULT_INVENTORY_SEED.ownedItemIds).toContain('style_lavender');
    expect(DEFAULT_INVENTORY_SEED.ownedItemIds).toContain('style_purple');
  });
});
