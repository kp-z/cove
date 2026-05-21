import React, { useState } from 'react';
import { Tree } from 'react-arborist';
import type { NodeRendererProps } from 'react-arborist';
import type { FileNode } from '@/features/file-editor/types';

interface FileExplorerProps {
  data: FileNode[];
  onFileClick: (path: string) => void;
  onCreateFile?: (parentPath: string, name: string) => void;
  onCreateDirectory?: (parentPath: string, name: string) => void;
  onDelete?: (path: string) => void;
  onRename?: (oldPath: string, newPath: string) => void;
  className?: string;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  data,
  onFileClick,
  onCreateFile,
  onCreateDirectory,
  onDelete,
  onRename,
  className = '',
}) => {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    node: FileNode;
  } | null>(null);

  const handleNodeClick = (node: FileNode) => {
    if (node.type === 'file') {
      onFileClick(node.path);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const handleCreateFile = () => {
    if (!contextMenu || !onCreateFile) return;
    const name = prompt('Enter file name:');
    if (name) {
      const parentPath =
        contextMenu.node.type === 'directory'
          ? contextMenu.node.path
          : contextMenu.node.path.split('/').slice(0, -1).join('/');
      onCreateFile(parentPath, name);
    }
    closeContextMenu();
  };

  const handleCreateDirectory = () => {
    if (!contextMenu || !onCreateDirectory) return;
    const name = prompt('Enter directory name:');
    if (name) {
      const parentPath =
        contextMenu.node.type === 'directory'
          ? contextMenu.node.path
          : contextMenu.node.path.split('/').slice(0, -1).join('/');
      onCreateDirectory(parentPath, name);
    }
    closeContextMenu();
  };

  const handleDelete = () => {
    if (!contextMenu || !onDelete) return;
    const confirmed = confirm(
      `Are you sure you want to delete ${contextMenu.node.name}?`
    );
    if (confirmed) {
      onDelete(contextMenu.node.path);
    }
    closeContextMenu();
  };

  const handleRename = () => {
    if (!contextMenu || !onRename) return;
    const newName = prompt('Enter new name:', contextMenu.node.name);
    if (newName && newName !== contextMenu.node.name) {
      const pathParts = contextMenu.node.path.split('/');
      pathParts[pathParts.length - 1] = newName;
      const newPath = pathParts.join('/');
      onRename(contextMenu.node.path, newPath);
    }
    closeContextMenu();
  };

  const Node: React.FC<NodeRendererProps<FileNode>> = ({ node, style, dragHandle }) => {
    return (
      <div
        ref={dragHandle}
        style={style}
        className={`flex items-center px-2 py-1 cursor-pointer select-none text-sm transition-colors duration-150 ${
          node.isSelected
            ? 'bg-white/[0.12] text-white'
            : 'text-white/70 hover:bg-white/[0.06] hover:text-white/90'
        }`}
        onClick={() => handleNodeClick(node.data)}
        onContextMenu={(e) => handleContextMenu(e, node.data)}
      >
        <span className="mr-2 text-base">
          {node.data.type === 'directory' ? (node.isOpen ? '📂' : '📁') : '📄'}
        </span>
        <span className="truncate">{node.data.name}</span>
      </div>
    );
  };

  return (
    <div className={`h-full overflow-auto ${className}`}>
      <Tree
        data={data}
        openByDefault={false}
        width="100%"
        height={600}
        indent={16}
        rowHeight={28}
        overscanCount={10}
      >
        {Node}
      </Tree>

      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-[999]"
            onClick={closeContextMenu}
          />
          <div
            className="fixed z-[1000] min-w-[150px] bg-[#2d2d2d] border border-white/[0.12] rounded-md shadow-lg overflow-hidden"
            style={{
              top: contextMenu.y,
              left: contextMenu.x,
            }}
          >
            {contextMenu.node.type === 'directory' && (
              <>
                <button
                  className="block w-full px-3 py-2 text-left text-sm text-white/80 hover:bg-white/[0.08] hover:text-white transition-colors duration-150"
                  onClick={handleCreateFile}
                >
                  New File
                </button>
                <button
                  className="block w-full px-3 py-2 text-left text-sm text-white/80 hover:bg-white/[0.08] hover:text-white transition-colors duration-150"
                  onClick={handleCreateDirectory}
                >
                  New Folder
                </button>
              </>
            )}
            <button
              className="block w-full px-3 py-2 text-left text-sm text-white/80 hover:bg-white/[0.08] hover:text-white transition-colors duration-150"
              onClick={handleRename}
            >
              Rename
            </button>
            <button
              className="block w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/[0.12] hover:text-red-300 transition-colors duration-150"
              onClick={handleDelete}
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
};
