import { test, expect } from '@playwright/test';
import path from 'path';

const SCREENSHOT_DIR = path.join(__dirname, '20260509-layout-sidebar');

test.describe('UI Migration Screenshot Comparison', () => {
  test.describe('claude_manager (before)', () => {
    test.use({ baseURL: 'http://localhost:5173' });

    test.beforeEach(async ({ page }) => {
      // 登录
      await page.goto('/login');
      await page.fill('input[name="username"]', 'kp');
      await page.fill('input[name="password"]', 'kp0518');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');
    });

    test('desktop-expanded', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/');

      // 确保侧边栏展开
      const sidebar = page.locator('aside');
      const sidebarWidth = await sidebar.evaluate(el => el.offsetWidth);
      if (sidebarWidth < 150) {
        // 侧边栏折叠，点击展开
        await page.click('button[title*="展开"]');
        await page.waitForTimeout(500); // 等待动画
      }

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'before', 'desktop-expanded.png'),
        fullPage: true,
      });
    });

    test('desktop-collapsed', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/');

      // 点击折叠按钮
      await page.click('button[title*="收起"]');
      await page.waitForTimeout(500); // 等待动画

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'before', 'desktop-collapsed.png'),
        fullPage: true,
      });
    });

    test('mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'before', 'mobile.png'),
        fullPage: true,
      });
    });
  });

  test.describe('cove (after)', () => {
    test.use({ baseURL: 'http://localhost:5174' });

    test('desktop-expanded', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/');

      // 确保侧边栏展开
      const sidebar = page.locator('aside');
      const sidebarWidth = await sidebar.evaluate(el => el.offsetWidth);
      if (sidebarWidth < 150) {
        await page.click('button[title*="展开"]');
        await page.waitForTimeout(500);
      }

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'after', 'desktop-expanded.png'),
        fullPage: true,
      });
    });

    test('desktop-collapsed', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/');

      await page.click('button[title*="收起"]');
      await page.waitForTimeout(500);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'after', 'desktop-collapsed.png'),
        fullPage: true,
      });
    });

    test('mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'after', 'mobile.png'),
        fullPage: true,
      });
    });
  });
});
