/**
 * Adapter Bootstrap Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdapterBootstrapService } from './adapter-bootstrap.service';
import { ClaudeCodeCLIDetector } from './claude-code-cli-detector';
import { ClaudeCodeCLIGenerator } from './claude-code-cli-generator';
import { AdapterValidator } from './adapter-validator';
import { AdapterService } from './adapter.service';
import { ILogger } from '../../interfaces/logger.interface';
import {
  IAdapterDetector,
  IAdapterGenerator,
  DetectionResult,
  AdapterConfigDraft,
} from './adapter-bootstrap.interface';

describe('AdapterBootstrapService', () => {
  let service: AdapterBootstrapService;
  let mockAdapterService: AdapterService;
  let mockLogger: ILogger;
  let mockDetector: IAdapterDetector;
  let mockGenerator: IAdapterGenerator;
  let mockValidator: AdapterValidator;

  beforeEach(() => {
    mockAdapterService = {
      create: vi.fn(),
      list: vi.fn(),
    } as any;

    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as any;

    mockDetector = {
      type: 'claude-code-cli',
      detect: vi.fn(),
    };

    mockGenerator = {
      type: 'claude-code-cli',
      generate: vi.fn(),
    };

    mockValidator = {
      validate: vi.fn(),
      checkDuplicate: vi.fn(),
    } as any;

    service = new AdapterBootstrapService(
      [mockDetector],
      [mockGenerator],
      mockValidator,
      mockAdapterService,
      mockLogger
    );
  });

  describe('bootstrap', () => {
    it('should detect and create adapter when available', async () => {
      const detection: DetectionResult = {
        available: true,
        version: '1.0.0',
        path: '/usr/local/bin/claude',
      };

      const draft: AdapterConfigDraft = {
        name: 'Claude CLI (test-device)',
        description: 'Test adapter',
        type: 'claude-code-cli',
        scope: 'private',
        owner_id: 'user-1',
        config: { cli_path: '/usr/local/bin/claude' },
      };

      const created = {
        id: 'adapter-1',
        ...draft,
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(mockDetector.detect).mockResolvedValue(detection);
      vi.mocked(mockGenerator.generate).mockResolvedValue(draft);
      vi.mocked(mockValidator.validate).mockResolvedValue({ valid: true });
      vi.mocked(mockValidator.checkDuplicate).mockResolvedValue({ exists: false });
      vi.mocked(mockAdapterService.create).mockResolvedValue(created as any);

      const result = await service.bootstrap('realm-1', 'user-1', 'device-1', 'test-device');

      expect(result.detected).toHaveLength(1);
      expect(result.created).toHaveLength(1);
      expect(result.skipped).toHaveLength(0);
      expect(result.errors).toHaveLength(0);

      expect(result.created[0].type).toBe('claude-code-cli');
      expect(result.created[0].id).toBe('adapter-1');
    });

    it('should skip adapter when not available', async () => {
      const detection: DetectionResult = {
        available: false,
        reason: 'CLI not found',
      };

      vi.mocked(mockDetector.detect).mockResolvedValue(detection);

      const result = await service.bootstrap('realm-1', 'user-1', 'device-1');

      expect(result.detected).toHaveLength(1);
      expect(result.created).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.errors).toHaveLength(0);

      expect(result.skipped[0].type).toBe('claude-code-cli');
      expect(result.skipped[0].reason).toBe('CLI not found');
    });

    it('should skip adapter when validation fails', async () => {
      const detection: DetectionResult = {
        available: true,
        path: '/usr/local/bin/claude',
      };

      const draft: AdapterConfigDraft = {
        name: '',
        description: 'Test',
        type: 'claude-code-cli',
        scope: 'private',
        owner_id: 'user-1',
        config: {},
      };

      vi.mocked(mockDetector.detect).mockResolvedValue(detection);
      vi.mocked(mockGenerator.generate).mockResolvedValue(draft);
      vi.mocked(mockValidator.validate).mockResolvedValue({
        valid: false,
        errors: ['Name is required'],
      });

      const result = await service.bootstrap('realm-1', 'user-1', 'device-1');

      expect(result.detected).toHaveLength(1);
      expect(result.created).toHaveLength(0);
      expect(result.skipped).toHaveLength(0);
      expect(result.errors).toHaveLength(1);

      expect(result.errors[0].type).toBe('claude-code-cli');
      expect(result.errors[0].error).toContain('Name is required');
    });

    it('should skip adapter when duplicate exists', async () => {
      const detection: DetectionResult = {
        available: true,
        path: '/usr/local/bin/claude',
      };

      const draft: AdapterConfigDraft = {
        name: 'Claude CLI',
        description: 'Test',
        type: 'claude-code-cli',
        scope: 'private',
        owner_id: 'user-1',
        config: { cli_path: '/usr/local/bin/claude' },
      };

      vi.mocked(mockDetector.detect).mockResolvedValue(detection);
      vi.mocked(mockGenerator.generate).mockResolvedValue(draft);
      vi.mocked(mockValidator.validate).mockResolvedValue({ valid: true });
      vi.mocked(mockValidator.checkDuplicate).mockResolvedValue({
        exists: true,
        existingId: 'adapter-existing',
      });

      const result = await service.bootstrap('realm-1', 'user-1', 'device-1');

      expect(result.detected).toHaveLength(1);
      expect(result.created).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.errors).toHaveLength(0);

      expect(result.skipped[0].type).toBe('claude-code-cli');
      expect(result.skipped[0].reason).toContain('adapter-existing');
    });

    it('should handle detection errors gracefully', async () => {
      vi.mocked(mockDetector.detect).mockRejectedValue(new Error('Detection failed'));

      const result = await service.bootstrap('realm-1', 'user-1', 'device-1');

      expect(result.detected).toHaveLength(0);
      expect(result.created).toHaveLength(0);
      expect(result.skipped).toHaveLength(0);
      expect(result.errors).toHaveLength(1);

      expect(result.errors[0].type).toBe('claude-code-cli');
      expect(result.errors[0].error).toBe('Detection failed');
    });
  });

  describe('detectAvailableAdapters', () => {
    it('should return detection results for all detectors', async () => {
      const detection: DetectionResult = {
        available: true,
        version: '1.0.0',
        path: '/usr/local/bin/claude',
      };

      vi.mocked(mockDetector.detect).mockResolvedValue(detection);

      const results = await service.detectAvailableAdapters();

      expect(results).toHaveLength(1);
      expect(results[0].available).toBe(true);
      expect(results[0].version).toBe('1.0.0');
    });

    it('should handle detection errors', async () => {
      vi.mocked(mockDetector.detect).mockRejectedValue(new Error('Detection failed'));

      const results = await service.detectAvailableAdapters();

      expect(results).toHaveLength(1);
      expect(results[0].available).toBe(false);
      expect(results[0].reason).toBe('Detection failed');
    });
  });

  describe('generateAdapter', () => {
    it('should generate and create adapter for specific type', async () => {
      const detection: DetectionResult = {
        available: true,
        path: '/usr/local/bin/claude',
      };

      const draft: AdapterConfigDraft = {
        name: 'Claude CLI',
        description: 'Test',
        type: 'claude-code-cli',
        scope: 'private',
        owner_id: 'user-1',
        config: { cli_path: '/usr/local/bin/claude' },
      };

      const created = {
        id: 'adapter-1',
        ...draft,
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(mockDetector.detect).mockResolvedValue(detection);
      vi.mocked(mockGenerator.generate).mockResolvedValue(draft);
      vi.mocked(mockValidator.validate).mockResolvedValue({ valid: true });
      vi.mocked(mockValidator.checkDuplicate).mockResolvedValue({ exists: false });
      vi.mocked(mockAdapterService.create).mockResolvedValue(created as any);

      const result = await service.generateAdapter(
        'claude-code-cli',
        'realm-1',
        'user-1',
        'device-1'
      );

      expect(result.id).toBe('adapter-1');
      expect(mockAdapterService.create).toHaveBeenCalledWith(draft, 'user-1');
    });

    it('should throw error when adapter not available', async () => {
      const detection: DetectionResult = {
        available: false,
        reason: 'CLI not found',
      };

      vi.mocked(mockDetector.detect).mockResolvedValue(detection);

      await expect(
        service.generateAdapter('claude-code-cli', 'realm-1', 'user-1', 'device-1')
      ).rejects.toThrow('Adapter not available: CLI not found');
    });

    it('should throw error when validation fails', async () => {
      const detection: DetectionResult = {
        available: true,
        path: '/usr/local/bin/claude',
      };

      const draft: AdapterConfigDraft = {
        name: '',
        description: 'Test',
        type: 'claude-code-cli',
        scope: 'private',
        owner_id: 'user-1',
        config: {},
      };

      vi.mocked(mockDetector.detect).mockResolvedValue(detection);
      vi.mocked(mockGenerator.generate).mockResolvedValue(draft);
      vi.mocked(mockValidator.validate).mockResolvedValue({
        valid: false,
        errors: ['Name is required'],
      });

      await expect(
        service.generateAdapter('claude-code-cli', 'realm-1', 'user-1', 'device-1')
      ).rejects.toThrow('Validation failed: Name is required');
    });
  });
});
