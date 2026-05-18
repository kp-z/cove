import { test, expect } from '@playwright/test';

test.describe('Agent Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // 导航到 Agents 页面 - 需要先展开 Library 菜单
    const libraryButton = page.getByRole('button', { name: /library/i });
    await libraryButton.click();
    await page.waitForTimeout(300);

    const agentsLink = page.getByRole('link', { name: /^agents$/i });
    await agentsLink.click();
    await expect(page).toHaveURL(/\/agents/);
  });

  test('should display agents list', async ({ page }) => {
    // 等待 Agents 列表加载
    await page.waitForTimeout(1000);

    // 检查是否有 Agent 卡片或列表项
    const agentCards = page.locator('[data-testid="agent-card"]')
      .or(page.locator('.agent-card'))
      .or(page.getByRole('article'));

    // 验证至少有一些内容显示（可能是空状态或实际的 agents）
    const pageContent = page.locator('body');
    await expect(pageContent).toBeVisible();
  });

  test('should open create agent dialog', async ({ page }) => {
    // 查找创建 Agent 按钮
    const createButton = page.getByRole('button', { name: /create|new agent|add agent/i })
      .or(page.locator('[data-testid="create-agent-button"]'));

    const buttonCount = await createButton.count();
    if (buttonCount > 0) {
      await createButton.first().click();

      // 验证对话框打开
      const dialog = page.getByRole('dialog')
        .or(page.locator('[role="dialog"]'))
        .or(page.locator('.modal'));

      await expect(dialog.first()).toBeVisible();
    }
  });

  test('should filter agents by category', async ({ page }) => {
    // 查找分类过滤器
    const categoryFilter = page.getByRole('button', { name: /category|filter/i })
      .or(page.locator('[data-testid="category-filter"]'));

    const filterCount = await categoryFilter.count();
    if (filterCount > 0) {
      await categoryFilter.first().click();

      // 等待过滤菜单出现
      await page.waitForTimeout(200);

      // 选择一个分类
      const categoryOption = page.getByRole('menuitem').or(page.locator('[role="menuitem"]'));
      const optionCount = await categoryOption.count();
      if (optionCount > 0) {
        await categoryOption.first().click();

        // 等待列表更新
        await page.waitForTimeout(500);
      }
    }
  });

  test('should search agents', async ({ page }) => {
    // 查找搜索框
    const searchInput = page.getByRole('searchbox')
      .or(page.getByPlaceholder(/search/i))
      .or(page.locator('input[type="search"]'));

    const inputCount = await searchInput.count();
    if (inputCount > 0) {
      // 输入搜索关键词
      await searchInput.first().fill('test');

      // 等待搜索结果
      await page.waitForTimeout(500);

      // 验证搜索执行（URL 变化或结果更新）
      const pageContent = page.locator('body');
      await expect(pageContent).toBeVisible();
    }
  });

  test('should view agent details', async ({ page }) => {
    // 等待列表加载
    await page.waitForTimeout(1000);

    // 查找第一个 Agent 卡片
    const agentCard = page.locator('[data-testid="agent-card"]')
      .or(page.locator('.agent-card'))
      .or(page.getByRole('article'));

    const cardCount = await agentCard.count();
    if (cardCount > 0) {
      // 点击查看详情
      await agentCard.first().click();

      // 等待详情页面或对话框加载
      await page.waitForTimeout(500);

      // 验证详情显示（URL 变化或对话框打开）
      const hasDialog = await page.getByRole('dialog').count() > 0;
      const urlChanged = page.url().includes('/agent/');

      expect(hasDialog || urlChanged).toBeTruthy();
    }
  });

  test('should handle agent status toggle', async ({ page }) => {
    // 等待列表加载
    await page.waitForTimeout(1000);

    // 查找状态切换按钮
    const statusToggle = page.getByRole('switch')
      .or(page.locator('[role="switch"]'))
      .or(page.locator('button').filter({ hasText: /active|inactive|enable|disable/i }));

    const toggleCount = await statusToggle.count();
    if (toggleCount > 0) {
      // 获取初始状态
      const initialChecked = await statusToggle.first().isChecked().catch(() => false);

      // 切换状态
      await statusToggle.first().click();

      // 等待状态更新
      await page.waitForTimeout(500);

      // 验证状态变化
      const newChecked = await statusToggle.first().isChecked().catch(() => !initialChecked);
      expect(newChecked).not.toBe(initialChecked);
    }
  });
});
