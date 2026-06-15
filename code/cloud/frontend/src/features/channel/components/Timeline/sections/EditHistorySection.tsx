/**
 * EditHistorySection - 编辑历史区块
 * 显示：编辑时间、编辑者、历史内容
 */

import React from 'react';
import { formatTimestamp } from '../utils/format';

interface EditHistorySectionProps {
  messageData: any;
}

export const EditHistorySection = React.memo(({ messageData }: EditHistorySectionProps) => {
  if (!messageData?.is_edited || !messageData?.edit_history || messageData.edit_history.length === 0) {
    return null;
  }

  // 按时间倒序（最新的在前）
  const sortedHistory = [...messageData.edit_history].sort((a, b) =>
    new Date(b.edited_at).getTime() - new Date(a.edited_at).getTime()
  );

  return (
    <div className="mb-3">
      <div className="text-xs font-semibold text-gray-400 mb-2">📝 编辑历史 ({sortedHistory.length})</div>
      <div className="space-y-2">
        {sortedHistory.map((edit: any, index: number) => (
          <div key={index} className="text-xs bg-black/20 p-2 rounded">
            <div className="text-gray-500 mb-1">
              <span className="text-gray-400">{formatTimestamp(edit.edited_at)}</span>
              <span className="mx-1">•</span>
              <span className="text-gray-400">编辑者: {edit.edited_by}</span>
            </div>
            <div className="text-gray-300 mt-1">
              <span className="text-gray-500">原内容:</span>
              <div className="mt-1 text-gray-400 italic">
                {edit.previous_content}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

EditHistorySection.displayName = 'EditHistorySection';
