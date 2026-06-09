/**
 * RealmConnectionMonitor - 监听 Realm 连接状态
 *
 * 当检测到后端断开连接时：
 * 1. 清除当前 realm 选择
 * 2. 显示通知（已由 useGlobalDeviceMonitor 处理）
 * 3. 导航回 realm 选择页面
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/core/auth/authStore';
import { logger } from '@/lib/logger';

export function RealmConnectionMonitor() {
  const navigate = useNavigate();
  const { currentRealmId, isAuthenticated, setCurrentRealmId } = useAuthStore();

  useEffect(() => {
    function handleRealmDisconnected(event: Event) {
      // 只在已登录且已选择 realm 的情况下处理
      if (!isAuthenticated || !currentRealmId) {
        return;
      }

      const customEvent = event as CustomEvent<{ realmId: string }>;
      const disconnectedRealmId = customEvent.detail?.realmId;

      // 只处理当前 realm 的断开事件
      if (disconnectedRealmId !== currentRealmId) {
        return;
      }

      logger.debug('[RealmConnectionMonitor] Current realm disconnected, redirecting to realm selection');

      // 清除当前 realm 选择
      setCurrentRealmId(null);

      // 导航回 realm 选择页面
      navigate('/select-realm', { replace: true });
    }

    // 监听断开事件
    window.addEventListener('realm:disconnected', handleRealmDisconnected);

    return () => {
      window.removeEventListener('realm:disconnected', handleRealmDisconnected);
    };
  }, [isAuthenticated, currentRealmId, navigate, setCurrentRealmId]);

  return null;
}
