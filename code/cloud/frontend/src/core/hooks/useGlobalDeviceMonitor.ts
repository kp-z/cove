/**
 * useGlobalDeviceMonitor - 全局 Device 状态监控
 *
 * 职责：
 * - 订阅所有 realm 的 device 状态变化
 * - 更新 realmStore 中的 deviceStatus
 * - 当当前 realm device 断开时触发通知
 */

import { useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/core/auth/authStore';
import { useRealmStore } from '@/core/stores/realmStore';
import { notify } from '@/core/services/notificationService';

export function useGlobalDeviceMonitor() {
  const { isAuthenticated, currentRealmId } = useAuthStore();
  const { realms, setRealms } = useRealmStore();
  const previousStatusRef = useRef<Map<string, 'online' | 'offline'>>(new Map());

  // 订阅所有 realm 的 device 状态变化
  trpc.realm.subscribeDeviceStatus.useSubscription(undefined, {
    enabled: isAuthenticated,
    onData: (data) => {
      const { realmId, deviceStatus } = data;

      console.log('[GlobalDeviceMonitor] Device status changed:', {
        realmId,
        deviceStatus,
        isCurrentRealm: realmId === currentRealmId,
      });

      // 更新 realmStore 中的 deviceStatus
      setRealms(
        realms.map((r) =>
          r.realmId === realmId ? { ...r, deviceStatus } : r
        )
      );

      // 检查是否是当前 realm 且状态变为 offline
      const previousStatus = previousStatusRef.current.get(realmId);

      if (realmId === currentRealmId && deviceStatus === 'offline' && previousStatus === 'online') {
        console.log('[GlobalDeviceMonitor] Current realm device went offline, showing notification');

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
      console.error('[GlobalDeviceMonitor] Subscription error:', error);
    },
  });

  // 清理：在组件卸载时清空缓存
  useEffect(() => {
    return () => {
      previousStatusRef.current.clear();
    };
  }, []);
}
