/**
 * Feature Flag Domain Interface
 */

export interface FeatureFlag {
  id: string;
  name: string;
  enabled: boolean;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeatureFlagConfig {
  realmId: string;
  flagName: string;
  name: string;
  enabled: boolean;
  mode: 'backend' | 'device';
  rolloutPercentage: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeatureFlagService {
  isEnabled(flagName: string): Promise<boolean>;
  getAll(): Promise<FeatureFlag[]>;
  enable(flagName: string): Promise<void>;
  disable(flagName: string): Promise<void>;
}
