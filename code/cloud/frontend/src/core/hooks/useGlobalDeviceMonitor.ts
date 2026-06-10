/**
 * useGlobalDeviceMonitor - 全局 Device 状态监控
 *
 * 职责：
 * - 订阅所有 realm 的 device 状态变化
 * - 更新 realmStore 中的 deviceStatus
 * - 当当前 realm device 断开时触发通知
 */

import { useEffect, useMemo, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/core/auth/authStore';
import { useRealmStore } from '@/core/stores/realmStore';
import { notify } from '@/core/services/notificationService';
import { logger } from '@/lib/logger';

const log = logger.scope('GlobalDeviceMonitor');

export function useGlobalDeviceMonitor() {
  const { isAuthenticated, currentRealmId } = useAuthStore();
  const { realms, setRealms } = useRealmStore();
  const previousStatusRef = useRef<Map<string, 'online' | 'offline'>>(new Map());
  const currentRealmIdRef = useRef<string | null>(currentRealmId);
  const subscribedRealmIds = useMemo(
    () => realms.map((realm) => realm.realmId),
    [realms]
  );

  useEffect(() => {
    currentRealmIdRef.current = currentRealmId;
  }, [currentRealmId]);

  // 订阅所有 realm 的 device 状态变化
  trpc.realm.subscribeDeviceStatus.useSubscription(
    subscribedRealmIds.length > 0 ? { realmIds: subscribedRealmIds } : undefined,
    {
      enabled: isAuthenticated && !!currentRealmId && subscribedRealmIds.length > 0,
      onData: (data) => {
        const { realmId, deviceStatus } = data;

        log.debug('Device status changed', {
          realmId,
          deviceStatus,
          isCurrentRealm: realmId === currentRealmIdRef.current,
        });

        // 更新 realmStore 中的 deviceStatus
        setRealms((previousRealms) =>
          previousRealms.map((r) =>
            r.realmId === realmId ? { ...r, deviceStatus } : r
          )
        );

        // 检查是否是当前 realm 且状态变为 offline
        const previousStatus = previousStatusRef.current.get(realmId);

        if (realmId === currentRealmIdRef.current && deviceStatus === 'offline' && previousStatus === 'online') {
          log.debug('Current realm device went offline, showing notification');

          // 显示 persistent notification（重要事件，不要用 toast）
          notify.persistent.warning(
            'Device Disconnected',
            'Your local device has disconnected. Please restart it or select another realm.'
          );

          // 触发自定义事件，让 RealmConnectionMonitor 处理导航
          window.dispatchEvent(new CustomEvent('realm:disconnected', {
            detail: { realmId },
          }));
        }

        // 更新状态缓存
        previousStatusRef.current.set(realmId, deviceStatus);
      },
      onError: (error) => {
        log.error('Subscription error', error);
      },
    },
  );

  // 清理：在组件卸载时清空缓存
  useEffect(() => {
    return () => {
      previousStatusRef.current.clear();
    };
  }, []);
}
