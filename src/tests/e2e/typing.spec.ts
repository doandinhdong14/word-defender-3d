import { expect, test, type Page } from '@playwright/test';

async function enterBattle(page: Page, answer: string, aliases: string[] = []) {
  await page.route('**/api/auth/session', route => route.fulfill({ json: { account: null } }));
  await page.route('**/api/auth/config', route => route.fulfill({ json: { googleEnabled: false } }));
  await page.goto('/');
  await expect(page.getByRole('button', { name: /CHƠI NGAY/ })).toBeVisible();

  // Each browser context has its own database. Keep enemy prompts predictable
  // while exercising the real prepare screen, engine and input handlers.
  await page.evaluate(async ({ english, aliases }) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('PonpiWordBlasterDB');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(['words'], 'readwrite');
        const store = transaction.objectStore('words');
        const request = store.getAll();
        request.onsuccess = () => {
          for (const entry of request.result) {
            if (entry.setId === 'set_oxford_a1' || entry.setId === 'set_everyday') store.put({ ...entry, english, acceptedAnswers: [english, ...aliases] });
          }
        };
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } finally { database.close(); }
  }, { english: answer, aliases });

  await page.getByRole('button', { name: /CHƠI NGAY/ }).click();
  await page.getByRole('button', { name: /Đấu thường/ }).click();
  await expect(page.getByRole('heading', { name: 'Đấu Thường', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'VÀO TRẬN ĐẤU THƯỜNG', exact: true }).click();
  await expect(page.locator('[data-enemy-id]').first()).toBeVisible();
}

test('physical keyboard accepts H and R and held keys cannot start the next answer', async ({ page }) => {
  await enterBattle(page, 'rather');
  const enemy = page.locator('[data-enemy-id]').first();
  const id = await enemy.getAttribute('data-enemy-id');
  await page.keyboard.type('rathe');
  await expect(enemy.locator('span[style*="underline"]')).toHaveText('rathe');
  await page.keyboard.down('r');
  await page.keyboard.down('r');
  await page.keyboard.down('r');
  await page.keyboard.up('r');
  await expect(page.locator(`[data-enemy-id="${id}"]`)).toHaveCount(0);
  await expect(page.locator('[data-enemy-id][data-selected="true"]')).toHaveCount(0);
});

test('copy mode finishes the displayed word instead of a shorter alias', async ({ page }) => {
  await enterBattle(page, 'laboratory', ['lab']);
  const enemy = page.locator('[data-enemy-id]').first();
  const id = await enemy.getAttribute('data-enemy-id');
  await page.keyboard.type('lab');
  await expect(enemy.locator('span[style*="underline"]')).toHaveText('lab');
  await expect(enemy).toHaveAttribute('data-selected', 'true');
  await page.keyboard.type('oratory');
  await expect(page.locator(`[data-enemy-id="${id}"]`)).toHaveCount(0);
  await expect(page.locator('[data-enemy-id][data-selected="true"]')).toHaveCount(0);
});

test.describe('mobile typing', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('native input receives physical keydown and text input only once', async ({ page }) => {
    await enterBattle(page, 'speed');
    const input = page.getByRole('textbox', { name: 'Gõ từ tiếng Anh' });
    await input.focus();
    await page.keyboard.type('spe');
    await expect(input).toHaveValue('spe');
    await page.keyboard.press('Backspace');
    await expect(input).toHaveValue('sp');
    await page.keyboard.type('eed');
    await expect(input).toHaveValue('');
    await expect(page.locator('[data-enemy-id][data-selected="true"]')).toHaveCount(0);
  });

  test('each virtual keyboard tap contributes one letter and Backspace removes one', async ({ page }) => {
    await enterBattle(page, 'speed');
    await page.getByTitle('Đổi sang bàn phím nổi').click();
    const typed = page.locator('[data-enemy-id][data-selected="true"] span[style*="underline"]');
    for (const key of ['S', 'P', 'E']) await page.getByRole('button', { name: key, exact: true }).tap();
    await expect(typed).toHaveText('spe');
    await page.getByRole('button').filter({ has: page.locator('svg.lucide-delete') }).last().tap();
    await expect(typed).toHaveText('sp');
    await page.getByRole('button', { name: 'E', exact: true }).tap();
    await page.getByRole('button', { name: 'E', exact: true }).tap();
    await expect(typed).toHaveText('spee');
    await page.getByRole('button', { name: 'D', exact: true }).tap();
    await expect(page.locator('[data-enemy-id][data-selected="true"]')).toHaveCount(0);
  });

  test('Telex composition and its final commit do not replay into the next answer', async ({ page }) => {
    await enterBattle(page, 'speed');
    const firstEnemyId = await page.locator('[data-enemy-id]').first().getAttribute('data-enemy-id');
    const input = page.getByRole('textbox', { name: 'Gõ từ tiếng Anh' });
    await input.focus();
    await input.evaluate((element) => {
      const field = element as HTMLInputElement;
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      field.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
      for (const value of ['s', 'sp', 'spe', 'spê', 'spêd', 'spêdsp']) {
        setValue.call(field, value);
        field.dispatchEvent(new InputEvent('input', {
          bubbles: true, inputType: 'insertCompositionText', data: value, isComposing: true,
        }));
      }
      field.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: 'spêdsp' }));
      setValue.call(field, 'spêdsp');
      field.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: 'spêdsp' }));
    });
    await expect(input).toHaveValue('');
    await expect(page.locator('[data-enemy-id][data-selected="true"]')).toHaveCount(0);
    await expect(page.locator(`[data-enemy-id="${firstEnemyId}"]`)).toHaveCount(0);
    await expect(page.locator('[data-enemy-id]').first()).toBeVisible();
    await input.press('s');
    await expect(input).toHaveValue('s');
  });
});
