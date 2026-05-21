import type { FileSystemAdapter, FileNode } from '@/features/file-editor/types';

/**
 * File system client using tRPC API
 * This client communicates with the backend to perform file operations
 */
export class FileSystemClient implements FileSystemAdapter {
  private trpc: any; // TODO: Replace with proper tRPC client type

  constructor(trpc: any) {
    this.trpc = trpc;
  }

  async readDirectory(path: string): Promise<FileNode[]> {
    try {
      const result = await this.trpc.filesystem.readDirectory.query({ path });

      // Handle backend error response
      if (result && typeof result === 'object' && 'error' in result) {
        throw new Error(result.error || 'Backend error');
      }

      // Handle wrapped response format {success: true, data: [...]}
      const data = result?.data ?? result;

      // Validate data is an array
      if (!Array.isArray(data)) {
        console.warn('Invalid response format:', result);
        return [];
      }

      return data.map((item: any) => this.mapToFileNode(item));
    } catch (error) {
      console.error('Failed to read directory:', error);
      throw error;
    }
  }

  async readFile(path: string): Promise<string> {
    try {
      const result = await this.trpc.filesystem.readFile.query({ path });
      return result.content;
    } catch (error) {
      console.error('Failed to read file:', error);
      throw new Error(`Failed to read file: ${path}`);
    }
  }

  async writeFile(path: string, content: string): Promise<void> {
    try {
      await this.trpc.filesystem.writeFile.mutate({ path, content });
    } catch (error) {
      console.error('Failed to write file:', error);
      throw new Error(`Failed to write file: ${path}`);
    }
  }

  async createFile(path: string, name: string): Promise<FileNode> {
    try {
      const fullPath = `${path}/${name}`;
      await this.trpc.filesystem.createFile.mutate({ path: fullPath });
      return {
        id: fullPath,
        name,
        path: fullPath,
        type: 'file',
      };
    } catch (error) {
      console.error('Failed to create file:', error);
      throw new Error(`Failed to create file: ${name}`);
    }
  }

  async createDirectory(path: string, name: string): Promise<FileNode> {
    try {
      const fullPath = `${path}/${name}`;
      await this.trpc.filesystem.createDirectory.mutate({ path: fullPath });
      return {
        id: fullPath,
        name,
        path: fullPath,
        type: 'directory',
        children: [],
      };
    } catch (error) {
      console.error('Failed to create directory:', error);
      throw new Error(`Failed to create directory: ${name}`);
    }
  }

  async deleteFile(path: string): Promise<void> {
    try {
      await this.trpc.filesystem.deleteFile.mutate({ path });
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw new Error(`Failed to delete file: ${path}`);
    }
  }

  async deleteDirectory(path: string): Promise<void> {
    try {
      await this.trpc.filesystem.deleteDirectory.mutate({ path });
    } catch (error) {
      console.error('Failed to delete directory:', error);
      throw new Error(`Failed to delete directory: ${path}`);
    }
  }

  async renameFile(oldPath: string, newPath: string): Promise<void> {
    try {
      await this.trpc.filesystem.rename.mutate({ oldPath, newPath });
    } catch (error) {
      console.error('Failed to rename file:', error);
      throw new Error(`Failed to rename: ${oldPath} -> ${newPath}`);
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      const result = await this.trpc.filesystem.exists.query({ path });
      return result.exists;
    } catch (error) {
      console.error('Failed to check file existence:', error);
      return false;
    }
  }

  private mapToFileNode(item: any): FileNode {
    return {
      id: item.path,
      name: item.name,
      path: item.path,
      type: item.isDirectory ? 'directory' : 'file',
      children: item.children?.map((child: any) => this.mapToFileNode(child)),
    };
  }
}
