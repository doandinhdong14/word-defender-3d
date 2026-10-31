import { expect, test } from '@playwright/test';

test('difficulty slider changes the selection and stays accessible on small screens', async ({ page }) => {
  await page.route('**/api/auth/session', route => route.fulfill({ json: { account: null } }));
  await page.route('**/api/auth/config', route => route.fulfill({ json: { googleEnabled: false } }));
  await page.goto('/');
  await page.getByRole('button', { name: /CHƠI NGAY/ }).click();
  await page.getByRole('button', { name: /Đấu thường/ }).click();

  const slider = page.getByRole('slider', { name: 'Độ khó' });
  await expect(slider).toHaveValue('1');
  await slider.focus();
  await slider.press('Home');
  await expect(slider).toHaveValue('0');
  await expect(slider).toHaveAttribute('aria-valuetext', 'Dễ');
  await expect(page.getByText('Quái thường chậm hơn 30%, thêm thời gian luyện gõ.')).toBeVisible();
  await page.getByRole('button', { name: 'Khó', exact: true }).click();
  await expect(slider).toHaveValue('2');
  await slider.focus();
  await slider.press('ArrowLeft');
  await expect(slider).toHaveAttribute('aria-valuetext', 'Vừa');
  await page.getByRole('button', { name: 'Dễ', exact: true }).click();

  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 390, height: 640 }]) {
    await page.setViewportSize(viewport);
    await expect(slider).toBeInViewport();
    const launch = page.getByRole('button', { name: 'VÀO TRẬN ĐẤU THƯỜNG', exact: true });
    await expect(launch).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
    const box = await launch.boundingBox();
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
    await page.screenshot({ path: `test-results/prepare-difficulty-${viewport.width}-${viewport.height}.png` });
  }

  // The selected value survives navigating away and returning to preparation.
  await page.getByRole('main').getByRole('button', { name: 'Về sảnh', exact: true }).click();
  await page.getByRole('button', { name: /CHƠI NGAY/ }).click();
  await page.getByRole('button', { name: /Đấu thường/ }).click();
  await expect(slider).toHaveValue('0');
  await page.getByRole('button', { name: 'VÀO TRẬN ĐẤU THƯỜNG', exact: true }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.locator('[data-enemy-id]').first()).toBeVisible();
});
