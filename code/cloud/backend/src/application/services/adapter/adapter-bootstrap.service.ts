/**
 * Adapter Bootstrap Service
 *
 * Orchestrates automatic adapter detection, generation, and creation.
 */

import {
  IAdapterDetector,
  IAdapterGenerator,
  IAdapterValidator,
  DetectionResult,
  GenerationContext,
  AdapterBootstrapResult,
} from './adapter-bootstrap.interface';
import { AdapterService } from './adapter.service';
import { AdapterType } from '../../../domain/models/adapter/adapter-config.entity';
import { ILogger } from '../../interfaces/logger.interface';

export class AdapterBootstrapService {
  constructor(
    private readonly detectors: IAdapterDetector[],
    private readonly generators: IAdapterGenerator[],
    private readonly validator: IAdapterValidator,
    private readonly adapterService: AdapterService,
    private readonly logger: ILogger
  ) {}

  /**
   * Bootstrap adapters for a realm
   * Detects available adapters and creates them if they don't exist
   */
  async bootstrap(
    realmId: string,
    userId: string,
    deviceId: string,
    deviceName?: string
  ): Promise<AdapterBootstrapResult> {
    this.logger.info('Starting adapter bootstrap', { realmId, userId, deviceId });

    const result: AdapterBootstrapResult = {
      detected: [],
      created: [],
      skipped: [],
      errors: [],
    };

    const context: GenerationContext = {
      realmId,
      userId,
      deviceId,
      deviceName,
    };

    // Detect all available adapters
    for (const detector of this.detectors) {
      try {
        this.logger.debug(`Detecting adapter: ${detector.type}`);
        const detection = await detector.detect();
        result.detected.push(detection);

        if (!detection.available) {
          this.logger.info(`Adapter not available: ${detector.type}`, {
            reason: detection.reason,
          });
          result.skipped.push({
            type: detector.type,
            reason: detection.reason || 'Not available',
          });
          continue;
        }

        // Generate configuration
        const generator = this.generators.find((g) => g.type === detector.type);
        if (!generator) {
          this.logger.warn(`No generator found for adapter type: ${detector.type}`);
          result.skipped.push({
            type: detector.type,
            reason: 'No generator available',
          });
          continue;
        }

        const draft = await generator.generate(detection, context);

        // Validate configuration
        const validation = await this.validator.validate(draft);
        if (!validation.valid) {
          this.logger.error(
            `Invalid adapter configuration: ${detector.type}`,
            undefined,
            { errors: validation.errors }
          );
          result.errors.push({
            type: detector.type,
            error: `Validation failed: ${validation.errors?.join(', ')}`,
          });
          continue;
        }

        // Check for duplicates
        const duplicateCheck = await this.validator.checkDuplicate(draft, realmId);
        if (duplicateCheck.exists) {
          this.logger.info(`Adapter already exists: ${detector.type}`, {
            existingId: duplicateCheck.existingId,
          });
          result.skipped.push({
            type: detector.type,
            reason: `Already exists (ID: ${duplicateCheck.existingId})`,
          });
          continue;
        }

        // Create adapter
        const created = await this.adapterService.create(draft, userId);
        this.logger.info(`Adapter created: ${detector.type}`, {
          id: created.id,
          name: created.name,
        });

        result.created.push({
          type: detector.type,
          id: created.id,
          config: created,
        });
      } catch (error) {
        this.logger.error(`Error bootstrapping adapter: ${detector.type}`, error as Error);
        result.errors.push({
          type: detector.type,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.logger.info('Adapter bootstrap complete', {
      detected: result.detected.length,
      created: result.created.length,
      skipped: result.skipped.length,
      errors: result.errors.length,
    });

    return result;
  }

  /**
   * Detect available adapters without creating them
   */
  async detectAvailableAdapters(): Promise<DetectionResult[]> {
    const results: DetectionResult[] = [];

    for (const detector of this.detectors) {
      try {
        const detection = await detector.detect();
        results.push(detection);
      } catch (error) {
        this.logger.error(`Error detecting adapter: ${detector.type}`, error as Error);
        results.push({
          available: false,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  /**
   * Generate adapter configuration for a specific type
   */
  async generateAdapter(
    type: AdapterType,
    realmId: string,
    userId: string,
    deviceId: string,
    deviceName?: string
  ): Promise<any> {
    const detector = this.detectors.find((d) => d.type === type);
    if (!detector) {
      throw new Error(`No detector found for adapter type: ${type}`);
    }

    const generator = this.generators.find((g) => g.type === type);
    if (!generator) {
      throw new Error(`No generator found for adapter type: ${type}`);
    }

    // Detect
    const detection = await detector.detect();
    if (!detection.available) {
      throw new Error(`Adapter not available: ${detection.reason}`);
    }

    // Generate
    const context: GenerationContext = {
      realmId,
      userId,
      deviceId,
      deviceName,
    };

    const draft = await generator.generate(detection, context);

    // Validate
    const validation = await this.validator.validate(draft);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors?.join(', ')}`);
    }

    // Check duplicate
    const duplicateCheck = await this.validator.checkDuplicate(draft, realmId);
    if (duplicateCheck.exists) {
      throw new Error(`Adapter already exists (ID: ${duplicateCheck.existingId})`);
    }

    // Create
    const created = await this.adapterService.create(draft, userId);
    return created;
  }
}
