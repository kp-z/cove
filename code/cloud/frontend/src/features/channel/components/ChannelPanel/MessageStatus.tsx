/**
 * MessageStatus 组件
 * 仅展示「发送失败 + 重试」入口。
 *
 * 设计说明（live feedback 改造）：
 * 为贴近真人即时聊天体验，正常/成功路径（pending/sending/sent「已送达」）不再展示
 * 任何状态行——用户消息发出后即时回显即可，无需「已送达」回执。离线排队提示由
 * Composer 顶部的全局横幅统一承担，故此处也不再逐条展示 queued 状态。
 * 唯一保留的是失败态及其重试按钮，确保发送失败时用户能感知并恢复。
 */

import { AlertCircle, RefreshCw } from 'lucide-react';
import { Message } from '../../domain/models/Message';

interface MessageStatusProps {
  message: Message;
  onRetry: () => void;
}

export function MessageStatus({ message, onRetry }: MessageStatusProps) {
  // 只处理本地消息，且仅在失败时展示。
  if (message.source !== 'local') {
    return null;
  }

  // 发送失败：展示错误信息 + 可重试入口。
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

  // 正常/成功/排队等状态：不展示状态行。
  return null;
}
