/**
 * MessageStatus 组件
 * 显示消息状态（pending/sent/failed）
 */

import { Loader2, AlertCircle, Check } from 'lucide-react';
import { Message } from '../../domain/models/Message';

interface MessageStatusProps {
  message: Message;
  onRetry: () => void;
}

export function MessageStatus({ message, onRetry }: MessageStatusProps) {
  if (message.isPending()) {
    return (
      <div className="flex items-center gap-1 text-xs text-gray-400 mt-1 px-1">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>发送中</span>
      </div>
    );
  }

  if (message.isFailed()) {
    return (
      <div className="flex items-center gap-2 text-xs text-red-400 mt-1 px-1">
        <AlertCircle className="w-3 h-3" />
        <span>{message.error?.message || '发送失败'}</span>
        {message.canRetry() && (
          <button
            onClick={onRetry}
            className="text-blue-400 hover:text-blue-300 hover:underline transition-colors"
          >
            重试
          </button>
        )}
      </div>
    );
  }

  if (message.status === 'sent' && message.isLocal()) {
    return (
      <div className="flex items-center gap-1 text-xs text-green-400 mt-1 px-1 animate-fade-out">
        <Check className="w-3 h-3" />
      </div>
    );
  }

  return null;
}
