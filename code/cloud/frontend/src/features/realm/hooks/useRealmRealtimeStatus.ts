import { useEffect, useMemo, useRef, useState } from 'react';
import type { RealmInfo } from '@/features/realm/components';
import { trpc } from '@/lib/trpc';
import { useRealmStore } from '@/core/stores/realmStore';
import {
  applyDeviceStatusEvent,
  mergeRealmSnapshotPreserveStatus,
  normalizeRealmListResponse,
  replaceRealmSnapshot,
} from './realtimeStatus.utils';

interface UseRealmRealtimeStatusOptions {
  initialRealms: RealmInfo[];
  enabled: boolean;
}

const FALLBACK_POLLING_INTERVAL_MS = 10_000;

export function useRealmRealtimeStatus({ initialRealms, enabled }: UseRealmRealtimeStatusOptions) {
  const { realms, setRealms } = useRealmStore();
  const [isSubscriptionDegraded, setIsSubscriptionDegraded] = useState(false);
  const hasSubscriptionErrorRef = useRef(false);
  const isSubscriptionDegradedRef = useRef(false);
  const isControllerEnabled = enabled;

  useEffect(() => {
    isSubscriptionDegradedRef.current = isSubscriptionDegraded;
  }, [isSubscriptionDegraded]);

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

  const { data: realmListData, refetch: refetchRealmList } = trpc.realm.list.useQuery(
    { status: 'active' },
    {
      enabled: isControllerEnabled,
      staleTime: 0,
      refetchInterval: isSubscriptionDegraded ? FALLBACK_POLLING_INTERVAL_MS : false,
      refetchIntervalInBackground: true,
    }
  );

  useEffect(() => {
    if (!realmListData?.realms) {
      return;
    }

    const normalizedRealms = normalizeRealmListResponse(realmListData.realms);
    setRealms((previousRealms) => {
      if (isSubscriptionDegradedRef.current) {
        return replaceRealmSnapshot(normalizedRealms);
      }
      return mergeRealmSnapshotPreserveStatus(previousRealms, normalizedRealms);
    });
  }, [realmListData, setRealms]);

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
          hasSubscriptionErrorRef.current = false;
          void refetchRealmList()
            .then(() => {
              setIsSubscriptionDegraded(false);
            })
            .catch(() => {
              // 保持降级轮询，等待下一次连接恢复后重试校准
              hasSubscriptionErrorRef.current = true;
            });
        }
      },
      onError: () => {
        hasSubscriptionErrorRef.current = true;
        setIsSubscriptionDegraded(true);
      },
    }
  );

  useEffect(() => {
    if (!isControllerEnabled) {
      setIsSubscriptionDegraded(false);
      hasSubscriptionErrorRef.current = false;
    }
  }, [isControllerEnabled]);
}
