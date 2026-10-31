import type { Inventory } from '../types/economy';
import { SEED_ENTRIES, SEED_WORD_SETS } from '../data/seedWordSets';

export const BASIC_SET_IDS = ['set_oxford_a1', 'set_oxford_a2'] as const;
export const BASIC_MAP_ID = 'default' as const;
export const BASIC_MODE = 'copy' as const;

export function isBasicSet(id: string): boolean {
  return BASIC_SET_IDS.some(setId => setId === id);
}

// The free starter lessons remain available even when published lessons change.
export function getBasicSets() {
  return SEED_WORD_SETS.filter(set => isBasicSet(set.id));
}

export function getBasicWords(setId: string) {
  return isBasicSet(setId) ? SEED_ENTRIES.filter(word => word.setId === setId) : [];
}

export function isGuestRoute(route: string): boolean {
  return ['home', 'library', 'prepare', 'battle', 'results', 'account'].includes(route);
}

export function createGuestInventory(): Inventory {
  return {
    profileId: 'guest_profile',
    ownedItemIds: ['style_yellow', 'bullet_default'],
    equippedStyleId: 'style_yellow',
    equippedBulletId: 'bullet_default',
    equippedSkillIds: [],
    equippedOutfitId: null,
    equippedHatId: null,
    equippedShirtId: null,
  };
}
