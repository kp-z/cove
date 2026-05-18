/**
 * ServerConfigRepository 单元测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ServerConfigRepository } from '../server-config.repository';
import { ServerEntity } from '../../../domain/models/server/server.entity';

describe('ServerConfigRepository', () => {
  const testRoot = path.join(process.cwd(), '.test-server-config');
  let repository: ServerConfigRepository;

  // 辅助函数：创建测试用的 ServerEntity
  const createTestServer = (overrides: Partial<Parameters<typeof ServerEntity.create>[0]> = {}) => {
    const now = new Date();
    return ServerEntity.create({
      server_id: 'server-001',
      name: 'test-server',
      display_name: 'Test Server',
      owner_id: 'user-001',
      status: 'active',
      visibility: 'public',
      settings: {
        allow_public_channels: true,
        allow_private_channels: true,
        allow_dm: true,
        require_approval: false,
        default_member_role: 'member',
      },
      limits: {
        max_members: 100,
        max_projects: 50,
        max_channels: 200,
        max_agents: 20,
        max_storage_gb: 10,
      },
      created_at: now,
      updated_at: now,
      meta: {},
      ...overrides,
    });
  };

  beforeEach(async () => {
    // 清理测试目录
    await fs.rm(testRoot, { recursive: true, force: true });
    await fs.mkdir(testRoot, { recursive: true });
  });

  afterEach(async () => {
    // 清理测试目录
    await fs.rm(testRoot, { recursive: true, force: true });
  });

  describe('本地模式', () => {
    beforeEach(() => {
      repository = new ServerConfigRepository({
        mode: 'local',
        localRoot: testRoot,
      });
    });

    it('应该保存和加载 Server 配置', async () => {
      const server = createTestServer({
        description: 'A test server',
        meta: {
          tags: ['test'],
          icon: 'icon.png',
        },
      });

      // 保存配置
      await repository.save(server);

      // 加载配置
      const loaded = await repository.load();
      expect(loaded).not.toBeNull();
      expect(loaded!.server_id).toBe('server-001');
      expect(loaded!.name).toBe('test-server');
      expect(loaded!.display_name).toBe('Test Server');
      expect(loaded!.owner_id).toBe('user-001');
      expect(loaded!.status).toBe('active');
      expect(loaded!.visibility).toBe('public');
    });

    it('应该在配置不存在时返回 null', async () => {
      const loaded = await repository.load();
      expect(loaded).toBeNull();
    });

    it('应该检查配置是否存在', async () => {
      const server = createTestServer();

      // 配置不存在
      expect(await repository.exists()).toBe(false);

      // 保存配置
      await repository.save(server);

      // 配置存在
      expect(await repository.exists()).toBe(true);
    });

    it('应该删除配置', async () => {
      const server = createTestServer();

      // 保存配置
      await repository.save(server);
      expect(await repository.exists()).toBe(true);

      // 删除配置
      await repository.delete('server-001');
      expect(await repository.exists()).toBe(false);
    });

    it('应该在删除不存在的配置时不抛出错误', async () => {
      await expect(repository.delete('non-existent')).resolves.not.toThrow();
    });

    it('应该在本地模式下调用 listAll 时抛出错误', async () => {
      await expect(repository.listAll()).rejects.toThrow(
        'listAll() is only available in cloud mode'
      );
    });
  });

  describe('云端模式', () => {
    beforeEach(() => {
      repository = new ServerConfigRepository({
        mode: 'cloud',
        cloudRoot: testRoot,
      });
    });

    it('应该保存和加载指定 Server 的配置', async () => {
      const server = createTestServer();

      // 保存配置
      await repository.save(server);

      // 加载配置
      const loaded = await repository.load('server-001');
      expect(loaded).not.toBeNull();
      expect(loaded!.server_id).toBe('server-001');
      expect(loaded!.name).toBe('test-server');
    });

    it('应该在云端模式下不传 serverId 时抛出错误', async () => {
      await expect(repository.load()).rejects.toThrow(
        'serverId is required in cloud mode'
      );
    });

    it('应该列出所有 Server', async () => {
      // 创建多个 Server
      const server1 = createTestServer({
        server_id: 'server-001',
        name: 'server-1',
        display_name: 'Server 1',
        owner_id: 'user-001',
      });

      const server2 = createTestServer({
        server_id: 'server-002',
        name: 'server-2',
        display_name: 'Server 2',
        owner_id: 'user-002',
        visibility: 'private',
      });

      await repository.save(server1);
      await repository.save(server2);

      // 列出所有 Server
      const serverIds = await repository.listAll();
      expect(serverIds).toHaveLength(2);
      expect(serverIds).toContain('server-001');
      expect(serverIds).toContain('server-002');
    });

    it('应该在没有 Server 时返回空数组', async () => {
      const serverIds = await repository.listAll();
      expect(serverIds).toEqual([]);
    });

    it('应该跳过没有 server.json 的目录', async () => {
      // 创建一个有 server.json 的目录
      const server = createTestServer();
      await repository.save(server);

      // 创建一个没有 server.json 的目录
      await fs.mkdir(path.join(testRoot, 'invalid-server'), { recursive: true });

      // 列出所有 Server
      const serverIds = await repository.listAll();
      expect(serverIds).toHaveLength(1);
      expect(serverIds).toContain('server-001');
      expect(serverIds).not.toContain('invalid-server');
    });
  });

  describe('配置文件格式', () => {
    beforeEach(() => {
      repository = new ServerConfigRepository({
        mode: 'local',
        localRoot: testRoot,
      });
    });

    it('应该保存完整的 Server 配置', async () => {
      const server = createTestServer({
        description: 'A test server',
        settings: {
          allow_public_channels: true,
          allow_private_channels: false,
          allow_dm: true,
          require_approval: true,
          default_member_role: 'guest',
        },
        limits: {
          max_members: 50,
          max_projects: 25,
          max_channels: 100,
          max_agents: 10,
          max_storage_gb: 5,
        },
        meta: {
          tags: ['production', 'important'],
          icon: 'server-icon.png',
          banner: 'server-banner.jpg',
        },
      });

      await repository.save(server);

      // 读取文件内容
      const configPath = path.join(testRoot, '.cove', 'server.json');
      const content = await fs.readFile(configPath, 'utf-8');
      const json = JSON.parse(content);

      // 验证配置格式
      expect(json.server_id).toBe('server-001');
      expect(json.name).toBe('test-server');
      expect(json.display_name).toBe('Test Server');
      expect(json.description).toBe('A test server');
      expect(json.owner_id).toBe('user-001');
      expect(json.status).toBe('active');
      expect(json.visibility).toBe('public');
      expect(json.settings.allow_public_channels).toBe(true);
      expect(json.settings.allow_private_channels).toBe(false);
      expect(json.settings.default_member_role).toBe('guest');
      expect(json.limits.max_members).toBe(50);
      expect(json.meta.tags).toEqual(['production', 'important']);
    });
  });
});
