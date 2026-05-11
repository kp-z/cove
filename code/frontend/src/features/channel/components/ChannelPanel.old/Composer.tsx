/**
 * Composer 组件
 *
 * 消息输入框和功能按钮
 * 位于 ChannelPanel 的最底部
 *
 * 功能：
 * - 多行文本输入（支持自动扩展）
 * - 发送按钮
 * - 停止生成按钮（流式输出时）
 * - 快捷键支持（Enter 发送，Shift+Enter 换行）
 * - 字符计数（可选）
 * - 附件上传（可选，TODO）
 *
 * 参考：claude_manager 的 AgentChatComposer 设计
 */

import React, { useRef, useEffect, useState, KeyboardEvent } from 'react';
import { Send, Square } from 'lucide-react';

/**
 * Composer 组件 Props
 *
 * @property value - 输入框的值
 * @property onChange - 输入框值变化回调
 * @property onSend - 发送消息回调
 * @property onStop - 停止生成回调（流式输出时）
 * @property isStreaming - 是否正在流式输出
 * @property disabled - 是否禁用输入（可选）
 * @property placeholder - 输入框占位符（可选）
 * @property maxLength - 最大字符数（可选）
 */
export interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}

/**
 * Composer 组件
 *
 * 布局结构：
 * ┌─────────────────────────────────────┐
 * │ [Textarea]                    [Send]│
 * │ Character count (optional)          │
 * └─────────────────────────────────────┘
 */
export const Composer: React.FC<ComposerProps> = ({
  value,
  onChange,
  onSend,
  onStop,
  isStreaming,
  disabled = false,
  placeholder = 'Type a message...',
  maxLength,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // 自动调整 textarea 高度
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // 重置高度以获取正确的 scrollHeight
    textarea.style.height = 'auto';

    // 设置新高度（最小 40px，最大 200px）
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 40), 200);
    textarea.style.height = `${newHeight}px`;
  }, [value]);

  // 处理键盘事件
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter 发送，Shift+Enter 换行
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled && !isStreaming) {
        onSend();
      }
    }
  };

  // 处理发送按钮点击
  const handleSendClick = () => {
    if (value.trim() && !disabled && !isStreaming) {
      onSend();
    }
  };

  // 处理停止按钮点击
  const handleStopClick = () => {
    if (isStreaming) {
      onStop();
    }
  };

  // 计算字符数
  const charCount = value.length;
  const isOverLimit = maxLength ? charCount > maxLength : false;

  return (
    <div className="flex flex-col border-t border-white/10 bg-[#0f111a]">
      {/* 输入区域 */}
      <div className="flex items-end gap-2 p-4">
        {/* 文本输入框 */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            placeholder={placeholder}
            maxLength={maxLength}
            className={`
              w-full px-4 py-2.5 rounded-xl resize-none
              bg-white/5 border transition-colors
              text-sm text-white/90 placeholder-white/40
              focus:outline-none
              ${
                isFocused
                  ? 'border-blue-500/50 bg-white/[0.07]'
                  : 'border-white/10'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              ${isOverLimit ? 'border-red-500/50' : ''}
            `}
            style={{
              minHeight: '40px',
              maxHeight: '200px',
            }}
            aria-label="Message input"
          />
        </div>

        {/* 发送/停止按钮 */}
        {isStreaming ? (
          // 停止生成按钮
          <button
            type="button"
            onClick={handleStopClick}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-500/20 hover:bg-red-500/30 active:bg-red-500/40 transition-colors shrink-0"
            aria-label="Stop generating"
            title="停止生成"
          >
            <Square size={18} className="text-red-400" />
          </button>
        ) : (
          // 发送按钮
          <button
            type="button"
            onClick={handleSendClick}
            disabled={disabled || !value.trim() || isOverLimit}
            className={`
              flex items-center justify-center w-10 h-10 rounded-xl
              transition-colors shrink-0
              ${
                disabled || !value.trim() || isOverLimit
                  ? 'bg-white/5 text-white/30 cursor-not-allowed'
                  : 'bg-blue-500/20 hover:bg-blue-500/30 active:bg-blue-500/40 text-blue-400'
              }
            `}
            aria-label="Send message"
            title="发送消息 (Enter)"
          >
            <Send size={18} />
          </button>
        )}
      </div>

      {/* 字符计数（如果设置了 maxLength） */}
      {maxLength && (
        <div className="px-4 pb-3">
          <p
            className={`text-xs text-right ${
              isOverLimit ? 'text-red-400' : 'text-white/40'
            }`}
          >
            {charCount} / {maxLength}
          </p>
        </div>
      )}

      {/* 快捷键提示 */}
      <div className="px-4 pb-3">
        <p className="text-xs text-white/30 text-center">
          <kbd className="px-1.5 py-0.5 rounded bg-white/5 text-white/40 font-mono text-[10px]">
            Enter
          </kbd>{' '}
          to send,{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-white/5 text-white/40 font-mono text-[10px]">
            Shift + Enter
          </kbd>{' '}
          for new line
        </p>
      </div>
    </div>
  );
};

// 使用 React.memo 优化性能
export default React.memo(Composer);
