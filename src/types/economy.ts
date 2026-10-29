export type StoreCategory = 'style' | 'skill' | 'outfit';

export interface StoreItem {
  id: string;
  category: StoreCategory;
  title: string;
  description: string;
  priceCoins: number;
  previewKey: string;
  effectId?: string;
  color?: string;
  iconUrl?: string;
}

export interface Inventory {
  profileId: string;
  ownedItemIds: string[];
  equippedStyleId: string;          // 'style_yellow' by default
  equippedSkillIds: string[];       // 0..3, owned, unique
  equippedOutfitId?: string | null; // null or 'outfit_ninja'
  equippedBulletId?: string | null; // e.g. 'bullet_missile'
  equippedHatId?: string | null;    // backward compatibility
  equippedShirtId?: string | null;  // backward compatibility
  ammoCounts?: Record<string, number>; // ammo inventory: e.g. bullet_slow: 1000
}

export interface Wallet {
  profileId: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
}

export interface LedgerEntry {
  id: string;
  profileId: string;
  kind: 'earn' | 'spend' | 'onboarding';
  amount: number;
  referenceId: string;
  at: string;
}
