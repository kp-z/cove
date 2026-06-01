/**
 * useDeviceStatus - Device 状态轮询 Hook
 *
 * 职责：
 * - 自动轮询 Device 状态
 * - 自动更新 realmStore
 * - 可配置轮询间隔
 */

import { trpc } from '@/lib/trpc';
import { useRealmStore } from '@/core/stores/realmStore';

interface UseDeviceStatusOptions {
  pollingInterval?: number;
  enabled?: boolean;
}

export function useDeviceStatus(
  realmId: string,
  options?: UseDeviceStatusOptions
) {
  const { updateDeviceStatus } = useRealmStore();

  const { data, isLoading, error } = trpc.realm.getDeviceStatus.useQuery(
    { realmId },
    {
      enabled: options?.enabled ?? true,
      refetchInterval: options?.pollingInterval ?? 30000, // 30秒
      onSuccess: (data) => {
        if (data) {
          updateDeviceStatus(realmId, {
            isOnline: data.isOnline || false,
            lastSeenAt: data.device?.lastSeenAt
              ? new Date(data.device.lastSeenAt)
              : undefined,
          });
        }
      },
    }
  );

  return {
    deviceStatus: data,
    isLoading,
    error,
  };
}
