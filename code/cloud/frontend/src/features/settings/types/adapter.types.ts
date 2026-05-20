/**
 * Adapter Entity Types
 */

import type { AdapterConfig, AdapterType } from '@/features/agent/types/adapter.types';

export interface Adapter {
  id: string;
  name: string;
  description?: string;
  type: AdapterType;
  config: AdapterConfig;
  scope: 'shared' | 'private';
  owner_id?: string;
  created_at?: string;
  updated_at?: string;
}
