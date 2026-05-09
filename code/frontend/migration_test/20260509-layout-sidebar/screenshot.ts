import { chromium } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCREENSHOT_DIR = path.join(__dirname);
const BEFORE_DIR = path.join(SCREENSHOT_DIR, 'before');
const AFTER_DIR = path.join(SCREENSHOT_DIR, 'after');

interface ScreenshotConfig {
  name: string;
  url: string;
  needsLogin?: boolean;
  credentials?: { username: string; password: string };
  outputDir: string;
}

async function takeScreenshots(config: ScreenshotConfig) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log(`\n📸 截图: ${config.name} (${config.url})`);

  try {
    // 访问页面
    await page.goto(config.url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // 如果需要登录
    if (config.needsLogin && config.credentials) {
      console.log('  🔐 登录中...');

      // 等待登录表单
      await page.waitForSelector('input[type="text"], input[type="email"], input[name="username"]', { timeout: 5000 });

      // 填写用户名
      const usernameInput = page.locator('input[type="text"], input[type="email"], input[name="username"]').first();
      await usernameInput.fill(config.credentials.username);

      // 填写密码
      const passwordInput = page.locator('input[type="password"]').first();
      await passwordInput.fill(config.credentials.password);

      // 点击登录按钮
      const loginButton = page.locator('button[type="submit"]').first();
      await loginButton.click();

      // 等待导航完成
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

      console.log('  ✅ 登录成功');
    }

    // 等待侧边栏加载
    await page.waitForSelector('aside, nav, [role="navigation"]', { timeout: 10000 });
    await page.waitForTimeout(1000); // 等待动画完成

    // 1. Desktop Expanded (1920px)
    console.log('  📐 Desktop Expanded (1920px)...');
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);

    // 确保侧边栏展开
    const collapseButton = page.locator('button[title*="收起"], button[title*="展开"]').first();
    const isCollapsed = await page.locator('aside').getAttribute('data-collapsed').catch(() => null);
    if (isCollapsed === 'true') {
      await collapseButton.click();
      await page.waitForTimeout(500);
    }

    await page.screenshot({
      path: path.join(config.outputDir, 'desktop-expanded.png'),
      fullPage: true,
    });
    console.log('  ✅ desktop-expanded.png');

    // 2. Desktop Collapsed (1920px)
    console.log('  📐 Desktop Collapsed (1920px)...');
    const expandedButton = page.locator('button[title*="收起"]').first();
    await expandedButton.click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(config.outputDir, 'desktop-collapsed.png'),
      fullPage: true,
    });
    console.log('  ✅ desktop-collapsed.png');

    // 3. Mobile (375px)
    console.log('  📱 Mobile (375px)...');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(config.outputDir, 'mobile.png'),
      fullPage: true,
    });
    console.log('  ✅ mobile.png');

  } catch (error) {
    console.error(`  ❌ 错误: ${error.message}`);
    throw error;
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log('🚀 开始截图任务...\n');

  // 截图 claude_manager (需要登录)
  await takeScreenshots({
    name: 'claude_manager',
    url: 'http://localhost:5173',
    needsLogin: true,
    credentials: { username: 'kp', password: 'kp0518' },
    outputDir: BEFORE_DIR,
  });

  // 截图 cove (不需要登录)
  await takeScreenshots({
    name: 'cove',
    url: 'http://localhost:5174',
    needsLogin: false,
    outputDir: AFTER_DIR,
  });

  console.log('\n✅ 所有截图完成！');
  console.log(`\n📁 截图保存位置:`);
  console.log(`  - claude_manager: ${BEFORE_DIR}`);
  console.log(`  - cove: ${AFTER_DIR}`);
}

main().catch(console.error);
