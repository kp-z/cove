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
    <div className={`flex flex-col h-full ${className}`}>
      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - File Explorer */}
        <div className="w-64 min-w-[200px] max-w-[400px] border-r border-white/[0.08] bg-black/20 flex flex-col">
          <div className="px-4 py-3 border-b border-white/[0.08]">
            <h3 className="text-sm font-semibold text-white/90 uppercase tracking-wide">
              Files
            </h3>
          </div>
          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-32 text-white/40 text-sm">
                Loading...
              </div>
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
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#1e1e1e]">
          {openTabs.length > 0 ? (
            <>
              <EditorTabs
                tabs={openTabs}
                activeTabId={activeTabId}
                onTabClick={setActiveTab}
                onTabClose={closeTab}
              />
              <div className="flex-1 overflow-hidden">
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
            <div className="flex-1 flex flex-col items-center justify-center text-white/40">
              <p className="text-base mb-2">No files open</p>
              <p className="text-sm text-white/30">
                Select a file from the sidebar to start editing
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
