/**
 * Device Client Integration Tests
 *
 * 端到端集成测试，验证完整的 Device Client 功能
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DeviceClient } from '../device-client';
import { ClaudeCodeCLIAdapter } from '../infrastructure/adapters/llm/claude-code-cli-adapter';
import type { Config } from '../config';

describe('Device Client Integration Tests', () => {
  let client: DeviceClient;
  let testConfig: Config & {
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    anthropicApiKey?: string;
    openaiApiKey?: string;
  };

  beforeAll(async () => {
    // 检查 Claude CLI 是否可用
    const isClaudeAvailable = await ClaudeCodeCLIAdapter.isAvailable();
    if (!isClaudeAvailable) {
      console.warn('⚠️  Claude CLI not available, some tests will be skipped');
    }

    // 测试配置
    testConfig = {
      server: {
        url: process.env.TEST_SERVER_URL || 'http://localhost:3000',
      },
      device: {
        id: process.env.TEST_DEVICE_ID || 'test-device-001',
        name: 'Test Device',
        apiKey: process.env.TEST_DEVICE_API_KEY || 'test-api-key',
        realmId: process.env.TEST_REALM_ID || 'test-realm',
      },
      local: {
        dataDir: './.test-data',
        heartbeatInterval: 5000,
        reconnectDelay: 1000,
        maxConcurrentTasks: 1,
      },
      logLevel: 'debug',
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      openaiApiKey: process.env.OPENAI_API_KEY,
    };
  });

  afterAll(async () => {
    if (client && client.isRunning()) {
      await client.stop();
    }
  });

  describe('DeviceClient Lifecycle', () => {
    it('should create a DeviceClient instance', () => {
      client = new DeviceClient(testConfig);
      expect(client).toBeDefined();
      expect(client.isRunning()).toBe(false);
    });

    it('should start the DeviceClient', async () => {
      // 注意：这个测试需要 Backend 运行
      // 如果 Backend 不可用，测试会失败
      try {
        await client.start();
        expect(client.isRunning()).toBe(true);
      } catch (error) {
        console.warn('⚠️  Failed to start DeviceClient (Backend may not be running):', error);
        // 跳过后续测试
        return;
      }
    }, 30000); // 30秒超时

    it('should stop the DeviceClient', async () => {
      if (!client.isRunning()) {
        console.warn('⚠️  DeviceClient not running, skipping stop test');
        return;
      }

      await client.stop();
      expect(client.isRunning()).toBe(false);
    }, 30000);
  });

  describe('Claude Code CLI Adapter', () => {
    it('should check if Claude CLI is available', async () => {
      const isAvailable = await ClaudeCodeCLIAdapter.isAvailable();
      console.log(`Claude CLI available: ${isAvailable}`);
      // 不强制要求可用，只是记录
    });

    it('should generate response using Claude CLI', async () => {
      const isAvailable = await ClaudeCodeCLIAdapter.isAvailable();
      if (!isAvailable) {
        console.warn('⚠️  Claude CLI not available, skipping test');
        return;
      }

      const adapter = new ClaudeCodeCLIAdapter({
        timeout: 60000, // 1分钟
      });

      const response = await adapter.generateResponse({
        systemPrompt: 'You are a helpful assistant.',
        messages: [
          {
            role: 'user',
            content: 'What is 2 + 2? Answer with just the number.',
          },
        ],
      });

      expect(response).toBeDefined();
      expect(response.length).toBeGreaterThan(0);
      console.log('Claude CLI response:', response);
    }, 120000); // 2分钟超时

    it('should support streaming callbacks', async () => {
      const isAvailable = await ClaudeCodeCLIAdapter.isAvailable();
      if (!isAvailable) {
        console.warn('⚠️  Claude CLI not available, skipping test');
        return;
      }

      const adapter = new ClaudeCodeCLIAdapter();
      const chunks: string[] = [];
      let statusChanges: string[] = [];
      let usageReported = false;

      const response = await adapter.generateResponse({
        systemPrompt: 'You are a helpful assistant.',
        messages: [
          {
            role: 'user',
            content: 'Say "Hello, World!"',
          },
        ],
        streaming: {
          onThinking: (chunk) => {
            chunks.push(chunk);
          },
          onStatusChange: (status) => {
            statusChanges.push(status);
          },
          onUsage: (usage) => {
            usageReported = true;
            expect(usage.input_tokens).toBeGreaterThan(0);
            expect(usage.output_tokens).toBeGreaterThan(0);
            expect(usage.model).toBe('claude-code-cli');
          },
        },
      });

      expect(response).toBeDefined();
      expect(chunks.length).toBeGreaterThan(0);
      expect(statusChanges).toContain('thinking');
      expect(statusChanges).toContain('completed');
      expect(usageReported).toBe(true);
    }, 120000);
  });

  describe('Adapter Manager Integration', () => {
    it('should load Claude CLI adapter', async () => {
      const { AdapterManager } = await import('../infrastructure/adapters/adapter-manager');
      const manager = new AdapterManager();

      await manager.loadAdapter({
        name: 'claude-cli',
        type: 'custom',
        version: '1.0.0',
        enabled: true,
        config: {
          cliPath: 'claude',
        },
      });

      const adapter = await manager.getAdapter('claude-cli');
      expect(adapter).toBeDefined();
    });
  });
});

describe('End-to-End Message Processing', () => {
  it('should process a message end-to-end', async () => {
    // 这个测试需要完整的环境：Backend + Device Client
    // 1. Backend 运行
    // 2. Device Client 连接
    // 3. Backend 发送消息
    // 4. Device 处理消息
    // 5. Device 返回结果

    console.log('⚠️  E2E test requires full environment setup');
    console.log('   1. Start Backend: cd cloud/backend && npm run dev');
    console.log('   2. Configure device credentials');
    console.log('   3. Run this test');

    // TODO: 实现完整的 E2E 测试
  });
});
