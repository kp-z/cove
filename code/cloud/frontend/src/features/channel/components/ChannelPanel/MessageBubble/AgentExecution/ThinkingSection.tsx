import { memo } from 'react';
import { Brain, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ThinkingSectionProps {
  content: string;
  isStreaming?: boolean;
}

export const ThinkingSection = memo(function ThinkingSection({
  content,
  isStreaming = false,
}: ThinkingSectionProps) {
  return (
    <div className="bg-purple-500/10 border-l-2 border-purple-500/50 rounded p-2">
      <div className="flex items-center gap-2 mb-1">
        <Brain className="w-3 h-3 text-purple-400" />
        <span className="text-xs text-purple-400 font-semibold">Thinking</span>
        {isStreaming && <Loader2 className="w-3 h-3 animate-spin text-purple-400" />}
      </div>
      <div className="text-xs prose prose-sm prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </div>
  );
});
