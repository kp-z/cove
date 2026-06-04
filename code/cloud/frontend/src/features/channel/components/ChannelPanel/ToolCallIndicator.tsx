/**
 * ToolCallIndicator 组件
 * 显示工具调用信息
 */

import { FileText, Edit3, Terminal, Search, Code, Wrench } from 'lucide-react';

interface ToolCallIndicatorProps {
  toolName: string;
  params?: any;
}

// 工具图标映射
const TOOL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Read: FileText,
  Write: Edit3,
  Edit: Edit3,
  Bash: Terminal,
  Grep: Search,
  Glob: Search,
  WebSearch: Search,
  WebFetch: Code,
};

// 获取工具的显示名称
function getToolDisplayName(toolName: string): string {
  const displayNames: Record<string, string> = {
    Read: '读取文件',
    Write: '写入文件',
    Edit: '编辑文件',
    Bash: '执行命令',
    Grep: '搜索内容',
    Glob: '查找文件',
    WebSearch: '网络搜索',
    WebFetch: '获取网页',
  };
  return displayNames[toolName] || toolName;
}

// 提取关键参数用于显示
function extractKeyParams(toolName: string, params: any): string | null {
  if (!params) return null;

  switch (toolName) {
    case 'Read':
      return params.file_path ? `📄 ${params.file_path.split('/').pop()}` : null;
    case 'Write':
    case 'Edit':
      return params.file_path ? `📝 ${params.file_path.split('/').pop()}` : null;
    case 'Bash':
      return params.command ? `⚙️ ${params.command.slice(0, 40)}...` : null;
    case 'Grep':
    case 'Glob':
      return params.pattern ? `🔍 "${params.pattern}"` : null;
    case 'WebSearch':
      return params.query ? `🔍 "${params.query}"` : null;
    default:
      return null;
  }
}

export function ToolCallIndicator({ toolName, params }: ToolCallIndicatorProps) {
  const Icon = TOOL_ICONS[toolName] || Wrench;
  const displayName = getToolDisplayName(toolName);
  const keyParams = extractKeyParams(toolName, params);

  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0 text-purple-400" />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-purple-300">
          使用工具: {displayName}
        </div>
        {keyParams && (
          <div className="text-xs text-gray-400 mt-0.5 truncate">
            {keyParams}
          </div>
        )}
      </div>
    </div>
  );
}
