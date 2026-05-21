export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  parent?: FileNode;
  isExpanded?: boolean;
  isLoading?: boolean;
}

export interface EditorTab {
  id: string;
  path: string;
  name: string;
  content: string;
  language?: string;
  isDirty?: boolean;
  isActive?: boolean;
}

export interface FileSystemAdapter {
  readDirectory(path: string): Promise<FileNode[]>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  createFile(path: string, name: string): Promise<FileNode>;
  createDirectory(path: string, name: string): Promise<FileNode>;
  deleteFile(path: string): Promise<void>;
  deleteDirectory(path: string): Promise<void>;
  renameFile(oldPath: string, newPath: string): Promise<void>;
  exists(path: string): Promise<boolean>;
}

export interface FileEditorState {
  rootPath: string;
  fileTree: FileNode[];
  openTabs: EditorTab[];
  activeTabId: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface FileEditorActions {
  loadFileTree: () => Promise<void>;
  openFile: (path: string) => Promise<void>;
  closeTab: (tabId: string) => void;
  saveFile: (tabId: string) => Promise<void>;
  createFile: (parentPath: string, name: string) => Promise<void>;
  createDirectory: (parentPath: string, name: string) => Promise<void>;
  deleteNode: (path: string) => Promise<void>;
  renameNode: (oldPath: string, newPath: string) => Promise<void>;
  setActiveTab: (tabId: string) => void;
  updateTabContent: (tabId: string, content: string) => void;
}

export type FileEditorContextValue = FileEditorState & FileEditorActions;
