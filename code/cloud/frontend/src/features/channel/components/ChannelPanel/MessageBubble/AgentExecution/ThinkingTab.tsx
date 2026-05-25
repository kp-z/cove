import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Brain, Loader2 } from 'lucide-react';

interface ThinkingTabProps {
  content: string;
  isStreaming?: boolean;
}

export const ThinkingTab = memo(function ThinkingTab({
  content,
  isStreaming = false,
}: ThinkingTabProps) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 text-purple-400">
        <Brain className="w-4 h-4" />
        <span className="text-sm font-semibold">Agent Thinking Process</span>
        {isStreaming && <Loader2 className="w-4 h-4 animate-spin" />}
      </div>

      {/* Content */}
      <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
        <div className="prose prose-sm prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        </div>
      </div>

      {/* Footer info */}
      <div className="text-xs text-gray-500">
        {content.length.toLocaleString()} characters
      </div>
    </div>
  );
});
