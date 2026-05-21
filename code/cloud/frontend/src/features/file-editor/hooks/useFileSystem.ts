import { useState, useCallback, useEffect } from 'react';
import { notify } from '@/core/services/notificationService';
import type {
  FileSystemAdapter,
  FileNode,
  EditorTab,
  FileEditorState,
  FileEditorActions,
} from '@/features/file-editor/types';

interface UseFileSystemOptions {
  adapter: FileSystemAdapter;
  rootPath: string;
}

export function useFileSystem({
  adapter,
  rootPath,
}: UseFileSystemOptions): FileEditorState & FileEditorActions {
  const [state, setState] = useState<FileEditorState>({
    rootPath,
    fileTree: [],
    openTabs: [],
    activeTabId: null,
    isLoading: false,
    error: null,
  });

  const loadFileTree = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const tree = await adapter.readDirectory(rootPath);
      setState((prev) => ({
        ...prev,
        fileTree: tree,
        isLoading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load file tree';
      notify.toast.error('Failed to load file tree', errorMessage);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: null,
      }));
    }
  }, [adapter, rootPath]);

  const openFile = useCallback(
    async (path: string) => {
      const existingTab = state.openTabs.find((tab) => tab.path === path);
      if (existingTab) {
        setState((prev) => ({
          ...prev,
          activeTabId: existingTab.id,
          openTabs: prev.openTabs.map((tab) => ({
            ...tab,
            isActive: tab.id === existingTab.id,
          })),
        }));
        return;
      }

      try {
        const content = await adapter.readFile(path);
        const fileName = path.split('/').pop() || path;
        const language = getLanguageFromFileName(fileName);

        const newTab: EditorTab = {
          id: `tab-${Date.now()}-${Math.random()}`,
          path,
          name: fileName,
          content,
          language,
          isDirty: false,
          isActive: true,
        };

        setState((prev) => ({
          ...prev,
          openTabs: [
            ...prev.openTabs.map((tab) => ({ ...tab, isActive: false })),
            newTab,
          ],
          activeTabId: newTab.id,
        }));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to open file';
        notify.toast.error('Failed to open file', errorMessage);
        setState((prev) => ({
          ...prev,
          error: null,
        }));
      }
    },
    [adapter, state.openTabs]
  );

  const closeTab = useCallback((tabId: string) => {
    setState((prev) => {
      const newTabs = prev.openTabs.filter((tab) => tab.id !== tabId);
      let newActiveTabId = prev.activeTabId;

      if (prev.activeTabId === tabId && newTabs.length > 0) {
        newActiveTabId = newTabs[newTabs.length - 1].id;
      } else if (newTabs.length === 0) {
        newActiveTabId = null;
      }

      return {
        ...prev,
        openTabs: newTabs.map((tab) => ({
          ...tab,
          isActive: tab.id === newActiveTabId,
        })),
        activeTabId: newActiveTabId,
      };
    });
  }, []);

  const saveFile = useCallback(
    async (tabId: string) => {
      const tab = state.openTabs.find((t) => t.id === tabId);
      if (!tab) return;

      try {
        await adapter.writeFile(tab.path, tab.content);
        setState((prev) => ({
          ...prev,
          openTabs: prev.openTabs.map((t) =>
            t.id === tabId ? { ...t, isDirty: false } : t
          ),
        }));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to save file';
        notify.toast.error('Failed to save file', errorMessage);
        setState((prev) => ({
          ...prev,
          error: null,
        }));
      }
    },
    [adapter, state.openTabs]
  );

  const createFile = useCallback(
    async (parentPath: string, name: string) => {
      try {
        await adapter.createFile(parentPath, name);
        await loadFileTree();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to create file';
        notify.toast.error('Failed to create file', errorMessage);
        setState((prev) => ({
          ...prev,
          error: null,
        }));
      }
    },
    [adapter, loadFileTree]
  );

  const createDirectory = useCallback(
    async (parentPath: string, name: string) => {
      try {
        await adapter.createDirectory(parentPath, name);
        await loadFileTree();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to create directory';
        notify.toast.error('Failed to create directory', errorMessage);
        setState((prev) => ({
          ...prev,
          error: null,
        }));
      }
    },
    [adapter, loadFileTree]
  );

  const deleteNode = useCallback(
    async (path: string) => {
      try {
        const node = findNodeByPath(state.fileTree, path);
        if (!node) return;

        if (node.type === 'file') {
          await adapter.deleteFile(path);
        } else {
          await adapter.deleteDirectory(path);
        }

        setState((prev) => ({
          ...prev,
          openTabs: prev.openTabs.filter((tab) => !tab.path.startsWith(path)),
        }));

        await loadFileTree();
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to delete',
        }));
      }
    },
    [adapter, loadFileTree, state.fileTree]
  );

  const renameNode = useCallback(
    async (oldPath: string, newPath: string) => {
      try {
        await adapter.renameFile(oldPath, newPath);

        setState((prev) => ({
          ...prev,
          openTabs: prev.openTabs.map((tab) => {
            if (tab.path === oldPath) {
              return {
                ...tab,
                path: newPath,
                name: newPath.split('/').pop() || newPath,
              };
            }
            if (tab.path.startsWith(oldPath + '/')) {
              return {
                ...tab,
                path: tab.path.replace(oldPath, newPath),
              };
            }
            return tab;
          }),
        }));

        await loadFileTree();
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to rename',
        }));
      }
    },
    [adapter, loadFileTree]
  );

  const setActiveTab = useCallback((tabId: string) => {
    setState((prev) => ({
      ...prev,
      activeTabId: tabId,
      openTabs: prev.openTabs.map((tab) => ({
        ...tab,
        isActive: tab.id === tabId,
      })),
    }));
  }, []);

  const updateTabContent = useCallback((tabId: string, content: string) => {
    setState((prev) => ({
      ...prev,
      openTabs: prev.openTabs.map((tab) =>
        tab.id === tabId
          ? { ...tab, content, isDirty: true }
          : tab
      ),
    }));
  }, []);

  useEffect(() => {
    loadFileTree();
  }, [loadFileTree]);

  return {
    ...state,
    loadFileTree,
    openFile,
    closeTab,
    saveFile,
    createFile,
    createDirectory,
    deleteNode,
    renameNode,
    setActiveTab,
    updateTabContent,
  };
}

function getLanguageFromFileName(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    json: 'json',
    md: 'markdown',
    css: 'css',
    scss: 'scss',
    html: 'html',
    py: 'python',
    go: 'go',
    rs: 'rust',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    sh: 'shell',
    yaml: 'yaml',
    yml: 'yaml',
    xml: 'xml',
    sql: 'sql',
  };
  return languageMap[ext || ''] || 'plaintext';
}

function findNodeByPath(nodes: FileNode[], path: string): FileNode | null {
  for (const node of nodes) {
    if (node.path === path) return node;
    if (node.children) {
      const found = findNodeByPath(node.children, path);
      if (found) return found;
    }
  }
  return null;
}
