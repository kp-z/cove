/**
 * RelatedInfoSection - 关联信息区块
 * 显示：Mentions、references、线程、反应
 */

import React from 'react';

interface RelatedInfoSectionProps {
  messageData: any;
}

export const RelatedInfoSection = React.memo(({ messageData }: RelatedInfoSectionProps) => {
  if (!messageData) return null;

  const hasMentions = messageData.mentions && messageData.mentions.length > 0;
  const hasReferences = messageData.references && messageData.references.length > 0;
  const hasThread = !!messageData.thread_id;
  const hasReactions = messageData.reactions && messageData.reactions.length > 0;

  // 如果没有任何关联信息，不显示这个区块
  if (!hasMentions && !hasReferences && !hasThread && !hasReactions) {
    return null;
  }

  return (
    <div className="mb-3">
      <div className="text-xs font-semibold text-gray-400 mb-2">🔗 关联信息</div>
      <div className="text-xs text-gray-300 space-y-1">
        {/* Mentions */}
        {hasMentions && (
          <div>
            <span className="text-gray-500">├─ Mentions ({messageData.mentions.length}):</span>
            <div className="mt-1 ml-3 space-y-0.5">
              {messageData.mentions.map((mention: any, index: number) => (
                <div key={index} className="text-gray-400">
                  • {mention.mention_type}: {mention.mention_name || mention.mention_id}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* References */}
        {hasReferences && (
          <div>
            <span className="text-gray-500">├─ References ({messageData.references.length}):</span>
            <div className="mt-1 ml-3 space-y-0.5">
              {messageData.references.map((ref: any, index: number) => (
                <div key={index} className="text-gray-400">
                  • {ref.ref_type}: {ref.ref_title || ref.ref_id}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Thread */}
        {hasThread && (
          <div>
            <span className="text-gray-500">├─ 线程:</span> {messageData.thread_id}
            {messageData.is_thread_root && <span className="text-blue-400 ml-1">(根消息)</span>}
          </div>
        )}

        {/* Reactions */}
        {hasReactions && (
          <div>
            <span className="text-gray-500">└─ 反应 ({messageData.reactions.length}):</span>
            <div className="mt-1 ml-3 flex flex-wrap gap-2">
              {messageData.reactions.map((reaction: any, index: number) => (
                <span key={index} className="text-gray-400 bg-black/20 px-2 py-0.5 rounded">
                  {reaction.emoji} {reaction.count}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

RelatedInfoSection.displayName = 'RelatedInfoSection';
