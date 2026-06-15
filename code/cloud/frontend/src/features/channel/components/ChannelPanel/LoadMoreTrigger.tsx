/**
 * LoadMoreTrigger - 滚动加载触发器
 *
 * 使用 IntersectionObserver 检测用户滚动到顶部时自动加载历史消息
 */

import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

interface LoadMoreTriggerProps {
  onLoadMore: () => void;
  isLoading: boolean;
  hasMore: boolean;
}

export function LoadMoreTrigger({ onLoadMore, isLoading, hasMore }: LoadMoreTriggerProps) {
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!triggerRef.current || isLoading || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    observer.observe(triggerRef.current);

    return () => observer.disconnect();
  }, [onLoadMore, isLoading, hasMore]);

  if (!hasMore) return null;

  return (
    <div ref={triggerRef} className="flex items-center justify-center py-4">
      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>加载历史消息...</span>
        </div>
      ) : (
        <div className="text-xs text-gray-600">向上滚动加载更多</div>
      )}
    </div>
  );
}
