/**
 * MessageStatus 组件
 * 显示消息状态（pending/sending/sent/failed/queued）
 * 使用图标清晰展示各种状态
 */

import { Loader2, AlertCircle, CheckCheck, Clock, Upload, RefreshCw } from 'lucide-react';
import { Message } from '../../domain/models/Message';

interface MessageStatusProps {
  message: Message;
  onRetry: () => void;
}

export function MessageStatus({ message, onRetry }: MessageStatusProps) {
  // 只显示本地消息的状态
  if (message.source !== 'local') {
    return null;
  }

  // 排队状态（离线）
  if (message.status === 'queued') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-yellow-400 mt-1">
        <Upload className="w-3.5 h-3.5" />
        <span>排队中，等待网络恢复</span>
      </div>
    );
  }

  // 等待发送
  if (message.status === 'pending') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
        <Clock className="w-3.5 h-3.5" />
        <span>等待发送</span>
      </div>
    );
  }

  // 发送中
  if (message.status === 'sending') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-blue-400 mt-1">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>发送中</span>
      </div>
    );
  }

  // 发送失败
  if (message.status === 'failed') {
    return (
      <div className="flex items-center gap-2 text-xs text-red-400 mt-1">
        <AlertCircle className="w-3.5 h-3.5" />
        <span>{message.error?.message || '发送失败'}</span>
        {message.canRetry() && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1 px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/30 transition-colors"
            title="重试发送"
          >
            <RefreshCw className="w-3 h-3" />
            <span>重试</span>
          </button>
        )}
      </div>
    );
  }

  // 发送成功（显示双勾）
  if (message.status === 'sent') {
    return (
      <div className="flex items-center gap-1 text-xs text-green-400 mt-1">
        <CheckCheck className="w-3.5 h-3.5" />
        <span className="opacity-70">已送达</span>
      </div>
    );
  }

  return null;
}
