import { expect, test } from '@playwright/test';

test('Google button works in both account tabs and starts the server flow', async ({ page }) => {
  await page.route('**/api/auth/config', route => route.fulfill({ json: { googleEnabled: true } }));
  await page.route('**/api/auth/google/start', route => route.fulfill({ contentType: 'text/html', body: '<h1>Google authorization started</h1>' }));
  await page.goto('/');
  await page.locator('.game-sidebar nav').getByRole('button', { name: 'Tài khoản', exact: true }).click();
  const google = page.getByRole('button', { name: 'Tiếp tục với Google' });
  await expect(google).toBeVisible();
  await page.getByRole('tab', { name: 'Đăng nhập', exact: true }).click();
  await expect(google).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await google.click();
  await expect(page.getByRole('heading', { name: 'Google authorization started' })).toBeVisible();
});

test('Google cancellation opens account with a useful retry message and removes URL errors', async ({ page }) => {
  await page.goto('/?auth_error=cancelled');
  await expect(page.getByRole('alert')).toContainText('Bạn đã hủy đăng nhập Google');
  await expect(page).not.toHaveURL(/auth_error/);
});

test('verified Google account initializes a player profile, survives reload, and signs out', async ({ page }) => {
  // Mock the server response only in this browser test, never in production code.
  let signedIn = true;
  const identity = { id: 'google:browser-test', email: 'google-pilot@example.com', displayName: 'Phi công Google', role: 'player', status: 'active', authProvider: 'google', createdAt: new Date().toISOString() };
  await page.route('**/api/auth/session', route => route.fulfill({ json: { account: signedIn ? identity : null } }));
  await page.route('**/api/auth/logout', route => { signedIn = false; return route.fulfill({ status: 204 }); });
  await page.goto('/?auth=google');
  await expect(page.getByRole('heading', { name: 'Hôm nay, mình phiêu lưu đâu?' })).toBeVisible();
  await expect(page).not.toHaveURL(/auth=google/);
  const accountTab = page.locator('.game-sidebar nav').getByRole('button', { name: 'Tài khoản', exact: true });
  await accountTab.click();
  await expect(page.getByText(identity.email, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Quản trị', exact: true })).toHaveCount(0);
  await page.reload();
  await accountTab.click();
  await expect(page.getByText(identity.email, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await accountTab.click();
  await expect(page.getByRole('tab', { name: 'Đăng nhập', exact: true })).toBeVisible();
  await page.reload();
  await accountTab.click();
  await expect(page.getByRole('tab', { name: 'Đăng nhập', exact: true })).toBeVisible();
});
