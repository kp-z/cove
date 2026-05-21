import React from 'react';
import { X } from 'lucide-react';
import type { EditorTab } from '@/features/file-editor/types';

interface EditorTabsProps {
  tabs: EditorTab[];
  activeTabId: string | null;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  className?: string;
}

export const EditorTabs: React.FC<EditorTabsProps> = ({
  tabs,
  activeTabId,
  onTabClick,
  onTabClose,
  className = '',
}) => {
  const handleCloseClick = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    onTabClose(tabId);
  };

  return (
    <div className={`flex bg-[#2d2d2d] border-b border-[#1e1e1e] overflow-x-auto overflow-y-hidden ${className}`}>
      <div className="flex flex-1 min-w-0">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`flex items-center gap-2 px-3 py-2 border-r border-[#1e1e1e] cursor-pointer select-none whitespace-nowrap min-w-[120px] max-w-[200px] transition-colors duration-150 ${
              tab.id === activeTabId
                ? 'bg-[#1e1e1e] border-b-2 border-b-blue-500'
                : 'bg-[#2d2d2d] hover:bg-[#3e3e3e]'
            }`}
            onClick={() => onTabClick(tab.id)}
          >
            <span className={`flex-1 overflow-hidden text-ellipsis text-sm ${
              tab.id === activeTabId ? 'text-white' : 'text-white/70'
            }`}>
              {tab.name}
              {tab.isDirty && (
                <span className="ml-1 text-blue-400 text-base">●</span>
              )}
            </span>
            <button
              className="flex items-center justify-center w-5 h-5 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors duration-150"
              onClick={(e) => handleCloseClick(e, tab.id)}
              aria-label="Close tab"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
