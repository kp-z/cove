import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { RealmInfo } from '@/features/realm/components';
import { trpc } from '@/lib/trpc';
import { useRealmStore } from '@/core/stores/realmStore';
import {
  applyDeviceStatusEvent,
  mergeRealmSnapshotPreserveStatus,
  normalizeRealmListResponse,
} from './realtimeStatus.utils';

interface UseRealmRealtimeStatusOptions {
  initialRealms: RealmInfo[];
  enabled: boolean;
}

export function useRealmRealtimeStatus({ initialRealms, enabled }: UseRealmRealtimeStatusOptions) {
  const { realms, setRealms } = useRealmStore();
  const hasSubscriptionErrorRef = useRef(false);
  const isResyncingRef = useRef(false);
  const isControllerEnabled = enabled;
  const utils = trpc.useUtils();

  const resyncRealmSnapshot = useCallback(async () => {
    if (!isControllerEnabled || isResyncingRef.current) {
      return;
    }

    isResyncingRef.current = true;
    try {
      const data = await utils.realm.list.fetch({ status: 'active' });
      if (!data?.realms) {
        return;
      }

      const normalizedRealms = normalizeRealmListResponse(data.realms);
      setRealms(normalizedRealms);
      hasSubscriptionErrorRef.current = false;
    } catch {
      // 保持错误标记，下次收到事件时继续尝试一次性校准。
      hasSubscriptionErrorRef.current = true;
    } finally {
      isResyncingRef.current = false;
    }
  }, [isControllerEnabled, setRealms, utils.realm.list]);

  // 步骤 1：初始化页面快照并与实时状态合并，避免旧快照覆盖当前在线状态。
  useEffect(() => {
    if (!isControllerEnabled) {
      return;
    }

    setRealms((previousRealms) =>
      mergeRealmSnapshotPreserveStatus(previousRealms, initialRealms)
    );
  }, [initialRealms, isControllerEnabled, setRealms]);

  const subscribedRealmIds = useMemo(
    () => realms.map((realm) => realm.realmId),
    [realms]
  );

  // 步骤 2：WebSocket 订阅优先，实时更新当前页面可见 realm 的设备状态。
  trpc.realm.subscribeDeviceStatus.useSubscription(
    isControllerEnabled && subscribedRealmIds.length > 0 ? { realmIds: subscribedRealmIds } : undefined,
    {
      enabled: isControllerEnabled && subscribedRealmIds.length > 0,
      onData: ({ realmId, deviceStatus }) => {
        setRealms((previousRealms) =>
          applyDeviceStatusEvent(previousRealms, realmId, deviceStatus)
        );

        // 步骤 3：连接恢复后做一次全量校准，修正断线期间可能遗漏的事件。
        if (hasSubscriptionErrorRef.current) {
          void resyncRealmSnapshot();
        }
      },
      onError: () => {
        hasSubscriptionErrorRef.current = true;
      },
    }
  );

  useEffect(() => {
    if (!isControllerEnabled) {
      hasSubscriptionErrorRef.current = false;
      isResyncingRef.current = false;
    }
  }, [isControllerEnabled]);
}
