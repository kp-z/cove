import { describe, it, expect } from 'vitest';
import { ServerEntity } from './server.entity';

describe('ServerEntity', () => {
  const validProps = {
    serverId: 'server-001',
    name: 'slock-prod-01',
    description: 'Slock 生产环境主服务器',
    projectId: 'project-001',
    type: 'cloud' as const,
    provider: 'aws' as const,
    region: 'us-west-2',
    instanceType: 't3.xlarge',
    resources: {
      cpuCores: 4,
      memoryGb: 16,
      diskGb: 100,
      gpuCount: 0,
    },
    network: {
      hostname: 'slock-prod-01.example.com',
      ipAddress: '10.0.1.100',
      port: 443,
      protocol: 'https' as const,
      domain: 'api.slock.example.com',
    },
    security: {
      sshEnabled: true,
      sshPort: 22,
      sslEnabled: true,
      sslCertPath: '/etc/ssl/certs/slock.crt',
    },
    limits: {
      maxAgents: 50,
      maxConcurrentExecutions: 100,
      maxMemoryPerAgentGb: 4,
    },
    status: 'running' as const,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-05-07T01:00:00Z'),
    startedAt: new Date('2026-01-01T00:30:00Z'),
    meta: {
      tags: ['production', 'primary'],
      environment: 'prod',
      costCenter: 'engineering',
      owner: 'devops-team',
    },
  };

  describe('create', () => {
    it('should create a valid server entity', () => {
      const server = ServerEntity.create(validProps);
      expect(server.serverId).toBe('server-001');
      expect(server.name).toBe('slock-prod-01');
      expect(server.status).toBe('running');
    });

    it('should throw error if serverId is empty', () => {
      expect(() =>
        ServerEntity.create({ ...validProps, serverId: '' })
      ).toThrow('Server ID cannot be empty');
    });

    it('should throw error if resources are invalid', () => {
      expect(() =>
        ServerEntity.create({
          ...validProps,
          resources: { ...validProps.resources, cpuCores: 0 },
        })
      ).toThrow('CPU cores must be greater than 0');
    });
  });

  describe('status checks', () => {
    it('should correctly identify status', () => {
      const server = ServerEntity.create(validProps);
      expect(server.isRunning()).toBe(true);
      expect(server.isStopped()).toBe(false);
      expect(server.canStartAgents()).toBe(true);
    });
  });

  describe('status transitions', () => {
    it('should start server', () => {
      const server = ServerEntity.create({
        ...validProps,
        status: 'stopped',
      });
      const updated = server.start();
      expect(updated.status).toBe('running');
      expect(updated.startedAt).toBeDefined();
    });

    it('should stop server', () => {
      const server = ServerEntity.create(validProps);
      const updated = server.stop();
      expect(updated.status).toBe('stopped');
      expect(updated.stoppedAt).toBeDefined();
    });

    it('should enter maintenance', () => {
      const server = ServerEntity.create(validProps);
      const updated = server.enterMaintenance();
      expect(updated.status).toBe('maintenance');
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      const server = ServerEntity.create(validProps);
      const json = server.toJSON();
      expect(json.server_id).toBe('server-001');
      expect(json.status).toBe('running');
    });

    it('should deserialize from JSON', () => {
      const server = ServerEntity.create(validProps);
      const json = server.toJSON();
      const deserialized = ServerEntity.fromJSON(json);
      expect(deserialized.serverId).toBe(server.serverId);
    });
  });
});
