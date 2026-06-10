/**
 * useGlobalDeviceMonitor - 全局 Device 状态监控
 *
 * 职责：
 * - 订阅当前用户拥有的所有 realm 的 device 状态变化
 * - 更新 realmStore 中的 deviceStatus（带去重，避免重渲染风暴）
 * - 当当前 realm device 断开时触发持久化通知与导航事件
 */

import { useEffect, useMemo, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/core/auth/authStore';
import { useRealmStore } from '@/core/stores/realmStore';
import { notify } from '@/core/services/notificationService';
import { logger } from '@/lib/logger';

const log = logger.scope('GlobalDeviceMonitor');

export function useGlobalDeviceMonitor() {
  // 步骤1：组件层仅订阅必要状态。
  //        - isAuthenticated / currentRealmId：控制订阅启用与“当前 realm”判定；
  //        - realms：用于计算需要订阅的 realmId 列表（精确订阅）。
  const { isAuthenticated, currentRealmId } = useAuthStore();
  const { realms, setRealms } = useRealmStore();
  const previousStatusRef = useRef<Map<string, 'online' | 'offline'>>(new Map());

  // 步骤2：用 ref 在订阅回调闭包里读取最新的 currentRealmId，避免闭包捕获到陈旧值。
  const currentRealmIdRef = useRef<string | null>(currentRealmId);
  useEffect(() => {
    currentRealmIdRef.current = currentRealmId;
  }, [currentRealmId]);

  // 步骤3：精确订阅——仅订阅当前用户拥有的 realmId 列表。
  //        先用“排序后拼接的字符串”作为稳定 key：只有列表内容真正变化时才生成新引用，
  //        从而避免 deviceStatus 高频更新（realms 数组引用频繁变化）引起的 re-subscribe 风暴。
  const subscribedRealmIdsKey = useMemo(
    () => realms.map((realm) => realm.realmId).sort().join(','),
    [realms]
  );
  const subscribedRealmIds = useMemo(
    () => (subscribedRealmIdsKey ? subscribedRealmIdsKey.split(',') : []),
    [subscribedRealmIdsKey]
  );

  // 订阅所有 realm 的 device 状态变化
  trpc.realm.subscribeDeviceStatus.useSubscription(
    subscribedRealmIds.length > 0 ? { realmIds: subscribedRealmIds } : undefined,
    {
      enabled: isAuthenticated && !!currentRealmId && subscribedRealmIds.length > 0,
      onData: (data) => {
        const { realmId, deviceStatus } = data;

        // 步骤4：去重写入——仅当该 realm 的 deviceStatus 真正发生变化时才更新 store。
        //        设备心跳/重复广播会高频触发本回调；若每次都生成新 realms 数组引用，
        //        会导致订阅 realmStore 的组件无谓重渲染（re-render 风暴）。
        //        在函数式更新器中比较旧值，无变化时返回原引用，zustand 即不会触发更新。
        setRealms((previousRealms) => {
          const target = previousRealms.find((r) => r.realmId === realmId);
          if (!target || target.deviceStatus === deviceStatus) {
            return previousRealms;
          }
          log.debug('Device status changed', {
            realmId,
            deviceStatus,
            isCurrentRealm: realmId === currentRealmIdRef.current,
          });
          return previousRealms.map((r) =>
            r.realmId === realmId ? { ...r, deviceStatus } : r
          );
        });

        // 步骤5：当前 realm 的设备由 online 变为 offline 时，弹出持久化警告并通知导航。
        const previousStatus = previousStatusRef.current.get(realmId);
        if (
          realmId === currentRealmIdRef.current &&
          deviceStatus === 'offline' &&
          previousStatus === 'online'
        ) {
          log.debug('Current realm device went offline, showing notification');

          // 显示 persistent notification（重要事件，不要用 toast）
          notify.persistent.warning(
            'Device Disconnected',
            'Your local device has disconnected. Please restart it or select another realm.'
          );

          // 触发自定义事件，让 RealmConnectionMonitor 处理导航
          window.dispatchEvent(
            new CustomEvent('realm:disconnected', {
              detail: { realmId },
            })
          );
        }

        // 步骤6：更新状态缓存，供下次边沿判断（online→offline）使用。
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
