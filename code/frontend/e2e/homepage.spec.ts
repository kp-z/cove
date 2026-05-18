import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');

    // 检查页面标题
    await expect(page).toHaveTitle(/Cove/i);
  });

  test('should display the main navigation', async ({ page }) => {
    await page.goto('/');

    // 检查侧边栏是否存在
    const sidebar = page.locator('[data-testid="sidebar"]').or(page.locator('nav'));
    await expect(sidebar.first()).toBeVisible();
  });

  test('should display the top bar', async ({ page }) => {
    await page.goto('/');

    // 检查顶部栏是否存在
    const topBar = page.locator('[data-testid="topbar"]').or(page.locator('header'));
    await expect(topBar.first()).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // 设置移动端视口
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // 检查页面是否正常加载
    await expect(page).toHaveTitle(/Cove/i);
  });
});
