/**
 * Adapter Bootstrap Interfaces
 *
 * Defines the contracts for automatic adapter detection, generation, and validation.
 */

import { AdapterType, AdapterScope } from '../../../domain/models/adapter/adapter-config.entity';

/**
 * Detection result from an adapter detector
 */
export interface DetectionResult {
  available: boolean;
  version?: string;
  path?: string;
  metadata?: Record<string, any>;
  reason?: string; // Reason if not available
}

/**
 * Context for adapter generation
 */
export interface GenerationContext {
  realmId: string;
  userId: string;
  deviceId: string;
  deviceName?: string;
}

/**
 * Draft adapter configuration (before saving to database)
 */
export interface AdapterConfigDraft {
  name: string;
  description: string;
  type: AdapterType;
  scope: AdapterScope;
  owner_id: string;
  config: Record<string, any>;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

/**
 * Duplicate check result
 */
export interface DuplicateCheckResult {
  exists: boolean;
  existingId?: string;
  existingConfig?: any;
}

/**
 * Bootstrap result
 */
export interface AdapterBootstrapResult {
  detected: DetectionResult[];
  created: Array<{ type: AdapterType; id: string; config: any }>;
  skipped: Array<{ type: AdapterType; reason: string }>;
  errors: Array<{ type: AdapterType; error: string }>;
}

/**
 * Adapter Detector Interface
 *
 * Detects whether a specific adapter type is available in the local environment.
 */
export interface IAdapterDetector {
  /**
   * The adapter type this detector handles
   */
  readonly type: AdapterType;

  /**
   * Detect if the adapter is available
   */
  detect(): Promise<DetectionResult>;
}

/**
 * Adapter Generator Interface
 *
 * Generates adapter configuration based on detection results.
 */
export interface IAdapterGenerator {
  /**
   * The adapter type this generator handles
   */
  readonly type: AdapterType;

  /**
   * Generate adapter configuration
   */
  generate(
    detection: DetectionResult,
    context: GenerationContext
  ): Promise<AdapterConfigDraft>;
}

/**
 * Adapter Validator Interface
 *
 * Validates adapter configurations and checks for duplicates.
 */
export interface IAdapterValidator {
  /**
   * Validate adapter configuration
   */
  validate(draft: AdapterConfigDraft): Promise<ValidationResult>;

  /**
   * Check if a similar adapter already exists
   */
  checkDuplicate(
    draft: AdapterConfigDraft,
    realmId: string
  ): Promise<DuplicateCheckResult>;
}
