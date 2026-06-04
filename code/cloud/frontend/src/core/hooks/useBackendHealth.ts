/**
 * useBackendHealth - 检测后端健康状态
 * 
 * 用于在登录页面显示后端连接状态指示灯
 */

import { useState, useEffect } from 'react';
import { env } from '@/core/config/env';

export type BackendStatus = 'online' | 'offline' | 'checking';

export function useBackendHealth() {
  const [status, setStatus] = useState<BackendStatus>('checking');

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    async function checkHealth() {
      if (!isMounted) return;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

        const response = await fetch(`${env.apiUrl}/health`, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (isMounted) {
          setStatus(response.ok ? 'online' : 'offline');
        }
      } catch (error) {
        if (isMounted) {
          setStatus('offline');
        }
      }
    }

    // 初始检查
    checkHealth();

    // 每 10 秒检查一次
    const intervalId = setInterval(checkHealth, 10000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, []);

  return status;
}
