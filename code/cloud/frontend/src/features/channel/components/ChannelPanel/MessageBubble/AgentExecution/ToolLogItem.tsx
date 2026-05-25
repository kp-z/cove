import { memo } from 'react';
import {
  FileEdit,
  FileText,
  Terminal,
  FilePlus,
  Search,
  FolderSearch,
  Bot,
  Globe,
  Wrench,
  Check,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { ToolLog } from '../../types';

interface ToolLogItemProps {
  log: ToolLog;
  expanded?: boolean;
}

const TOOL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Edit: FileEdit,
  Read: FileText,
  Bash: Terminal,
  Write: FilePlus,
  Grep: Search,
  Glob: FolderSearch,
  Agent: Bot,
  WebFetch: Globe,
  WebSearch: Search,
};

const TOOL_COLORS: Record<string, string> = {
  Edit: 'text-blue-400',
  Read: 'text-green-400',
  Bash: 'text-purple-400',
  Write: 'text-yellow-400',
  Grep: 'text-orange-400',
  Glob: 'text-cyan-400',
  Agent: 'text-pink-400',
  WebFetch: 'text-indigo-400',
  WebSearch: 'text-teal-400',
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatParams(params: Record<string, unknown>): string {
  if (params.file_path) return params.file_path as string;
  if (params.command) return params.command as string;
  if (params.pattern) return params.pattern as string;
  return Object.keys(params)[0] || '';
}

function StatusBadge({ status, result }: { status: ToolLog['status']; result?: ToolLog['result'] }) {
  const styles = {
    pending: 'text-gray-400',
    running: 'text-yellow-400 animate-pulse',
    success: 'text-green-400',
    error: 'text-red-400',
  };

  const icons = {
    pending: Loader2,
    running: Loader2,
    success: Check,
    error: X,
  };

  const Icon = icons[status];

  return (
    <div className="flex items-center gap-1">
      <Icon className={`w-3 h-3 shrink-0 ${styles[status]}`} />
      {status === 'error' && result?.error && (
        <div className="group relative">
          <AlertCircle className="w-3 h-3 text-red-400 shrink-0 cursor-help" />
          <div className="absolute bottom-full right-0 mb-1 hidden group-hover:block z-10 w-64 p-2 bg-gray-900 border border-red-500/30 rounded text-xs text-red-300 whitespace-pre-wrap">
            {result.error}
          </div>
        </div>
      )}
    </div>
  );
}

export const ToolLogItem = memo(function ToolLogItem({ log, expanded = false }: ToolLogItemProps) {
  const Icon = TOOL_ICONS[log.toolName] || Wrench;
  const iconColor = TOOL_COLORS[log.toolName] || 'text-gray-400';

  if (expanded) {
    // Expanded mode for modal
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${iconColor}`} />
            <span className="text-sm font-semibold text-white/90">{log.toolName}</span>
            {log.duration && (
              <span className="text-xs text-white/40">{formatDuration(log.duration)}</span>
            )}
          </div>
          <StatusBadge status={log.status} result={log.result} />
        </div>
        <div className="text-sm text-white/60 pl-6">
          {log.action}
          {log.params && Object.keys(log.params).length > 0 && (
            <span className="text-white/40"> · {formatParams(log.params)}</span>
          )}
        </div>
        {log.meta && (
          <div className="text-xs text-white/40 pl-6">
            {log.meta.fileCount !== undefined && `${log.meta.fileCount} files`}
            {log.meta.linesChanged !== undefined && ` · ${log.meta.linesChanged} lines changed`}
            {log.meta.exitCode !== undefined && ` · exit ${log.meta.exitCode}`}
          </div>
        )}
      </div>
    );
  }

  // Compact mode for inline display
  return (
    <div className="flex items-center gap-2 text-xs font-mono group hover:bg-white/5 rounded px-1 py-0.5 transition-colors">
      <Icon className={`w-3 h-3 shrink-0 ${iconColor}`} />
      <span className="text-gray-300 font-semibold">{log.toolName}</span>
      <span className="text-gray-500 truncate flex-1">{log.action}</span>

      {log.params && (
        <div className="group/tooltip relative">
          <span className="text-gray-600 truncate max-w-[200px] cursor-help">
            {formatParams(log.params)}
          </span>
          <div className="absolute bottom-full right-0 mb-1 hidden group-hover/tooltip:block z-10 w-64 p-2 bg-gray-900 border border-white/10 rounded text-xs text-gray-300 whitespace-pre-wrap">
            {JSON.stringify(log.params, null, 2)}
          </div>
        </div>
      )}

      {log.duration && (
        <span className="text-gray-500 shrink-0 tabular-nums">{formatDuration(log.duration)}</span>
      )}

      <StatusBadge status={log.status} result={log.result} />
    </div>
  );
});
