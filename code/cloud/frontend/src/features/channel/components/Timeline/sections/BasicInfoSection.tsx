/**
 * BasicInfoSection - 基础信息区块
 * 显示：ID、状态、类型、时间、是否编辑
 */

import React from 'react';
import { formatTimestamp } from '../utils/format';

interface BasicInfoSectionProps {
  messageData: any;
}

export const BasicInfoSection = React.memo(({ messageData }: BasicInfoSectionProps) => {
  if (!messageData) return null;

  return (
    <div className="mb-3">
      <div className="text-xs font-semibold text-gray-400 mb-2">ℹ️ 基础信息</div>
      <div className="text-xs text-gray-300 space-y-1">
        <div>
          <span className="text-gray-500">├─ ID:</span> {messageData.message_id || 'N/A'}
        </div>
        <div>
          <span className="text-gray-500">├─ 状态:</span> {messageData.status || 'N/A'}
        </div>
        <div>
          <span className="text-gray-500">├─ 类型:</span> {messageData.content_type || 'text'}
        </div>
        <div>
          <span className="text-gray-500">├─ 创建时间:</span> {formatTimestamp(messageData.created_at)}
        </div>
        <div>
          <span className="text-gray-500">└─ 已编辑:</span> {messageData.is_edited ? '是' : '否'}
        </div>
      </div>
    </div>
  );
});

BasicInfoSection.displayName = 'BasicInfoSection';
