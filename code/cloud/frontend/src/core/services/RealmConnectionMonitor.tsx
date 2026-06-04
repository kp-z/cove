/**
 * RealmConnectionMonitor - 监听 Realm 连接状态
 * 
 * 当检测到后端断开连接时：
 * 1. 清除当前 realm 选择
 * 2. 显示通知
 * 3. 导航回 realm 选择页面
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/core/auth/authStore';
import { notify } from './notificationService';

export function RealmConnectionMonitor() {
  const navigate = useNavigate();
  const { currentRealmId, isAuthenticated } = useAuthStore();

  useEffect(() => {
    function handleRealmDisconnected() {
      // 只在已登录且已选择 realm 的情况下处理
      if (!isAuthenticated || !currentRealmId) {
        return;
      }

      console.log('[RealmConnectionMonitor] Backend disconnected, redirecting to realm selection');

      // 显示通知
      notify.toast.warning(
        'Connection Lost',
        'The local device has disconnected. Please select a realm to continue.'
      );

      // 导航回登录页面（会自动显示 realm 选择器）
      navigate('/login', { replace: true });
    }

    // 监听断开事件
    window.addEventListener('realm:disconnected', handleRealmDisconnected);

    return () => {
      window.removeEventListener('realm:disconnected', handleRealmDisconnected);
    };
  }, [isAuthenticated, currentRealmId, navigate]);

  return null;
}
