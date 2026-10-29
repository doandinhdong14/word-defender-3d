import { expect, test, type Page } from "@playwright/test";

async function register(page: Page, name: string, email: string) {
  await page
    .locator(".game-navigation, .doodle-home nav")
    .getByRole("button", { name: "Tài khoản", exact: true })
    .click();
  await page.getByRole("tab", { name: "Đăng ký", exact: true }).click();
  await page.getByLabel("Tên hiển thị").fill(name);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("Adventure!2026");
  await page.getByLabel("Xác nhận mật khẩu").fill("Adventure!2026");
  await page
    .getByRole("button", { name: "Tạo tài khoản", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "pempom" }),
  ).toBeVisible();
}

test("minimal doodle landing has working navigation and responsive game modes", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page).toHaveTitle(/pempom/);
  await expect(page.getByRole("heading", { name: "pempom", exact: true })).toBeVisible();
  await expect(page.locator(".game-navigation")).toHaveCount(0);
  const destinations = ["Chơi", "Store", "Bảng xếp hạng", "Tài khoản", "Bài học", "Quà tặng", "Sự kiện"];
  await expect(page.locator(".doodle-home nav button")).toHaveCount(destinations.length);
  for (const label of destinations) {
    const button = page.locator(".doodle-home nav").getByRole("button", { name: label, exact: true });
    await expect(button).toBeVisible();
    await expect(button).toHaveText(label);
  }
  await expect(page.getByRole("img", { name: "Nhân vật pempom mặc định" })).toBeVisible();
  await page.screenshot({ path: "test-results/pempom-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Chơi", exact: true }).click();
  await expect(page.locator(".mode-card.available")).toHaveCount(1);
  await expect(page.locator(".mode-card.locked")).toHaveCount(3);
  await page.getByRole("button", { name: "Về sảnh", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  for (const label of destinations) {
    await expect(page.locator(".doodle-home nav").getByRole("button", { name: label, exact: true })).toBeVisible();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.screenshot({
    path: "test-results/pempom-mobile.png",
    fullPage: true,
  });
  for (const label of [
    "Store",
    "Bảng xếp hạng",
    "Tài khoản",
    "Bài học",
    "Quà tặng",
    "Sự kiện",
  ]) {
    await page
      .locator(".game-navigation, .doodle-home nav")
      .getByRole("button", { name: label, exact: true })
      .click();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(390);
    await expect(page.locator(".game-navigation")).toBeVisible();
    await expect(page.locator(".game-navigation button")).toHaveText(destinations);
    await expect(page.locator(".game-navigation button[aria-current=page]")).toHaveText(label);
    await expect(page.locator(".game-sidebar, .game-header, .game-footer")).toHaveCount(0);
    await page.locator(".game-navigation").getByRole("button", { name: "Chơi", exact: true }).click();
    await expect(page.getByRole("heading", { name: "pempom", exact: true })).toBeVisible();
  }
  await page.setViewportSize({ width: 320, height: 640 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  for (const label of destinations) {
    await expect(page.locator(".doodle-home nav").getByRole("button", { name: label, exact: true })).toBeVisible();
  }
  await page.getByRole("button", { name: "Chơi", exact: true }).click();
  await expect(page.locator(".mode-card.available")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  expect(errors).toEqual([]);
});

test("a regular player can import lessons, claim gifts, post, equip, and enter battle", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await register(page, "Người quản trị", "admin@example.com");
  await page
    .locator(".game-navigation, .doodle-home nav")
    .getByRole("button", { name: "Tài khoản", exact: true })
    .click();
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await register(page, "Nhà thám hiểm", "player@example.com");
  await page
    .locator(".game-navigation, .doodle-home nav")
    .getByRole("button", { name: "Quà tặng", exact: true })
    .click();
  await page.getByRole("button", { name: "Mở quà · +50 xu" }).click();
  await expect(
    page.getByRole("button", { name: "Đã nhận hôm nay" }),
  ).toBeDisabled();
  await page.reload();
  await page
    .locator(".game-navigation, .doodle-home nav")
    .getByRole("button", { name: "Quà tặng", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Đã nhận hôm nay" }),
  ).toBeDisabled();
  await page
    .locator(".game-navigation, .doodle-home nav")
    .getByRole("button", { name: "Bảng xếp hạng", exact: true })
    .click();
  await page.getByRole("button", { name: "Diễn đàn", exact: true }).click();
  await page
    .getByLabel("Chia sẻ với cộng đồng")
    .fill("Mình đã sẵn sàng học cùng pempom!");
  await page.getByRole("button", { name: "Đăng bài", exact: true }).click();
  await expect(page.locator(".forum-post")).toContainText(
    "Mình đã sẵn sàng học cùng pempom!",
  );
  await page
    .locator(".game-navigation, .doodle-home nav")
    .getByRole("button", { name: "Tài khoản", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Thanh toán qua payOS" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Quản trị", exact: true }),
  ).toHaveCount(0);
  await page
    .locator(".game-navigation, .doodle-home nav")
    .getByRole("button", { name: "Bài học", exact: true })
    .click();
  await page.getByRole("button", { name: "Tải tài liệu Excel / CSV" }).click();
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "pempom-words.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        "english,vietnamese\napple,quả táo\nbook,quyển sách\ncat,con mèo\ndog,con chó\nsun,mặt trời\nmoon,mặt trăng\nwater,nước\nhello,xin chào\nworld,thế giới\ngreen,màu xanh",
      ),
    });
  await page.getByRole("button", { name: "Bắt Đầu Nhập Bộ Từ" }).click();
  await expect(
    page.getByText("Nhập bộ từ thành công!", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Luyện Tập Bộ Từ Này Ngay" }).click();
  await page.getByRole("button", { name: /Sa Mạc Cổ Đại/ }).click();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByRole("button", { name: /Ninja Outfit/ }).click();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByRole("button", { name: /Dao Găm Kunai Ninja/ }).click();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /pempom-words/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({
    path: "test-results/pempom-prepare.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Xác nhận & vào trận" }).click();
  await expect(page.locator(".game-navigation")).toHaveCount(0);
  await expect(page.locator("canvas")).toBeVisible();
  await page.screenshot({
    path: "test-results/pempom-battle.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
