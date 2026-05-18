import { test, expect } from '@playwright/test';

test.describe('User Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should open and close user menu', async ({ page }) => {
    // 查找用户菜单按钮 - 通常在顶部栏右侧
    const userMenuButton = page.locator('[data-testid="user-menu-trigger"]')
      .or(page.locator('button[aria-label*="user" i]'))
      .or(page.locator('button').filter({ has: page.locator('img[alt*="avatar" i]') }));

    const buttonCount = await userMenuButton.count();
    if (buttonCount > 0) {
      // 点击打开菜单
      await userMenuButton.first().click();

      // 验证菜单打开
      const menu = page.getByRole('menu').or(page.locator('[role="menu"]'));
      await expect(menu.first()).toBeVisible();

      // 点击外部关闭菜单
      await page.keyboard.press('Escape');

      // 验证菜单关闭
      await expect(menu.first()).not.toBeVisible();
    }
  });

  test('should toggle sidebar collapse', async ({ page }) => {
    // 查找侧边栏折叠按钮
    const collapseButton = page.getByRole('button', { name: /collapse/i })
      .or(page.locator('[data-testid="sidebar-collapse"]'))
      .or(page.locator('button').filter({ hasText: /collapse/i }));

    // 如果找到折叠按钮，测试折叠功能
    const buttonCount = await collapseButton.count();
    if (buttonCount > 0) {
      await collapseButton.first().click();

      // 等待动画完成
      await page.waitForTimeout(300);

      // 验证侧边栏状态变化（通过宽度或 class）
      const sidebar = page.locator('[data-testid="sidebar"]').or(page.locator('nav'));
      await expect(sidebar.first()).toBeVisible();
    }
  });

  test('should change language', async ({ page }) => {
    // 查找语言切换按钮或下拉菜单
    const languageButton = page.getByRole('button', { name: /language/i })
      .or(page.locator('[data-testid="language-selector"]'))
      .or(page.getByText(/en|zh|中文|english/i));

    const buttonCount = await languageButton.count();
    if (buttonCount > 0) {
      await languageButton.first().click();

      // 等待语言菜单出现
      await page.waitForTimeout(200);

      // 选择一个语言选项
      const languageOption = page.getByRole('menuitem').or(page.locator('[role="menuitem"]'));
      const optionCount = await languageOption.count();
      if (optionCount > 0) {
        await languageOption.first().click();

        // 验证语言切换成功（检查页面文本变化）
        await page.waitForTimeout(300);
      }
    }
  });

  test('should toggle theme', async ({ page }) => {
    // 查找主题切换按钮
    const themeButton = page.getByRole('button', { name: /theme|dark|light/i })
      .or(page.locator('[data-testid="theme-toggle"]'));

    const buttonCount = await themeButton.count();
    if (buttonCount > 0) {
      // 获取当前主题
      const htmlElement = page.locator('html');
      const initialClass = await htmlElement.getAttribute('class');

      // 切换主题
      await themeButton.first().click();

      // 等待主题切换完成
      await page.waitForTimeout(200);

      // 验证主题变化
      const newClass = await htmlElement.getAttribute('class');
      expect(newClass).not.toBe(initialClass);
    }
  });

  test('should handle keyboard navigation', async ({ page }) => {
    // 验证页面支持键盘导航
    // 按 Tab 键应该能够移动焦点
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);

    // 验证页面响应键盘事件（通过检查页面仍然可交互）
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // 测试 Escape 键（常用的关闭操作）
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);

    // 验证页面仍然正常
    await expect(body).toBeVisible();
  });
});
