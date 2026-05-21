import React from 'react';
import { FolderTree, FileCode } from 'lucide-react';
import { GlassCard } from '@/shared/components/ui/cards/GlassCard';
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
    <div className={`max-w-[1400px] mx-auto ${className}`}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* File Explorer Card */}
        <div className="lg:col-span-1">
          <GlassCard className="p-6 h-[calc(100vh-180px)]">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FolderTree size={20} />
              Files
            </h3>
            <div className="h-[calc(100%-3rem)] overflow-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
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
          </GlassCard>
        </div>

        {/* Editor Card */}
        <div className="lg:col-span-2">
          <GlassCard className="p-6 h-[calc(100vh-180px)]">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileCode size={20} />
              Editor
            </h3>
            <div className="h-[calc(100%-3rem)] flex flex-col overflow-hidden">
              {openTabs.length > 0 ? (
                <>
                  <EditorTabs
                    tabs={openTabs}
                    activeTabId={activeTabId}
                    onTabClick={setActiveTab}
                    onTabClose={closeTab}
                  />
                  <div className="flex-1 overflow-hidden mt-4">
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
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                  <FileCode size={48} className="mb-4 opacity-40" />
                  <p className="text-base mb-2">No files open</p>
                  <p className="text-sm opacity-60">
                    Select a file from the sidebar to start editing
                  </p>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
