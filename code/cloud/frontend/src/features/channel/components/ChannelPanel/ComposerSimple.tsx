/**
 * ComposerSimple 组件
 * 简化版的消息输入框，集成输入状态和队列管理
 */

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { WifiOff, Clock } from 'lucide-react';
import { useSendMessage, useTypingState, useMessageQueue } from '../../hooks';

interface ComposerSimpleProps {
  channelId: string;
  placeholder?: string;
  className?: string;
}

export function ComposerSimple({ channelId, placeholder, className = '' }: ComposerSimpleProps) {
  const { t } = useTranslation('channel');
  const draftKey = `composer-draft-${channelId}`;

  const [content, setContent] = useState(() => {
    if (typeof window === 'undefined') return '';
    const savedDraft = localStorage.getItem(draftKey);
    return savedDraft || '';
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { send, isLoading } = useSendMessage();
  const { startTyping, stopTyping } = useTypingState(channelId);
  const { queueSize, isOnline } = useMessageQueue();

  // 保存草稿
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (content) {
      localStorage.setItem(draftKey, content);
    } else {
      localStorage.removeItem(draftKey);
    }
  }, [content, draftKey]);

  // 自动聚焦
  useEffect(() => {
    if (textareaRef.current && !isLoading) {
      textareaRef.current.focus();
    }
  }, [channelId, isLoading]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);

    if (e.target.value.trim()) {
      startTyping();
    } else {
      stopTyping();
    }
  };

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed || isLoading) return;

    await send(channelId, trimmed);
    setContent('');
    stopTyping();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`border-t border-gray-800 p-4 ${className}`}>
      {/* 网络状态提示 */}
      {!isOnline && (
        <div className="mb-2 flex items-center gap-2 text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded px-3 py-2">
          <WifiOff className="w-3 h-3" />
          <span>网络已断开，消息将在恢复后自动发送</span>
        </div>
      )}

      {/* 队列提示 */}
      {queueSize > 0 && (
        <div className="mb-2 flex items-center gap-2 text-xs text-blue-400 bg-blue-400/10 border border-blue-400/20 rounded px-3 py-2">
          <Clock className="w-3 h-3" />
          <span>{queueSize} 条消息等待发送</span>
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={stopTyping}
        placeholder={placeholder || '输入消息... (Cmd/Ctrl + Enter 发送)'}
        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-100 placeholder-gray-500"
        rows={3}
        disabled={isLoading}
      />

      <div className="flex justify-end mt-2">
        <button
          onClick={handleSend}
          disabled={!content.trim() || isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '发送中...' : '发送'}
        </button>
      </div>
    </div>
  );
}
