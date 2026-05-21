import React from 'react';
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
    <div className={`editor-tabs ${className}`}>
      <div className="tabs-container">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`tab ${tab.isActive ? 'active' : ''} ${tab.isDirty ? 'dirty' : ''}`}
            onClick={() => onTabClick(tab.id)}
          >
            <span className="tab-name">
              {tab.name}
              {tab.isDirty && <span className="dirty-indicator">●</span>}
            </span>
            <button
              className="tab-close"
              onClick={(e) => handleCloseClick(e, tab.id)}
              aria-label="Close tab"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <style>{`
        .editor-tabs {
          display: flex;
          background-color: #2d2d2d;
          border-bottom: 1px solid #1e1e1e;
          overflow-x: auto;
          overflow-y: hidden;
        }
        .tabs-container {
          display: flex;
          flex: 1;
          min-width: 0;
        }
        .tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background-color: #2d2d2d;
          border-right: 1px solid #1e1e1e;
          cursor: pointer;
          user-select: none;
          white-space: nowrap;
          min-width: 120px;
          max-width: 200px;
        }
        .tab:hover {
          background-color: #3e3e3e;
        }
        .tab.active {
          background-color: #1e1e1e;
          border-bottom: 2px solid #007acc;
        }
        .tab-name {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 13px;
          color: #cccccc;
        }
        .tab.active .tab-name {
          color: #ffffff;
        }
        .dirty-indicator {
          margin-left: 4px;
          color: #007acc;
          font-size: 16px;
        }
        .tab-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border: none;
          background: none;
          color: #cccccc;
          font-size: 20px;
          line-height: 1;
          cursor: pointer;
          padding: 0;
          border-radius: 3px;
        }
        .tab-close:hover {
          background-color: rgba(255, 255, 255, 0.1);
          color: #ffffff;
        }
      `}</style>
    </div>
  );
};
