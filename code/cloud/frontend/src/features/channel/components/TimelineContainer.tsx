import { Timeline } from './Timeline';
import { useTimelineNodes } from './Timeline/hooks/useTimelineNodes';
import type { TimelineNode } from './Timeline/NodeRegistry';

interface TimelineContainerProps {
  channelId: string | null;
  selectedNodeId?: string;
  onNodeClick?: (node: TimelineNode) => void;
}

export function TimelineContainer({
  channelId,
  selectedNodeId,
  onNodeClick,
}: TimelineContainerProps) {
  const { nodes, isLoading, error } = useTimelineNodes({
    channelId: channelId || '',
    limit: 50,
  });

  if (!channelId) {
    return (
      <div className="flex-1 border-l border-white/10 bg-[#0f111a]">
        <div className="h-full flex items-center justify-center">
          <p className="text-gray-500 text-sm">
            Select a channel to view timeline
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 border-l border-white/10 bg-[#0f111a] overflow-hidden">
      <Timeline
        channelId={channelId}
        nodes={nodes}
        selectedNodeId={selectedNodeId}
        isLoading={isLoading}
        error={error}
        onNodeClick={onNodeClick}
      />
    </div>
  );
}
