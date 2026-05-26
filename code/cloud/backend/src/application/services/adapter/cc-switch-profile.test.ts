/**
 * CC-Switch Profile Integration Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CCSwithProfileDetector } from './cc-switch-profile-detector';
import { CCSwithProfileGenerator } from './cc-switch-profile-generator';
import { AdapterBootstrapService } from './adapter-bootstrap.service';
import { AdapterValidator } from './adapter-validator';
import { AdapterService } from './adapter.service';
import { ILogger } from '../../interfaces/logger.interface';

describe('CC-Switch Profile Integration', () => {
  let detector: CCSwithProfileDetector;
  let generator: CCSwithProfileGenerator;
  let validator: AdapterValidator;
  let adapterService: AdapterService;
  let bootstrapService: AdapterBootstrapService;
  let logger: ILogger;

  beforeEach(() => {
    // Mock logger
    logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    // Mock adapter service
    adapterService = {
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation((draft) => ({
        id: `adapter-${Date.now()}`,
        ...draft,
      })),
    } as any;

    // Create real instances
    detector = new CCSwithProfileDetector();
    generator = new CCSwithProfileGenerator(detector);
    validator = new AdapterValidator(adapterService);
    bootstrapService = new AdapterBootstrapService(
      [detector],
      [generator],
      validator,
      adapterService,
      logger
    );
  });

  describe('CCSwithProfileDetector', () => {
    it('should detect CC-Switch database if exists', async () => {
      const result = await detector.detect();

      // This test will pass/fail based on whether CC-Switch is installed
      if (result.available) {
        expect(result.version).toBe('cc-switch');
        expect(result.metadata?.profileCount).toBeGreaterThan(0);
        expect(result.metadata?.profiles).toBeDefined();
      } else {
        expect(result.reason).toBeDefined();
      }
    });

    it('should return profiles with correct structure', async () => {
      const profiles = await detector.getProfiles();

      // If CC-Switch is installed, verify profile structure
      if (profiles.length > 0) {
        const profile = profiles[0];
        expect(profile).toHaveProperty('id');
        expect(profile).toHaveProperty('name');
        expect(profile).toHaveProperty('app_type');
        expect(profile).toHaveProperty('settings_config');
        expect(profile.settings_config).toHaveProperty('env');
      }
    });
  });

  describe('CCSwithProfileGenerator', () => {
    it('should generate adapters for all profiles', async () => {
      const detection = await detector.detect();

      if (!detection.available) {
        // Skip if CC-Switch not installed
        return;
      }

      const context = {
        realmId: 'test-realm',
        userId: 'test-user',
        deviceId: 'test-device',
        deviceName: 'Test Device',
      };

      const drafts = await generator.generate(detection, context);
      const draftsArray = Array.isArray(drafts) ? drafts : [drafts];

      expect(draftsArray.length).toBeGreaterThan(0);

      // Verify each draft has correct structure
      for (const draft of draftsArray) {
        expect(draft.name).toContain('CC-Switch');
        expect(draft.type).toBe('claude-code-cli');
        expect(draft.scope).toBe('private');
        expect(draft.owner_id).toBe('test-user');
        expect(draft.config).toHaveProperty('cc_switch');
        expect(draft.config.cc_switch).toHaveProperty('profile_id');
        expect(draft.config.cc_switch).toHaveProperty('profile_name');
      }
    });

    it('should extract correct model names', async () => {
      const detection = await detector.detect();

      if (!detection.available) {
        return;
      }

      const context = {
        realmId: 'test-realm',
        userId: 'test-user',
        deviceId: 'test-device',
      };

      const drafts = await generator.generate(detection, context);
      const draftsArray = Array.isArray(drafts) ? drafts : [drafts];

      for (const draft of draftsArray) {
        expect(['opus', 'sonnet', 'haiku']).toContain(draft.config.model);
      }
    });
  });

  describe('AdapterBootstrapService with CC-Switch', () => {
    it('should bootstrap multiple adapters from CC-Switch profiles', async () => {
      const result = await bootstrapService.bootstrap(
        'test-realm',
        'test-user',
        'test-device',
        'Test Device'
      );

      // Verify result structure
      expect(result).toHaveProperty('detected');
      expect(result).toHaveProperty('created');
      expect(result).toHaveProperty('skipped');
      expect(result).toHaveProperty('errors');

      // If CC-Switch is installed, should have created adapters
      if (result.detected.length > 0 && result.detected[0].available) {
        expect(result.created.length).toBeGreaterThan(0);
      }
    });

    it('should skip duplicate profiles', async () => {
      // Mock existing adapter with CC-Switch profile
      vi.mocked(adapterService.list).mockResolvedValue([
        {
          id: 'existing-adapter',
          name: 'Test Profile (CC-Switch)',
          type: 'claude-code-cli',
          scope: 'private',
          owner_id: 'test-user',
          config: {
            cc_switch: {
              profile_id: 'test-profile-id',
              profile_name: 'Test Profile',
            },
          },
        } as any,
      ]);

      const result = await bootstrapService.bootstrap(
        'test-realm',
        'test-user',
        'test-device',
        'Test Device'
      );

      // Should skip profiles that already exist
      if (result.detected.length > 0 && result.detected[0].available) {
        expect(result.skipped.length).toBeGreaterThan(0);
      }
    });
  });

  describe('AdapterValidator with CC-Switch profiles', () => {
    it('should detect duplicates by profile_id', async () => {
      const draft = {
        name: 'Test Profile (CC-Switch)',
        description: 'Test',
        type: 'claude-code-cli' as const,
        scope: 'private' as const,
        owner_id: 'test-user',
        config: {
          cli_path: 'claude',
          cc_switch: {
            profile_id: 'duplicate-profile-id',
            profile_name: 'Test',
          },
        },
      };

      // Mock existing adapter with same profile_id
      vi.mocked(adapterService.list).mockResolvedValue([
        {
          id: 'existing',
          type: 'claude-code-cli',
          scope: 'private',
          config: {
            cc_switch: {
              profile_id: 'duplicate-profile-id',
            },
          },
        } as any,
      ]);

      const result = await validator.checkDuplicate(draft, 'test-realm');

      expect(result.exists).toBe(true);
      expect(result.existingId).toBe('existing');
    });

    it('should not detect duplicates for different profile_ids', async () => {
      const draft = {
        name: 'Test Profile (CC-Switch)',
        description: 'Test',
        type: 'claude-code-cli' as const,
        scope: 'private' as const,
        owner_id: 'test-user',
        config: {
          cli_path: 'claude',
          cc_switch: {
            profile_id: 'new-profile-id',
            profile_name: 'Test',
          },
        },
      };

      // Mock existing adapter with different profile_id
      vi.mocked(adapterService.list).mockResolvedValue([
        {
          id: 'existing',
          type: 'claude-code-cli',
          scope: 'private',
          config: {
            cc_switch: {
              profile_id: 'different-profile-id',
            },
          },
        } as any,
      ]);

      const result = await validator.checkDuplicate(draft, 'test-realm');

      expect(result.exists).toBe(false);
    });
  });
});
