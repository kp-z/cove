import React from 'react';
import type { FileSystemAdapter } from '@/features/file-editor/types';
import { useFileSystem } from '../hooks/useFileSystem';
import { FileExplorer } from './FileExplorer';
import { EditorTabs } from './EditorTabs';
import { CodeEditor } from './CodeEditor';

interface FileEditorWorkspaceProps {
  adapter: FileSystemAdapter;
  rootPath: string;
  className?: string;
}

export const FileEditorWorkspace: React.FC<FileEditorWorkspaceProps> = ({
  adapter,
  rootPath,
  className = '',
}) => {
  const {
    fileTree,
    openTabs,
    activeTabId,
    isLoading,
    error,
    openFile,
    closeTab,
    saveFile,
    createFile,
    createDirectory,
    deleteNode,
    renameNode,
    setActiveTab,
    updateTabContent,
  } = useFileSystem({ adapter, rootPath });

  const activeTab = openTabs.find((tab) => tab.id === activeTabId);

  const handleSave = async () => {
    if (activeTabId) {
      await saveFile(activeTabId);
    }
  };

  return (
    <div className={`file-editor-workspace ${className}`}>
      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
        </div>
      )}

      <div className="workspace-container">
        <div className="sidebar">
          <div className="sidebar-header">
            <h3>Files</h3>
          </div>
          {isLoading ? (
            <div className="loading">Loading...</div>
          ) : (
            <FileExplorer
              data={fileTree}
              onFileClick={openFile}
              onCreateFile={createFile}
              onCreateDirectory={createDirectory}
              onDelete={deleteNode}
              onRename={renameNode}
            />
          )}
        </div>

        <div className="editor-area">
          {openTabs.length > 0 ? (
            <>
              <EditorTabs
                tabs={openTabs}
                activeTabId={activeTabId}
                onTabClick={setActiveTab}
                onTabClose={closeTab}
              />
              <div className="editor-container">
                {activeTab && (
                  <CodeEditor
                    value={activeTab.content}
                    language={activeTab.language}
                    onChange={(value) => updateTabContent(activeTab.id, value)}
                    onSave={handleSave}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <p>No files open</p>
              <p className="hint">Select a file from the sidebar to start editing</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .file-editor-workspace {
          display: flex;
          flex-direction: column;
          height: 100%;
          background-color: #1e1e1e;
          color: #cccccc;
        }
        .error-banner {
          padding: 12px;
          background-color: #f44336;
          color: white;
          text-align: center;
        }
        .workspace-container {
          display: flex;
          flex: 1;
          overflow: hidden;
        }
        .sidebar {
          width: 250px;
          min-width: 200px;
          max-width: 400px;
          background-color: #252526;
          border-right: 1px solid #1e1e1e;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .sidebar-header {
          padding: 12px 16px;
          border-bottom: 1px solid #1e1e1e;
        }
        .sidebar-header h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: #cccccc;
          text-transform: uppercase;
        }
        .loading {
          padding: 16px;
          text-align: center;
          color: #888;
        }
        .editor-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .editor-container {
          flex: 1;
          overflow: hidden;
        }
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #888;
        }
        .empty-state p {
          margin: 8px 0;
        }
        .empty-state .hint {
          font-size: 12px;
          color: #666;
        }
      `}</style>
    </div>
  );
};
