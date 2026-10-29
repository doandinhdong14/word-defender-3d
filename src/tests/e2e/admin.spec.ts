import { expect, test, type Page } from '@playwright/test';

const permissions: Record<string, string> = {
  'admin.access': 'Vào trang quản trị', 'users.read': 'Xem danh sách người dùng',
  'users.manage': 'Khóa, mở khóa và thu hồi phiên đăng nhập', 'roles.manage': 'Cấp vai trò và phân quyền',
  'content.read': 'Xem nội dung và bản nháp', 'content.write': 'Tạo và chỉnh sửa nội dung',
  'content.publish': 'Xuất bản và gỡ xuất bản', 'content.delete': 'Xóa vào thùng rác và khôi phục', 'audit.read': 'Xem nhật ký quản trị',
};
const roles = {
  owner: { label: 'Chủ quản trị', permissions: Object.keys(permissions) }, admin: { label: 'Quản trị viên', permissions: Object.keys(permissions) },
  editor: { label: 'Biên tập viên', permissions: ['admin.access', 'content.read', 'content.write'] },
  moderator: { label: 'Kiểm duyệt viên', permissions: ['admin.access', 'users.read', 'users.manage', 'content.read', 'audit.read'] }, player: { label: 'Người chơi', permissions: [] },
};
async function mockAdmin(page: Page, role: keyof typeof roles = 'owner') {
  const at = '2026-10-29T00:00:00Z';
  const owner = { id: 'google:admin-ui-test', email: 'admin-ui@example.com', displayName: 'Quản trị thử nghiệm', authProvider: 'google', role, permissions: roles[role].permissions, status: 'active', createdAt: at, updatedAt: at };
  let player = { ...owner, id: 'google:player-ui-test', email: 'pilot@example.com', displayName: 'Nhà thám hiểm', role: 'player', permissions: [] as string[] };
  const content: any[] = [];
  const invites: any[] = [];
  await page.route('**/api/auth/session', route => route.fulfill({ json: { account: owner } }));
  await page.route('**/api/admin/**', async route => {
    const req = route.request(), url = new URL(req.url()), path = decodeURIComponent(url.pathname.replace('/api/admin', ''));
    const body = req.postDataJSON();
    let json: any = {};
    if (path === '/metadata') json = { roles, permissions };
    else if (path === '/overview') json = { users: { total: 2, active: 2, admins: 1 }, content: { total: content.length, published: content.filter(c => c.status === 'published').length, drafts: content.filter(c => c.status === 'draft').length }, activity: [] };
    else if (path === '/users' && req.method() === 'GET') json = { items: [owner, player], total: 2, page: 1 };
    else if (path === `/users/${player.id}` && req.method() === 'PATCH') { player = { ...player, ...body }; json = { user: player }; }
    else if (path === '/invitations' && req.method() === 'POST') { const invitation = { ...body, permissions: roles[body.role as keyof typeof roles].permissions, expiresAt: at, createdBy: owner.email }; invites.push(invitation); json = { invitation }; }
    else if (path === '/invitations') json = { items: invites };
    else if (path === '/content' && req.method() === 'POST') { const item = { ...body, id: 'managed_ui', revision: 1, createdAt: at, updatedAt: at, updatedBy: owner.email }; content.push(item); json = { item }; }
    else if (path === '/content' && req.method() === 'GET') json = { items: content, total: content.length, page: 1 };
    else if (path === '/audit') json = { items: [], total: 0, page: 1 };
    else return route.fulfill({ status: 404, json: { error: `Missing UI mock: ${path}` } });
    await route.fulfill({ json });
  });
  page.on('dialog', dialog => void dialog.accept());
  return { owner, getPlayer: () => player, content };
}

test('owner can manage users, customize permissions and grant pending access by email', async ({ page }) => {
  const data = await mockAdmin(page);
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Trung tâm quản trị' })).toBeVisible();
  await page.getByRole('navigation', { name: 'Mục quản trị' }).getByRole('button', { name: 'Người dùng & quyền' }).click();
  await page.getByRole('row').filter({ hasText: 'pilot@example.com' }).getByRole('button', { name: 'Quản lý', exact: true }).click();
  await page.locator('.adm-editor').getByRole('combobox', { name: 'Vai trò', exact: true }).selectOption('editor');
  await expect(page.getByLabel('Tạo và chỉnh sửa nội dung', { exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Lưu quyền & trạng thái' }).click();
  await expect(page.getByRole('status')).toContainText('Đã cập nhật người dùng.');
  expect(data.getPlayer().role).toBe('editor');
  await page.getByLabel('Email Google', { exact: true }).fill('new-admin@example.com');
  await page.getByRole('button', { name: 'Cấp quyền chờ', exact: true }).click();
  await expect(page.getByText('new-admin@example.com', { exact: true })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'pilot@example.com' })).toContainText('Biên tập viên');
  await expect(page.locator('.adm-loading')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.screenshot({ path: 'test-results/admin-users-mobile.png', fullPage: true });
});

test('owner can preview and publish a lesson from the content editor', async ({ page }) => {
  const data = await mockAdmin(page);
  await page.goto('/admin');
  await page.getByRole('navigation', { name: 'Mục quản trị' }).getByRole('button', { name: 'Nội dung', exact: true }).click();
  await page.getByRole('button', { name: 'Tạo nội dung', exact: true }).click();
  await page.getByLabel('Tiêu đề', { exact: true }).fill('Bộ từ mới cho cộng đồng');
  await page.getByLabel('Mô tả ngắn').fill('Cùng nhau học mỗi ngày.');
  await page.getByLabel('Từ vựng bài học').fill('apple | quả táo\nbook | quyển sách');
  await page.getByRole('combobox', { name: 'Trạng thái', exact: true }).selectOption('published');
  await page.getByRole('button', { name: 'Xem trước', exact: true }).click();
  await expect(page.locator('.adm-preview')).toContainText('quả táo');
  await page.getByRole('button', { name: 'Lưu & xuất bản', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Đã xuất bản nội dung.');
  expect(data.content[0].words).toHaveLength(2);
  expect(data.content[0].status).toBe('published');
  await expect(page.locator('.adm-content-list')).toContainText('Bộ từ mới cho cộng đồng');
  await page.screenshot({ path: 'test-results/admin-content-desktop.png', fullPage: true });
});

test('editor sees only authorized sections and cannot select published status', async ({ page }) => {
  await mockAdmin(page, 'editor');
  await page.goto('/admin');
  const nav = page.getByRole('navigation', { name: 'Mục quản trị' });
  await expect(nav.getByRole('button', { name: 'Người dùng & quyền' })).toHaveCount(0);
  await expect(nav.getByRole('button', { name: 'Nhật ký', exact: true })).toHaveCount(0);
  await nav.getByRole('button', { name: 'Nội dung', exact: true }).click();
  await page.getByRole('button', { name: 'Tạo nội dung', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Trạng thái', exact: true }).locator('option')).toHaveCount(1);
});

test('ordinary Google player receives an access explanation at the admin URL', async ({ page }) => {
  await mockAdmin(page, 'player');
  await page.goto('/admin');
  await expect(page.getByText('Tài khoản của bạn chưa được cấp quyền quản trị.', { exact: false })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Mục quản trị' })).toHaveCount(0);
});
