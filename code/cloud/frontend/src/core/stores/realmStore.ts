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

interface RealmState {
  // State
  realms: RealmInfo[];
  currentRealmId: string | null;

  // Actions
  setRealms: (realms: RealmInfo[] | ((previousRealms: RealmInfo[]) => RealmInfo[])) => void;
  setCurrentRealm: (realmId: string) => void;
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

  // Actions
  setRealms: (realmsOrUpdater) => {
    set((state) => ({
      realms: typeof realmsOrUpdater === 'function'
        ? realmsOrUpdater(state.realms)
        : realmsOrUpdater,
    }));
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

  clearRealms: () => {
    set({
      realms: [],
      currentRealmId: null,
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
    const { realms } = get();
    return realms.filter((r) => r.deviceStatus === 'online');
  },
}));
