import { expect, test, type Page } from '@playwright/test';

const nav = (page: Page, label: string) => page.locator('.game-navigation, .doodle-home nav').getByRole('button', { name: label, exact: true });

async function openFreeGame(page: Page) {
  if (await page.locator('.game-navigation').isVisible()) await nav(page, 'Chơi').click();
  await nav(page, 'Chơi').click();
  await page.getByRole('button', { name: /Đấu thường/ }).click();
  await expect(page.getByRole('heading', { name: 'Chuẩn bị', exact: true })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/auth/session', route => route.fulfill({ json: { account: null } }));
  await page.route('**/api/auth/config', route => route.fulfill({ json: { googleEnabled: true } }));
});

test('guest plays a basic lesson to results, retries and receives no account progress or rewards', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?map=desert');
  await nav(page, 'Bài học').click();
  await expect(page.getByRole('heading', { name: 'Everyday Communication' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'School & Academic' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'IELTS Basics' })).toHaveCount(0);
  await openFreeGame(page);
  await expect(page.getByRole('button', { name: /Tập Vở Ô Ly/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: /Sa Mạc Cổ Đại/ })).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await expect(page.getByRole('button', { name: /pempom nguyên bản/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: /Ninja Outfit/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await expect(page.locator('.equipment-choice[aria-pressed]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await expect(page.locator('.lesson-choice')).toHaveCount(2);
  await page.getByRole('button', { name: /School & Academic/ }).click();
  await page.getByLabel('Độ khó').selectOption('hard');
  await page.getByRole('button', { name: 'Xác nhận & vào trận' }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Đăng nhập bằng Google' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'HẾT MÁU RỒI! CỐ LÊN NHÉ' })).toBeVisible({ timeout: 65_000 });
  await expect(page.getByText('XU THƯỞNG NHẬN ĐƯỢC')).toHaveCount(0);
  await expect(page.getByText(/Bạn vừa chơi miễn phí/)).toBeVisible();
  const saved = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open('PonpiWordBlasterDB'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    try {
      const transaction = database.transaction(['attempts', 'learningRecords', 'runs', 'ledger']);
      const read = (name: string) => new Promise<any[]>((resolve, reject) => { const request = transaction.objectStore(name).getAll(); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
      const [attempts, records, runs, ledger] = await Promise.all(['attempts', 'learningRecords', 'runs', 'ledger'].map(read));
      return { attempts: attempts.length, records: records.length, runs: runs.length, rewards: ledger.filter(item => item.kind === 'earn').length };
    } finally { database.close(); }
  });
  expect(saved).toEqual({ attempts: 0, records: 0, runs: 0, rewards: 0 });
  await page.getByRole('button', { name: 'Chơi Lại Trận Mới' }).click();
  await expect(page.getByRole('heading', { name: 'Chuẩn bị', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('guest must sign in for expanded routes, maps, heroes, weapons, imports and learning modes', async ({ page }) => {
  await page.goto('/');
  for (const label of ['Store', 'Bảng xếp hạng', 'Quà tặng', 'Sự kiện']) {
    await nav(page, label).click();
    await expect(page.getByRole('heading', { name: 'Đăng nhập bằng Google' })).toBeVisible();
    await expect(page.locator('input[type=password], input[type=email]')).toHaveCount(0);
    await nav(page, 'Chơi').click();
  }
  await openFreeGame(page);
  await page.getByRole('button', { name: /Sa Mạc Cổ Đại/ }).click();
  await expect(page.getByRole('heading', { name: 'Đăng nhập bằng Google' })).toBeVisible();
  await page.getByRole('button', { name: 'Chơi miễn phí không cần đăng nhập' }).click();
  await page.getByRole('button', { name: 'Chọn tướng', exact: true }).click();
  await page.getByRole('button', { name: /Thêm tướng/ }).click();
  await expect(page.getByRole('heading', { name: 'Đăng nhập bằng Google' })).toBeVisible();
  await page.getByRole('button', { name: 'Chơi miễn phí không cần đăng nhập' }).click();
  await page.getByRole('button', { name: 'Chọn đạn', exact: true }).click();
  await page.getByRole('button', { name: /Thêm đạn và kỹ năng/ }).click();
  await expect(page.getByRole('heading', { name: 'Đăng nhập bằng Google' })).toBeVisible();
  await nav(page, 'Bài học').click();
  await page.getByRole('button', { name: 'Tải tài liệu Excel / CSV' }).click();
  await expect(page.getByRole('heading', { name: 'Đăng nhập bằng Google' })).toBeVisible();
  await page.getByRole('button', { name: 'Chơi miễn phí không cần đăng nhập' }).click();
  await page.getByRole('button', { name: 'Tài liệu học', exact: true }).click();
  await page.getByLabel('Cách học').selectOption('recall');
  await expect(page.getByRole('heading', { name: 'Đăng nhập bằng Google' })).toBeVisible();
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Đăng nhập bằng Google' })).toBeVisible();
});

test('free play stays available when Google sign-in is unavailable', async ({ page }) => {
  await page.route('**/api/auth/config', route => route.fulfill({ json: { googleEnabled: false } }));
  await page.goto('/');
  await nav(page, 'Tài khoản').click();
  await expect(page.getByRole('button', { name: 'Tiếp tục với Google' })).toBeDisabled();
  await page.getByRole('button', { name: 'Chơi miễn phí không cần đăng nhập' }).click();
  await expect(page.getByRole('heading', { name: 'Chuẩn bị', exact: true })).toBeVisible();
});
