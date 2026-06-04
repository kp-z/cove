/**
 * ToolLogsDisplay 组件
 * 展示 Agent 的工具使用记录
 */

import { useState } from 'react';
import { Wrench, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import type { ToolLog } from '@/types/agent-execution';

interface ToolLogsDisplayProps {
  logs: ToolLog[];
}

export function ToolLogsDisplay({ logs }: ToolLogsDisplayProps) {
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  
  const toggleLog = (id: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedLogs(newExpanded);
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'running': return <Clock className="w-4 h-4 text-blue-400 animate-spin" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };
  
  return (
    <div className="mt-2 border border-purple-500/20 rounded-lg overflow-hidden bg-purple-500/5">
      <div className="px-3 py-2 border-b border-purple-500/20">
        <div className="flex items-center gap-2 text-sm text-purple-300">
          <Wrench className="w-4 h-4" />
          <span>工具使用记录 ({logs.length})</span>
        </div>
      </div>
      
      <div className="divide-y divide-purple-500/10">
        {logs.map((log) => {
          const isExpanded = expandedLogs.has(log.id);
          
          return (
            <div key={log.id}>
              <button
                onClick={() => toggleLog(log.id)}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-purple-500/10 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {getStatusIcon(log.status)}
                  <span className="text-sm font-medium text-gray-200">{log.toolName}</span>
                  <span className="text-xs text-gray-400">{log.action}</span>
                </div>
                <div className="flex items-center gap-2">
                  {log.duration && (
                    <span className="text-xs text-gray-400">{log.duration}ms</span>
                  )}
                  {isExpanded ? <ChevronUp className="w-3 h-3 text-gray-400" /> : <ChevronDown className="w-3 h-3 text-gray-400" />}
                </div>
              </button>
              
              {isExpanded && (
                <div className="px-3 py-2 bg-black/20 border-t border-purple-500/10 space-y-2">
                  {log.params && (
                    <div>
                      <div className="text-xs font-medium text-gray-400 mb-1">输入参数:</div>
                      <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono bg-black/30 p-2 rounded">
                        {JSON.stringify(log.params, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {log.result && (
                    <div>
                      <div className="text-xs font-medium text-gray-400 mb-1">执行结果:</div>
                      <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono bg-black/30 p-2 rounded max-h-40 overflow-auto">
                        {log.result.success || log.result.error || log.result.output}
                      </pre>
                    </div>
                  )}
                  
                  {log.meta && (
                    <div className="flex gap-4 text-xs text-gray-400">
                      {log.meta.fileCount !== undefined && <span>文件数: {log.meta.fileCount}</span>}
                      {log.meta.linesChanged !== undefined && <span>行数变更: {log.meta.linesChanged}</span>}
                      {log.meta.exitCode !== undefined && <span>退出码: {log.meta.exitCode}</span>}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
