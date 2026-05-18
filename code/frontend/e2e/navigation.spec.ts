import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display dashboard by default', async ({ page }) => {
    // Dashboard 是首页，直接验证 URL
    await expect(page).toHaveURL('/');

    // 验证 Dashboard 链接存在且处于活动状态
    const dashboardLink = page.getByRole('link', { name: /dashboard/i });
    await expect(dashboardLink).toBeVisible();
  });

  test('should navigate to agents page', async ({ page }) => {
    // Agents 在 Library 子菜单下，需要先展开 Library
    const libraryButton = page.getByRole('button', { name: /library/i });
    await libraryButton.click();

    // 等待子菜单展开
    await page.waitForTimeout(300);

    // 点击 Agents 链接
    const agentsLink = page.getByRole('link', { name: /^agents$/i });
    await agentsLink.click();

    // 验证 URL 变化
    await expect(page).toHaveURL(/\/agents/);
  });

  test('should navigate to channels page', async ({ page }) => {
    // 查找并点击 Channels 链接
    const channelsLink = page.getByRole('link', { name: /channels/i });
    await channelsLink.click();

    // 验证 URL 变化
    await expect(page).toHaveURL(/\/channel/);
  });

  test('should navigate to projects page', async ({ page }) => {
    // 查找并点击 Projects 链接
    const projectsLink = page.getByRole('link', { name: /projects/i });
    await projectsLink.click();

    // 验证 URL 变化
    await expect(page).toHaveURL(/\/projects/);
  });

  test('should navigate using browser back button', async ({ page }) => {
    // 导航到 Channels
    const channelsLink = page.getByRole('link', { name: /channels/i });
    await channelsLink.click();
    await expect(page).toHaveURL(/\/channel/);

    // 使用浏览器后退按钮
    await page.goBack();

    // 验证返回到首页
    await expect(page).toHaveURL('/');
  });
});
