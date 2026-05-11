/**
 * Composer 组件
 *
 * 消息输入框，支持：
 * - 发送消息
 * - 停止生成
 * - 快捷键（Cmd+Enter 发送）
 * - 自动聚焦
 * - Textarea 自动高度调整
 * - 草稿保存（localStorage）
 */

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';

// ============================================================================
// Props 定义
// ============================================================================

interface ComposerProps {
  /** 当前 Thread ID */
  threadId: string;

  /** 是否正在生成回复 */
  isGenerating: boolean;

  /** 发送消息回调 */
  onSend: (content: string) => void;

  /** 停止生成回调 */
  onStop: () => void;

  /** 占位符文本 */
  placeholder?: string;

  /** 自定义样式类名 */
  className?: string;
}

// ============================================================================
// 主组件
// ============================================================================

export function Composer({
  threadId,
  isGenerating,
  onSend,
  onStop,
  placeholder = '输入消息...',
  className = '',
}: ComposerProps) {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 草稿保存 key
  const draftKey = `composer-draft-${threadId}`;

  // --------------------------------------------------------------------------
  // 草稿保存和恢复
  // --------------------------------------------------------------------------

  // 加载草稿
  useEffect(() => {
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      setContent(savedDraft);
    }
  }, [draftKey]);

  // 保存草稿
  useEffect(() => {
    if (content) {
      localStorage.setItem(draftKey, content);
    } else {
      localStorage.removeItem(draftKey);
    }
  }, [content, draftKey]);

  // --------------------------------------------------------------------------
  // Textarea 自动高度调整
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (textareaRef.current) {
      // 重置高度以获取正确的 scrollHeight
      textareaRef.current.style.height = 'auto';
      // 设置新高度（最小 40px，最大 200px）
      const newHeight = Math.min(Math.max(textareaRef.current.scrollHeight, 40), 200);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [content]);

  // --------------------------------------------------------------------------
  // 自动聚焦
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (textareaRef.current && !isGenerating) {
      textareaRef.current.focus();
    }
  }, [threadId, isGenerating]);

  // --------------------------------------------------------------------------
  // 事件处理
  // --------------------------------------------------------------------------

  /**
   * 处理发送消息
   */
  const handleSend = () => {
    const trimmedContent = content.trim();
    if (!trimmedContent || isGenerating) return;

    onSend(trimmedContent);
    setContent('');
    localStorage.removeItem(draftKey);
  };

  /**
   * 处理停止生成
   */
  const handleStop = () => {
    onStop();
  };

  /**
   * 处理键盘事件
   */
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd+Enter 或 Ctrl+Enter 发送
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  // --------------------------------------------------------------------------
  // 渲染
  // --------------------------------------------------------------------------

  return (
    <div className={`border-t border-white/10 bg-[#1a1d2e] ${className}`}>
      <div className="flex items-end gap-1.5 p-3">
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isGenerating}
          className="flex-1 min-w-0 h-[34px] bg-white/5 border border-white/10 rounded-lg px-3 py-[6px] text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 resize-none leading-5 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          rows={1}
          style={{ minHeight: '34px', maxHeight: '120px' }}
        />

        {/* 发送/停止按钮 */}
        {isGenerating ? (
          <button
            onClick={handleStop}
            className="shrink-0 h-[34px] px-3 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/40 text-sm font-medium transition-colors focus:outline-none"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!content.trim()}
            className="shrink-0 h-[34px] px-3 rounded-lg bg-indigo-500/30 text-indigo-200 hover:bg-indigo-500/40 disabled:bg-white/5 disabled:text-gray-600 border border-indigo-500/40 disabled:border-white/10 text-sm font-medium transition-colors focus:outline-none disabled:cursor-not-allowed"
          >
            发送
          </button>
        )}
      </div>

      {/* 提示文本 */}
      <div className="px-3 pb-2 text-xs text-gray-500">
        按 {navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'}+Enter 发送
      </div>
    </div>
  );
}
