import { memo, useReducer } from 'react';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { AgentMetadata } from '../../types';
import { ThinkingSection } from './ThinkingSection';
import { ToolLogsSection } from './ToolLogsSection';
import { UsageSection } from './UsageSection';

interface AgentExecutionPanelProps {
  metadata: AgentMetadata;
  isStreaming?: boolean;
}

interface ExecutionPanelState {
  expanded: boolean;
  logsExpanded: boolean;
}

type ExecutionPanelAction =
  | { type: 'TOGGLE_PANEL' }
  | { type: 'TOGGLE_LOGS' };

function executionPanelReducer(
  state: ExecutionPanelState,
  action: ExecutionPanelAction
): ExecutionPanelState {
  switch (action.type) {
    case 'TOGGLE_PANEL':
      return { ...state, expanded: !state.expanded };
    case 'TOGGLE_LOGS':
      return { ...state, logsExpanded: !state.logsExpanded };
    default:
      return state;
  }
}

export const AgentExecutionPanel = memo(function AgentExecutionPanel({
  metadata,
  isStreaming = false,
}: AgentExecutionPanelProps) {
  const [state, dispatch] = useReducer(executionPanelReducer, {
    expanded: false,
    logsExpanded: false,
  });

  // 没有任何执行数据时不显示
  if (!metadata || (!metadata.thinking && !metadata.toolLogs?.length && !metadata.usage)) {
    return null;
  }

  return (
    <div className="mt-2 border-t border-white/10 pt-2">
      <button
        onClick={() => dispatch({ type: 'TOGGLE_PANEL' })}
        aria-expanded={state.expanded}
        className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-300 transition-colors"
      >
        {state.expanded ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
        <span>执行详情</span>
        {isStreaming && <Loader2 className="w-3 h-3 animate-spin" />}
      </button>

      {state.expanded && (
        <div className="mt-2 space-y-2">
          {metadata.thinking && (
            <ThinkingSection content={metadata.thinking} isStreaming={isStreaming} />
          )}

          {metadata.toolLogs && metadata.toolLogs.length > 0 && (
            <ToolLogsSection
              logs={metadata.toolLogs}
              expanded={state.logsExpanded}
              onToggle={() => dispatch({ type: 'TOGGLE_LOGS' })}
              isStreaming={isStreaming}
            />
          )}

          {metadata.usage && <UsageSection usage={metadata.usage} />}
        </div>
      )}
    </div>
  );
});
