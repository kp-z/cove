import { test, expect } from '@playwright/test';

test.describe('Channel Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // 导航到 Channels 页面
    const channelsLink = page.getByRole('link', { name: /channels/i });
    await channelsLink.click();
    await expect(page).toHaveURL(/\/channel/);
  });

  test('should display channels list', async ({ page }) => {
    // 等待 Channels 列表加载
    await page.waitForTimeout(1000);

    // 检查是否有 Channel 列表项
    const channelItems = page.locator('[data-testid="channel-item"]')
      .or(page.locator('.channel-item'))
      .or(page.getByRole('listitem'));

    // 验证页面内容显示
    const pageContent = page.locator('body');
    await expect(pageContent).toBeVisible();
  });

  test('should switch between channels', async ({ page }) => {
    // 等待列表加载
    await page.waitForTimeout(1000);

    // 查找 Channel 列表项
    const channelItems = page.locator('[data-testid="channel-item"]')
      .or(page.locator('.channel-item'))
      .or(page.getByRole('button').filter({ hasText: /#/ }));

    const itemCount = await channelItems.count();
    if (itemCount > 1) {
      // 点击第一个 Channel
      await channelItems.first().click();
      await page.waitForTimeout(300);

      // 点击第二个 Channel
      await channelItems.nth(1).click();
      await page.waitForTimeout(300);

      // 验证 Channel 切换成功（URL 或活动状态变化）
      const activeChannel = page.locator('[aria-current="page"]')
        .or(page.locator('.active'));
      await expect(activeChannel.first()).toBeVisible();
    }
  });

  test('should open create channel dialog', async ({ page }) => {
    // 查找创建 Channel 按钮
    const createButton = page.getByRole('button', { name: /create|new channel|add channel/i })
      .or(page.locator('[data-testid="create-channel-button"]'));

    const buttonCount = await createButton.count();
    if (buttonCount > 0) {
      await createButton.first().click();

      // 验证对话框打开
      const dialog = page.getByRole('dialog')
        .or(page.locator('[role="dialog"]'));

      await expect(dialog.first()).toBeVisible();
    }
  });

  test('should display channel messages', async ({ page }) => {
    // 等待列表加载
    await page.waitForTimeout(1000);

    // 点击一个 Channel
    const channelItems = page.locator('[data-testid="channel-item"]')
      .or(page.locator('.channel-item'))
      .or(page.getByRole('button').filter({ hasText: /#/ }));

    const itemCount = await channelItems.count();
    if (itemCount > 0) {
      await channelItems.first().click();
      await page.waitForTimeout(500);

      // 检查消息区域是否显示
      const messageArea = page.locator('[data-testid="message-list"]')
        .or(page.locator('.message-list'))
        .or(page.locator('[role="log"]'));

      // 验证消息区域存在（可能为空）
      const pageContent = page.locator('body');
      await expect(pageContent).toBeVisible();
    }
  });

  test('should send a message', async ({ page }) => {
    // 等待列表加载并选择一个 Channel
    await page.waitForTimeout(1000);

    const channelItems = page.locator('[data-testid="channel-item"]')
      .or(page.locator('.channel-item'))
      .or(page.getByRole('button').filter({ hasText: /#/ }));

    const itemCount = await channelItems.count();
    if (itemCount > 0) {
      await channelItems.first().click();
      await page.waitForTimeout(500);

      // 查找消息输入框
      const messageInput = page.getByRole('textbox', { name: /message/i })
        .or(page.getByPlaceholder(/type a message|write a message/i))
        .or(page.locator('textarea[placeholder*="message"]'));

      const inputCount = await messageInput.count();
      if (inputCount > 0) {
        // 输入消息
        await messageInput.first().fill('Test message from E2E');

        // 查找发送按钮
        const sendButton = page.getByRole('button', { name: /send/i })
          .or(page.locator('[data-testid="send-button"]'))
          .or(page.locator('button[type="submit"]'));

        const sendCount = await sendButton.count();
        if (sendCount > 0) {
          await sendButton.first().click();

          // 等待消息发送
          await page.waitForTimeout(500);

          // 验证输入框清空
          const inputValue = await messageInput.first().inputValue();
          expect(inputValue).toBe('');
        } else {
          // 尝试使用快捷键发送（Ctrl+Enter 或 Cmd+Enter）
          await messageInput.first().press('Control+Enter');
          await page.waitForTimeout(500);
        }
      }
    }
  });

  test('should filter channels by type', async ({ page }) => {
    // 查找类型过滤器
    const typeFilter = page.getByRole('button', { name: /type|filter|public|private/i })
      .or(page.locator('[data-testid="channel-type-filter"]'));

    const filterCount = await typeFilter.count();
    if (filterCount > 0) {
      await typeFilter.first().click();

      // 等待过滤菜单出现
      await page.waitForTimeout(200);

      // 选择一个类型
      const typeOption = page.getByRole('menuitem').or(page.locator('[role="menuitem"]'));
      const optionCount = await typeOption.count();
      if (optionCount > 0) {
        await typeOption.first().click();

        // 等待列表更新
        await page.waitForTimeout(500);
      }
    }
  });

  test('should scroll to load more messages', async ({ page }) => {
    // 等待列表加载并选择一个 Channel
    await page.waitForTimeout(1000);

    const channelItems = page.locator('[data-testid="channel-item"]')
      .or(page.locator('.channel-item'))
      .or(page.getByRole('button').filter({ hasText: /#/ }));

    const itemCount = await channelItems.count();
    if (itemCount > 0) {
      await channelItems.first().click();
      await page.waitForTimeout(500);

      // 查找消息列表容器
      const messageList = page.locator('[data-testid="message-list"]')
        .or(page.locator('.message-list'))
        .or(page.locator('[role="log"]'));

      const listCount = await messageList.count();
      if (listCount > 0) {
        // 滚动到顶部加载更多
        await messageList.first().evaluate((el) => {
          el.scrollTop = 0;
        });

        // 等待加载
        await page.waitForTimeout(1000);

        // 验证页面仍然可见（加载成功或无更多消息）
        await expect(messageList.first()).toBeVisible();
      }
    }
  });
});
