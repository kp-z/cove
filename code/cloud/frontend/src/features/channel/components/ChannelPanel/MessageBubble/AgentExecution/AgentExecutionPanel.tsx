import { memo, useState } from 'react';
import { AgentMetadata } from '../../types';
import { AgentExecutionStatusBar } from './AgentExecutionStatusBar';
import { AgentExecutionModal } from './AgentExecutionModal';

interface AgentExecutionPanelProps {
  metadata: AgentMetadata;
  isStreaming?: boolean;
}

export const AgentExecutionPanel = memo(function AgentExecutionPanel({
  metadata,
  isStreaming = false,
}: AgentExecutionPanelProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 没有任何执行数据时不显示
  if (!metadata || (!metadata.thinking && !metadata.toolLogs?.length && !metadata.usage)) {
    return null;
  }

  return (
    <>
      <AgentExecutionStatusBar
        metadata={metadata}
        isStreaming={isStreaming}
        onViewDetails={() => setIsModalOpen(true)}
      />
      <AgentExecutionModal
        metadata={metadata}
        isStreaming={isStreaming}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
});
