import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';

interface ComposerProps {
  threadId: string;
  isGenerating: boolean;
  onSend: (content: string) => void;
  onStop: () => void;
  placeholder?: string;
  className?: string;
}

export function Composer({
  threadId,
  isGenerating,
  onSend,
  onStop,
  placeholder: placeholderProp,
  className = '',
}: ComposerProps) {
  const { t } = useTranslation('channel');
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const draftKey = `composer-draft-${threadId}`;
  const placeholder = placeholderProp ?? t('composer.placeholder');

  useEffect(() => {
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      setContent(savedDraft);
    }
  }, [draftKey]);

  useEffect(() => {
    if (content) {
      localStorage.setItem(draftKey, content);
    } else {
      localStorage.removeItem(draftKey);
    }
  }, [content, draftKey]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(Math.max(textareaRef.current.scrollHeight, 40), 200);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [content]);

  useEffect(() => {
    if (textareaRef.current && !isGenerating) {
      textareaRef.current.focus();
    }
  }, [threadId, isGenerating]);

  const handleSend = () => {
    const trimmedContent = content.trim();
    if (!trimmedContent || isGenerating) return;

    onSend(trimmedContent);
    setContent('');
    localStorage.removeItem(draftKey);
  };

  const handleStop = () => {
    onStop();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`border-t border-white/10 bg-[#1a1d2e] ${className}`}>
      <div className="flex items-end gap-1.5 p-3">
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
            {t('common:actions.send')}
          </button>
        )}
      </div>

      <div className="px-3 pb-2 text-xs text-gray-500">
        {t('composer.sendHint', { modifier: navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl' })}
      </div>
    </div>
  );
}
