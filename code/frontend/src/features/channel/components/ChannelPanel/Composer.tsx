import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Paperclip,
  Smile,
  AtSign,
  MessageSquare,
  Code,
  FileText,
  X,
  File,
  Wrench,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  Zap,
} from 'lucide-react';

type ComposerMode = 'normal' | 'code' | 'markdown';

interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
}

interface ComposerProps {
  threadId: string;
  isGenerating: boolean;
  onSend: (content: string) => void;
  onStop: () => void;
  placeholder?: string;
  className?: string;
}

type ToolActionId = 'attach' | 'emoji' | 'mention' | 'expand';

interface ToolActionOption {
  id: ToolActionId;
  label: string;
  desc: string;
  icon: typeof Paperclip;
}

const TOOL_ACTIONS: ToolActionOption[] = [
  { id: 'attach', label: '附件', desc: '上传文件到对话', icon: Paperclip },
  { id: 'emoji', label: '表情', desc: '插入表情符号', icon: Smile },
  { id: 'mention', label: '@提及', desc: '提及用户或频道', icon: AtSign },
  { id: 'expand', label: '展开输入框', desc: '增加输入区域高度', icon: Maximize2 },
];

interface ModeOption {
  id: ComposerMode;
  label: string;
  desc: string;
  icon: typeof MessageSquare;
}

const MODE_OPTIONS: ModeOption[] = [
  { id: 'normal', label: 'Normal', desc: '普通文本消息', icon: MessageSquare },
  { id: 'code', label: 'Code', desc: '代码块格式', icon: Code },
  { id: 'markdown', label: 'Markdown', desc: 'Markdown 格式', icon: FileText },
];

const MODE_ACCENTS: Record<ComposerMode, { trigger: string; icon: string; activeRow: string; inactiveRow: string; dot: string }> = {
  normal: {
    trigger: 'text-gray-400 hover:text-gray-300',
    icon: 'text-gray-400',
    activeRow: 'bg-gray-500/15 border-l-2 border-l-gray-400',
    inactiveRow: 'border-l-2 border-l-transparent hover:bg-gray-500/10',
    dot: 'bg-gray-400',
  },
  code: {
    trigger: 'text-indigo-400 hover:text-indigo-300',
    icon: 'text-indigo-400',
    activeRow: 'bg-indigo-500/15 border-l-2 border-l-indigo-400',
    inactiveRow: 'border-l-2 border-l-transparent hover:bg-indigo-500/10',
    dot: 'bg-indigo-400',
  },
  markdown: {
    trigger: 'text-emerald-400 hover:text-emerald-300',
    icon: 'text-emerald-400',
    activeRow: 'bg-emerald-500/15 border-l-2 border-l-emerald-400',
    inactiveRow: 'border-l-2 border-l-transparent hover:bg-emerald-500/10',
    dot: 'bg-emerald-400',
  },
};

export function Composer({
  threadId,
  isGenerating,
  onSend,
  onStop,
  placeholder: placeholderProp,
  className = '',
}: ComposerProps) {
  const { t } = useTranslation('channel');
  const draftKey = `composer-draft-${threadId}`;

  // Initialize content from localStorage
  const [content, setContent] = useState(() => {
    const savedDraft = localStorage.getItem(draftKey);
    return savedDraft || '';
  });
  const [mode, setMode] = useState<ComposerMode>('normal');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [expandedInput, setExpandedInput] = useState(false);
  const [toolMenuOpen, setToolMenuOpen] = useState(false);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toolMenuRef = useRef<HTMLDivElement>(null);
  const modeMenuRef = useRef<HTMLDivElement>(null);

  const placeholder = placeholderProp ?? t('composer.placeholder');

  // Save draft to localStorage when content changes
  useEffect(() => {
    if (content) {
      localStorage.setItem(draftKey, content);
    } else {
      localStorage.removeItem(draftKey);
    }
  }, [content, draftKey]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      const el = textareaRef.current;
      el.style.height = 'auto';
      const limit = expandedInput ? 256 : 120;
      const newHeight = Math.min(el.scrollHeight, limit);
      el.style.height = `${newHeight}px`;
    }
  }, [content, expandedInput]);

  // Focus textarea when not generating
  useEffect(() => {
    if (textareaRef.current && !isGenerating) {
      textareaRef.current.focus();
    }
  }, [threadId, isGenerating]);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolMenuRef.current && !toolMenuRef.current.contains(e.target as Node)) {
        setToolMenuOpen(false);
      }
      if (modeMenuRef.current && !modeMenuRef.current.contains(e.target as Node)) {
        setModeMenuOpen(false);
      }
    };
    if (toolMenuOpen || modeMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [toolMenuOpen, modeMenuOpen]);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAttachFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newAttachments: Attachment[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: file.name,
      size: file.size,
      type: file.type,
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);
    e.target.value = ''; // Reset input
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((att) => att.id !== id));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const toggleExpandedInput = () => {
    setExpandedInput(v => !v);
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        const el = textareaRef.current;
        el.style.height = 'auto';
        const limit = !expandedInput ? 256 : 120;
        el.style.height = Math.min(el.scrollHeight, limit) + 'px';
        el.focus();
      }
    });
  };

  const handleToolAction = (actionId: ToolActionId) => {
    switch (actionId) {
      case 'attach':
        handleAttachFile();
        break;
      case 'emoji':
        // TODO: Implement emoji picker
        break;
      case 'mention':
        // TODO: Implement mention picker
        break;
      case 'expand':
        toggleExpandedInput();
        break;
    }
    setToolMenuOpen(false);
  };

  const activeMode = MODE_OPTIONS.find(m => m.id === mode);
  const ActiveModeIcon = activeMode?.icon || MessageSquare;
  const modeAccent = MODE_ACCENTS[mode];

  const computedPlaceholder = useMemo(() => {
    if (isGenerating) return 'AI 正在回复...';
    return placeholder;
  }, [placeholder, isGenerating]);

  return (
    <div className={`border-t border-white/10 bg-[#1a1d2e] ${className}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Attachment Preview Area */}
      {attachments.length > 0 && (
        <div className="px-3 pt-3 pb-2">
          <div className="bg-white/5 border border-white/10 rounded-lg p-2">
            <div className="text-xs text-gray-400 mb-2">
              Attachments ({attachments.length})
            </div>
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {attachments.map((attachment) => {
                const isImage = attachment.type.startsWith('image/');
                return (
                  <div
                    key={attachment.id}
                    className="relative flex items-center gap-2 min-w-[200px] bg-white/5 border border-white/10 rounded-lg p-2 group"
                  >
                    {/* Icon or thumbnail */}
                    <div className="shrink-0 w-10 h-10 rounded bg-indigo-500/20 flex items-center justify-center">
                      {isImage ? (
                        <FileText className="w-5 h-5 text-indigo-400" />
                      ) : (
                        <File className="w-5 h-5 text-gray-400" />
                      )}
                    </div>

                    {/* File info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-200 truncate">{attachment.name}</div>
                      <div className="text-xs text-gray-500">{formatFileSize(attachment.size)}</div>
                    </div>

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(attachment.id)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500/80 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end gap-1.5 p-3">
        {/* Tool Menu Button */}
        <div className="relative" ref={toolMenuRef}>
          <button
            type="button"
            className={`shrink-0 h-[34px] w-[34px] flex items-center justify-center rounded-lg border transition-colors ${
              expandedInput
                ? 'text-indigo-400 border-indigo-500/50 bg-indigo-500/10 hover:bg-indigo-500/20'
                : 'text-gray-500 border-white/10 hover:text-gray-300 hover:border-white/20 hover:bg-white/5'
            }`}
            onClick={() => setToolMenuOpen(v => !v)}
            title="工具"
            disabled={isGenerating}
          >
            <Wrench className="w-3.5 h-3.5" />
          </button>
          {toolMenuOpen && (
            <div className="absolute bottom-full left-0 mb-1 w-52 bg-[#151722] border border-white/10 rounded-lg shadow-xl shadow-black/40 py-1 z-50">
              {TOOL_ACTIONS.map(action => {
                const isActive = action.id === 'expand' && expandedInput;
                const Icon = action.id === 'expand' ? (expandedInput ? Minimize2 : Maximize2) : action.icon;
                const iconColor = action.id === 'attach' ? 'text-emerald-400' : action.id === 'expand' ? 'text-indigo-400' : 'text-gray-400';
                return (
                  <button
                    key={action.id}
                    type="button"
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                      isActive ? 'bg-white/10' : 'hover:bg-white/5'
                    }`}
                    onClick={() => handleToolAction(action.id)}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} />
                    <div className="min-w-0">
                      <div className={`text-xs font-medium ${isActive ? 'text-white' : 'text-white/80'}`}>
                        {action.id === 'expand' && expandedInput ? '收起输入框' : action.label}
                      </div>
                      <div className="text-[10px] text-white/40">{action.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Mode Switcher Button */}
        <div className="relative" ref={modeMenuRef}>
          <button
            type="button"
            className={`shrink-0 h-[34px] w-[34px] flex items-center justify-center rounded-lg border transition-colors border-white/10 hover:border-white/20 hover:bg-white/5 ${modeAccent.trigger}`}
            onClick={() => setModeMenuOpen(v => !v)}
            title={activeMode?.label}
            disabled={isGenerating}
          >
            <ActiveModeIcon className="w-3.5 h-3.5" />
          </button>
          {modeMenuOpen && (
            <div className="absolute bottom-full left-0 mb-1 w-48 bg-[#151722] border border-white/10 rounded-lg shadow-xl shadow-black/40 py-1 z-50">
              {MODE_OPTIONS.map(modeOption => {
                const Icon = modeOption.icon;
                const isActive = mode === modeOption.id;
                const accent = MODE_ACCENTS[modeOption.id];
                return (
                  <button
                    key={modeOption.id}
                    type="button"
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                      isActive ? accent.activeRow : accent.inactiveRow
                    }`}
                    onClick={() => { setMode(modeOption.id); setModeMenuOpen(false); }}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? accent.icon : 'text-white/55'}`} />
                    <div className="min-w-0">
                      <div className={`text-xs font-medium ${isActive ? 'text-white' : 'text-white/80'}`}>
                        {modeOption.label}
                      </div>
                      <div className="text-[10px] text-white/40">{modeOption.desc}</div>
                    </div>
                    {isActive && (
                      <div className={`ml-auto w-1.5 h-1.5 rounded-full shrink-0 ${accent.dot}`} />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={computedPlaceholder}
          disabled={isGenerating}
          className="flex-1 min-w-0 h-[34px] bg-white/5 border border-white/10 rounded-lg px-3 py-[6px] text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 resize-none leading-5 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          rows={1}
          style={{
            minHeight: expandedInput ? '10rem' : '34px',
            maxHeight: expandedInput ? '16rem' : '7.5rem',
          }}
        />

        {/* Send/Stop Button */}
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

      {/* Send Hint */}
      <div className="px-3 pb-2 text-xs text-gray-500">
        {t('composer.sendHint', { modifier: navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl' })}
      </div>
    </div>
  );
}
