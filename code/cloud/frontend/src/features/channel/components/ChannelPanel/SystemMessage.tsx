/**
 * SystemMessage 组件
 * 显示系统消息（居中显示）
 */

import { UserPlus, UserMinus, Info } from 'lucide-react';
import { Message } from '../../domain/models/Message';

interface SystemMessageProps {
  message: Message;
}

function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

export function SystemMessage({ message }: SystemMessageProps) {
  const getIcon = () => {
    if (message.content.includes('加入')) return <UserPlus className="w-3 h-3" />;
    if (message.content.includes('离开')) return <UserMinus className="w-3 h-3" />;
    return <Info className="w-3 h-3" />;
  };

  return (
    <div className="flex items-center justify-center py-2">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 border border-gray-700/50 rounded-full">
        <span className="text-gray-500">{getIcon()}</span>
        <span className="text-xs text-gray-400">{message.content}</span>
        <span className="text-xs text-gray-600">{formatTimestamp(message.timestamp)}</span>
      </div>
    </div>
  );
}
