import React, { useState } from 'react';
import { Tree } from 'react-arborist';
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
        className={`file-node ${node.isSelected ? 'selected' : ''}`}
        onClick={() => handleNodeClick(node.data)}
        onContextMenu={(e) => handleContextMenu(e, node.data)}
      >
        <span className="file-icon">
          {node.data.type === 'directory' ? (node.isOpen ? '📂' : '📁') : '📄'}
        </span>
        <span className="file-name">{node.data.name}</span>
      </div>
    );
  };

  return (
    <div className={`file-explorer ${className}`}>
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
            className="context-menu-overlay"
            onClick={closeContextMenu}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
            }}
          />
          <div
            className="context-menu"
            style={{
              position: 'fixed',
              top: contextMenu.y,
              left: contextMenu.x,
              zIndex: 1000,
              backgroundColor: 'white',
              border: '1px solid #ccc',
              borderRadius: '4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              minWidth: '150px',
            }}
          >
            {contextMenu.node.type === 'directory' && (
              <>
                <button
                  className="context-menu-item"
                  onClick={handleCreateFile}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 12px',
                    border: 'none',
                    background: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  New File
                </button>
                <button
                  className="context-menu-item"
                  onClick={handleCreateDirectory}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 12px',
                    border: 'none',
                    background: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  New Folder
                </button>
              </>
            )}
            <button
              className="context-menu-item"
              onClick={handleRename}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                background: 'none',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              Rename
            </button>
            <button
              className="context-menu-item"
              onClick={handleDelete}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                background: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                color: 'red',
              }}
            >
              Delete
            </button>
          </div>
        </>
      )}

      <style>{`
        .file-explorer {
          height: 100%;
          overflow: auto;
        }
        .file-node {
          display: flex;
          align-items: center;
          padding: 4px 8px;
          cursor: pointer;
          user-select: none;
        }
        .file-node:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }
        .file-node.selected {
          background-color: rgba(0, 120, 212, 0.1);
        }
        .file-icon {
          margin-right: 6px;
          font-size: 16px;
        }
        .file-name {
          font-size: 14px;
        }
        .context-menu-item:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }
      `}</style>
    </div>
  );
};
