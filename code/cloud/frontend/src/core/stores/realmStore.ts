/**
 * Realm Store - Realm 状态管理
 *
 * 职责：
 * - 管理 Realm 列表
 * - 管理当前选中的 Realm
 * - 管理 Device 状态
 * - 提供 selector 方法
 *
 * 设计原则：
 * - 高内聚：Realm 相关的所有状态都在这里
 * - 自动同步：切换 Realm 时自动同步到后端
 */

import { create } from 'zustand';
import { trpc } from '@/lib/trpc';
import type { RealmInfo } from '@/features/realm/components/RealmCard';

interface DeviceStatus {
  isOnline: boolean;
  lastSeenAt?: Date;
}

interface RealmState {
  // State
  realms: RealmInfo[];
  currentRealmId: string | null;
  deviceStatuses: Record<string, DeviceStatus>;

  // Actions
  setRealms: (realms: RealmInfo[]) => void;
  setCurrentRealm: (realmId: string) => void;
  updateDeviceStatus: (realmId: string, status: DeviceStatus) => void;
  clearRealms: () => void;

  // Selectors
  getCurrentRealm: () => RealmInfo | null;
  getRealmById: (realmId: string) => RealmInfo | null;
  getOnlineRealms: () => RealmInfo[];
}

export const useRealmStore = create<RealmState>((set, get) => ({
  // Initial state
  realms: [],
  currentRealmId: null,
  deviceStatuses: {},

  // Actions
  setRealms: (realms) => {
    set({ realms });
  },

  setCurrentRealm: async (realmId) => {
    set({ currentRealmId: realmId });

    // Store in localStorage for tRPC headers
    localStorage.setItem('current_realm_id', realmId);

    // 同步到后端使用 tRPC client
    try {
      const { trpcClient } = await import('@/lib/trpc');
      await trpcClient.user.updatePreferences.mutate({
        lastAccessedRealmId: realmId,
      });
    } catch (err) {
      console.error('Failed to update last accessed realm:', err);
    }
  },

  updateDeviceStatus: (realmId, status) => {
    set((state) => ({
      deviceStatuses: {
        ...state.deviceStatuses,
        [realmId]: status,
      },
    }));
  },

  clearRealms: () => {
    set({
      realms: [],
      currentRealmId: null,
      deviceStatuses: {},
    });
  },

  // Selectors
  getCurrentRealm: () => {
    const { realms, currentRealmId } = get();
    return realms.find((r) => r.realmId === currentRealmId) || null;
  },

  getRealmById: (realmId) => {
    return get().realms.find((r) => r.realmId === realmId) || null;
  },

  getOnlineRealms: () => {
    const { realms, deviceStatuses } = get();
    return realms.filter((r) => deviceStatuses[r.realmId]?.isOnline);
  },
}));
