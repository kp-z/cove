import { memo, useMemo } from 'react';
import { Wrench, Loader2 } from 'lucide-react';
import type { ToolLog } from '../../types';
import { ToolLogItem } from './ToolLogItem';

interface ToolsTabProps {
  logs: ToolLog[];
  isStreaming?: boolean;
}

export const ToolsTab = memo(function ToolsTab({
  logs,
  isStreaming = false,
}: ToolsTabProps) {
  // Calculate statistics
  const stats = useMemo(() => {
    const successCount = logs.filter(l => l.status === 'success').length;
    const errorCount = logs.filter(l => l.status === 'error').length;
    const runningCount = logs.filter(l => l.status === 'running').length;
    const pendingCount = logs.filter(l => l.status === 'pending').length;
    const totalDuration = logs.reduce((sum, l) => sum + (l.duration || 0), 0);

    return {
      successCount,
      errorCount,
      runningCount,
      pendingCount,
      totalDuration,
    };
  }, [logs]);

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="space-y-3">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-blue-400">
          <Wrench className="w-4 h-4" />
          <span className="text-sm font-semibold">Tool Usage Logs</span>
          {isStreaming && <Loader2 className="w-4 h-4 animate-spin" />}
        </div>
        <div className="flex items-center gap-3 text-xs">
          {stats.successCount > 0 && (
            <span className="text-green-400">{stats.successCount} success</span>
          )}
          {stats.errorCount > 0 && (
            <span className="text-red-400">{stats.errorCount} errors</span>
          )}
          {stats.runningCount > 0 && (
            <span className="text-yellow-400">{stats.runningCount} running</span>
          )}
          {stats.pendingCount > 0 && (
            <span className="text-gray-400">{stats.pendingCount} pending</span>
          )}
          {stats.totalDuration > 0 && (
            <span className="text-gray-500">Total: {formatDuration(stats.totalDuration)}</span>
          )}
        </div>
      </div>

      {/* Tool logs list */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 space-y-1 max-h-[500px] overflow-y-auto">
        {logs.map((log) => (
          <ToolLogItem key={log.id} log={log} />
        ))}
      </div>

      {/* Footer info */}
      <div className="text-xs text-gray-500">
        {logs.length} tool {logs.length === 1 ? 'operation' : 'operations'}
      </div>
    </div>
  );
});
