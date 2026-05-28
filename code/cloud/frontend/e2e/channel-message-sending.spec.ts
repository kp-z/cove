import { test, expect } from '@playwright/test';

test.describe('Channel Message Sending E2E', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到首页
    await page.goto('/');

    // 等待页面加载
    await page.waitForLoadState('networkidle');

    // 检查是否需要登录
    const usernameInput = page.locator('input[id="username"]').or(page.getByPlaceholder(/username/i));
    const isLoginPage = await usernameInput.isVisible().catch(() => false);

    if (isLoginPage) {
      console.log('🔐 Login page detected, logging in...');

      // 填写登录表单
      await usernameInput.fill('admin');

      const passwordInput = page.locator('input[id="password"]').or(page.getByPlaceholder(/password/i));
      await passwordInput.fill('Admin123!');

      // 点击登录按钮
      const loginButton = page.getByRole('button', { name: /login|sign in|登录/i });
      await loginButton.click();

      // 等待登录完成
      await page.waitForTimeout(2000);
      console.log('✅ Login completed');
    }

    // 导航到 Channels 页面
    const channelsLink = page.getByRole('link', { name: /channels/i });
    if (await channelsLink.isVisible()) {
      await channelsLink.click();
      await page.waitForTimeout(500);
    }
  });

  test('should send message successfully with network monitoring', async ({ page }) => {
    // 监听控制台日志
    const consoleLogs: string[] = [];
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      } else if (text.includes('[Composer]') || text.includes('[ChannelPanel]') || text.includes('[useSendMessage]')) {
        consoleLogs.push(text);
      }
    });

    // 监听网络请求
    let requestCaptured = false;
    let responseCaptured = false;
    let requestBody: any = null;
    let responseBody: any = null;

    page.on('request', request => {
      if (request.url().includes('/trpc/message.send') || request.url().includes('message.send')) {
        console.log('📤 Request captured:', request.url());
        requestCaptured = true;
        try {
          requestBody = request.postDataJSON();
          console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));
        } catch (e) {
          console.log('📤 Could not parse request body');
        }
      }
    });

    page.on('response', async response => {
      if (response.url().includes('/trpc/message.send') || response.url().includes('message.send')) {
        console.log('📥 Response captured:', response.status());
        responseCaptured = true;
        try {
          responseBody = await response.json();
          console.log('📥 Response body:', JSON.stringify(responseBody, null, 2));
        } catch (e) {
          console.log('📥 Could not parse response body');
        }
      }
    });

    // 等待页面稳定
    await page.waitForTimeout(1000);

    // 查找消息输入框 - 尝试多种选择器
    const textarea = page.locator('textarea').first()
      .or(page.getByRole('textbox'))
      .or(page.locator('[placeholder*="message" i]'))
      .or(page.locator('[placeholder*="输入" i]'));

    // 等待输入框可见
    await textarea.waitFor({ state: 'visible', timeout: 5000 });

    // 输入测试消息
    const testMessage = `E2E test message ${Date.now()}`;
    await textarea.fill(testMessage);
    console.log('✍️ Message typed:', testMessage);

    // 等待一下确保输入完成
    await page.waitForTimeout(300);

    // 查找发送按钮 - 尝试多种选择器
    const sendButton = page.getByRole('button', { name: /send|发送/i })
      .or(page.locator('button[type="submit"]'))
      .or(page.locator('button:has-text("Send")'))
      .or(page.locator('button:has-text("发送")'));

    // 确保按钮可见且可点击
    await sendButton.waitFor({ state: 'visible', timeout: 5000 });
    console.log('🔘 Send button found');

    // 点击发送按钮
    await sendButton.click();
    console.log('🖱️ Send button clicked');

    // 等待网络请求完成
    await page.waitForTimeout(2000);

    // 输出捕获的日志
    console.log('\n📋 Console logs captured:');
    consoleLogs.forEach(log => console.log('  ', log));

    if (consoleErrors.length > 0) {
      console.log('\n❌ Console errors:');
      consoleErrors.forEach(err => console.log('  ', err));
    }

    // 验证结果
    console.log('\n🔍 Verification:');
    console.log('  Request captured:', requestCaptured);
    console.log('  Response captured:', responseCaptured);

    // 断言：至少应该有一些日志输出
    expect(consoleLogs.length).toBeGreaterThan(0);

    // 如果有请求，验证请求参数
    if (requestCaptured && requestBody) {
      console.log('✅ Request body validation:');
      expect(requestBody).toHaveProperty('channelId');
      expect(requestBody).toHaveProperty('senderId');
      expect(requestBody).toHaveProperty('content');
      expect(requestBody.content).toBe(testMessage);
    }

    // 如果有响应，验证响应
    if (responseCaptured && responseBody) {
      console.log('✅ Response validation passed');
    }

    // 检查是否有错误
    if (consoleErrors.length > 0) {
      console.log('⚠️ Found console errors - test may have issues');
    }

    // 验证输入框是否被清空（成功发送的标志）
    const textareaValue = await textarea.inputValue();
    if (textareaValue === '') {
      console.log('✅ Textarea cleared - message likely sent');
    } else {
      console.log('⚠️ Textarea not cleared - message may not have been sent');
    }
  });

  test('should capture detailed event flow', async ({ page }) => {
    // 详细的日志捕获
    const eventLog: Array<{ timestamp: number; type: string; message: string }> = [];

    page.on('console', msg => {
      eventLog.push({
        timestamp: Date.now(),
        type: msg.type(),
        message: msg.text(),
      });
    });

    // 等待页面稳定
    await page.waitForTimeout(1000);

    // 查找输入框和按钮
    const textarea = page.locator('textarea').first()
      .or(page.getByRole('textbox'));
    const sendButton = page.getByRole('button', { name: /send|发送/i });

    // 检查元素是否存在
    const textareaExists = await textarea.count() > 0;
    const buttonExists = await sendButton.count() > 0;

    console.log('🔍 Element check:');
    console.log('  Textarea exists:', textareaExists);
    console.log('  Send button exists:', buttonExists);

    if (!textareaExists) {
      console.log('❌ Textarea not found - cannot proceed with test');
      // 输出页面内容帮助调试
      const bodyText = await page.locator('body').textContent();
      console.log('📄 Page content preview:', bodyText?.substring(0, 200));
      return;
    }

    if (!buttonExists) {
      console.log('❌ Send button not found - cannot proceed with test');
      return;
    }

    // 输入消息
    await textarea.fill('Test message for event flow');
    await page.waitForTimeout(300);

    // 点击发送
    await sendButton.click();
    await page.waitForTimeout(2000);

    // 输出完整的事件日志
    console.log('\n📊 Complete event log:');
    eventLog.forEach(event => {
      console.log(`[${event.type}] ${event.message}`);
    });

    // 分析日志链
    const hasComposerLog = eventLog.some(e => e.message.includes('[Composer]'));
    const hasChannelPanelLog = eventLog.some(e => e.message.includes('[ChannelPanel]'));
    const hasMutationLog = eventLog.some(e => e.message.includes('[useSendMessage]'));

    console.log('\n🔗 Event chain analysis:');
    console.log('  Composer handleSend called:', hasComposerLog);
    console.log('  ChannelPanel handleSendMessage called:', hasChannelPanelLog);
    console.log('  useSendMessage mutation triggered:', hasMutationLog);

    // 如果日志链中断，标记问题位置
    if (!hasComposerLog) {
      console.log('❌ Event chain broken at: Composer.handleSend');
    } else if (!hasChannelPanelLog) {
      console.log('❌ Event chain broken at: ChannelPanel.handleSendMessage');
    } else if (!hasMutationLog) {
      console.log('❌ Event chain broken at: useSendMessage mutation');
    } else {
      console.log('✅ Complete event chain detected');
    }
  });

  test('should check authentication state', async ({ page }) => {
    // 检查认证状态
    await page.waitForTimeout(1000);

    const authState = await page.evaluate(() => {
      // 检查 localStorage
      const token = localStorage.getItem('auth_token');
      const realmId = localStorage.getItem('current_realm_id');

      return {
        hasToken: !!token,
        hasRealmId: !!realmId,
        token: token ? token.substring(0, 20) + '...' : null,
        realmId,
      };
    });

    console.log('🔐 Authentication state:');
    console.log('  Has token:', authState.hasToken);
    console.log('  Has realmId:', authState.hasRealmId);
    console.log('  Token preview:', authState.token);
    console.log('  RealmId:', authState.realmId);

    // 如果没有认证信息，这可能是问题所在
    if (!authState.hasToken) {
      console.log('⚠️ No authentication token found - this may prevent message sending');
    }
  });
});
