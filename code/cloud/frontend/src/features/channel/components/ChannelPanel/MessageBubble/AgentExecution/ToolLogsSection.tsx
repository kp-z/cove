import { memo, useMemo, useRef, useEffect } from 'react';
import { Wrench, ChevronDown } from 'lucide-react';
import { ToolLog } from '../../types';
import { ToolLogItem } from './ToolLogItem';

interface ToolLogsSectionProps {
  logs: ToolLog[];
  expanded: boolean;
  onToggle: () => void;
  isStreaming?: boolean;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export const ToolLogsSection = memo(function ToolLogsSection({
  logs,
  expanded,
  onToggle,
  isStreaming = false,
}: ToolLogsSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // 流式更新时自动滚动到底部
  useEffect(() => {
    if (isStreaming && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs.length, isStreaming]);

  // 缓存统计信息
  const stats = useMemo(() => {
    const successCount = logs.filter((l) => l.status === 'success').length;
    const errorCount = logs.filter((l) => l.status === 'error').length;
    const totalDuration = logs.reduce((sum, l) => sum + (l.duration || 0), 0);
    return { successCount, errorCount, totalDuration };
  }, [logs]);

  const VISIBLE_COUNT = 5;
  const hiddenCount = logs.length - VISIBLE_COUNT;
  const showCollapsed = hiddenCount > 0 && !expanded;
  const visibleLogs = showCollapsed ? logs.slice(-VISIBLE_COUNT) : logs;

  return (
    <div className="bg-blue-500/10 border-l-2 border-blue-500/50 rounded p-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Wrench className="w-3 h-3 text-blue-400" />
          <span className="text-xs text-blue-400 font-semibold">Tool Logs</span>
          <span className="text-xs text-gray-500">{logs.length} operations</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{stats.successCount} success</span>
          <span>{stats.errorCount} errors</span>
          <span>{formatDuration(stats.totalDuration)}</span>
        </div>
      </div>

      <div ref={containerRef} className="space-y-1 max-h-48 overflow-y-auto">
        {showCollapsed && (
          <button
            onClick={onToggle}
            className="text-xs text-gray-600 hover:text-gray-400 flex items-center gap-1"
          >
            <ChevronDown className="w-3 h-3" />
            <span>{hiddenCount} earlier operations hidden</span>
          </button>
        )}

        {visibleLogs.map((log) => (
          <ToolLogItem key={log.id} log={log} />
        ))}
      </div>
    </div>
  );
});
