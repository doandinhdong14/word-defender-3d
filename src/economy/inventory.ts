import { StoreCategory, StoreItem } from '../types/economy';
import { STORE_CATALOG } from '../config/catalog';
import { db } from '../data/db';
import { getActiveProfileId } from '../auth/authService';

export async function buyStoreItem(itemId: string): Promise<{ success: boolean; newBalance: number }> {
  const profileId = getActiveProfileId();
  const item = STORE_CATALOG.find((i) => i.id === itemId);
  if (!item) {
    throw new Error('Món đồ không tồn tại trong cửa hàng.');
  }

  const referenceId = `purchase-${itemId}`;

  return await db.transaction('rw', [db.wallets, db.inventories, db.ledger], async () => {
    const wallet = await db.wallets.get(profileId);
    if (!wallet) {
      throw new Error('Không tìm thấy ví người dùng.');
    }

    const inventory = await db.inventories.get(profileId);
    if (!inventory) {
      throw new Error('Không tìm thấy kho đồ.');
    }

    // Check if already owned
    if (inventory.ownedItemIds.includes(itemId)) {
      throw new Error('Bạn đã sở hữu món đồ này rồi!');
    }

    // Check funds
    if (wallet.balance < item.priceCoins) {
      throw new Error(`Không đủ xu! Cần ${item.priceCoins} xu nhưng bạn chỉ có ${wallet.balance} xu.`);
    }

    // Deduct coins & add item
    wallet.balance -= item.priceCoins;
    wallet.totalSpent += item.priceCoins;
    inventory.ownedItemIds.push(itemId);

    // Auto-equip if skill and slot is open
    if (item.category === 'skill' && inventory.equippedSkillIds.length < 3 && !inventory.equippedSkillIds.includes(itemId)) {
      inventory.equippedSkillIds.push(itemId);
    }

    const now = new Date().toISOString();
    await db.wallets.put(wallet);
    await db.inventories.put(inventory);
    await db.ledger.add({
      id: `ledger_buy_${Date.now()}_${itemId}`,
      profileId,
      kind: 'spend',
      amount: item.priceCoins,
      referenceId,
      at: now,
    });

    return { success: true, newBalance: wallet.balance };
  });
}

export async function equipItem(category: StoreCategory, itemId: string | null): Promise<void> {
  const profileId = getActiveProfileId();
  const inventory = await db.inventories.get(profileId);
  if (!inventory) return;

  if (itemId !== null && !inventory.ownedItemIds.includes(itemId)) {
    throw new Error('Bạn chưa sở hữu món đồ này.');
  }

  if (category === 'outfit') {
    inventory.equippedOutfitId = itemId;
  } else if (category === 'style') {
    inventory.equippedStyleId = itemId || 'style_yellow';
  } else if (category === 'skill' && itemId) {
    if (itemId.startsWith('bullet_') || itemId === 'skill_slow_shot') {
      inventory.equippedBulletId = itemId === 'skill_slow_shot' ? 'slow_shot' : itemId;
    }
    if (!inventory.equippedSkillIds.includes(itemId)) {
      if (inventory.equippedSkillIds.length >= 3) {
        inventory.equippedSkillIds[2] = itemId; // replace 3rd slot
      } else {
        inventory.equippedSkillIds.push(itemId);
      }
    }
  }

  await db.inventories.put(inventory);
}

export async function unequipItem(category: StoreCategory, skillIdToRemove?: string): Promise<void> {
  const profileId = getActiveProfileId();
  const inventory = await db.inventories.get(profileId);
  if (!inventory) return;

  if (category === 'outfit') {
    inventory.equippedOutfitId = null;
  } else if (category === 'style') {
    inventory.equippedStyleId = 'style_yellow';
  } else if (category === 'skill' && skillIdToRemove) {
    if (inventory.equippedBulletId === skillIdToRemove || (skillIdToRemove === 'skill_slow_shot' && inventory.equippedBulletId === 'slow_shot')) {
      inventory.equippedBulletId = 'bullet_missile';
    }
    inventory.equippedSkillIds = inventory.equippedSkillIds.filter((id) => id !== skillIdToRemove);
  }

  await db.inventories.put(inventory);
}

export async function buyAmmoPack(
  ammoId: string,
  roundsCount = 1000,
  priceCoins = 200
): Promise<{ success: boolean; newBalance: number; newAmmoCount: number }> {
  const profileId = getActiveProfileId();
  return await db.transaction('rw', [db.wallets, db.inventories, db.ledger], async () => {
    const wallet = await db.wallets.get(profileId);
    if (!wallet) throw new Error('Không tìm thấy ví người dùng.');
    const inventory = await db.inventories.get(profileId);
    if (!inventory) throw new Error('Không tìm thấy kho đồ.');

    if (wallet.balance < priceCoins) {
      throw new Error(`Không đủ xu! Cần ${priceCoins} xu nhưng bạn chỉ có ${wallet.balance} xu.`);
    }

    wallet.balance -= priceCoins;
    wallet.totalSpent += priceCoins;

    inventory.ammoCounts = inventory.ammoCounts || {};
    const current = inventory.ammoCounts[ammoId] || 0;
    inventory.ammoCounts[ammoId] = current + roundsCount;

    if (!inventory.ownedItemIds.includes(ammoId)) {
      inventory.ownedItemIds.push(ammoId);
    }

    const now = new Date().toISOString();
    await db.wallets.put(wallet);
    await db.inventories.put(inventory);
    await db.ledger.add({
      id: `ledger_ammo_${Date.now()}_${ammoId}`,
      profileId,
      kind: 'spend',
      amount: priceCoins,
      referenceId: `ammo-${ammoId}-${roundsCount}`,
      at: now,
    });

    return {
      success: true,
      newBalance: wallet.balance,
      newAmmoCount: inventory.ammoCounts[ammoId],
    };
  });
}
