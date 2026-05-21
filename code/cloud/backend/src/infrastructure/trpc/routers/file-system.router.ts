import { z } from 'zod';
import { router, procedure } from '../trpc';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { mapErrorToTRPC } from '../../../common/errors';

// Zod schemas for input validation
const readDirectorySchema = z.object({
  path: z.string(),
});

const readFileSchema = z.object({
  path: z.string(),
});

const writeFileSchema = z.object({
  path: z.string(),
  content: z.string(),
});

const createFileSchema = z.object({
  path: z.string(),
});

const createDirectorySchema = z.object({
  path: z.string(),
});

const deleteFileSchema = z.object({
  path: z.string(),
});

const deleteDirectorySchema = z.object({
  path: z.string(),
});

const renameSchema = z.object({
  oldPath: z.string(),
  newPath: z.string(),
});

const existsSchema = z.object({
  path: z.string(),
});

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

/**
 * Resolve a path to an absolute path
 * Handles relative paths by resolving them from the user's home directory
 */
function resolveAbsolutePath(inputPath: string): string {
  // If already absolute, return as-is
  if (path.isAbsolute(inputPath)) {
    return inputPath;
  }

  // Resolve relative paths from home directory
  const homeDir = os.homedir();
  return path.resolve(homeDir, inputPath);
}

async function buildFileTree(dirPath: string): Promise<FileNode[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const nodes: FileNode[] = [];

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const node: FileNode = {
        name: entry.name,
        path: fullPath,
        type: entry.isDirectory() ? 'directory' : 'file',
      };

      if (entry.isDirectory()) {
        node.children = await buildFileTree(fullPath);
      }

      nodes.push(node);
    }

    return nodes.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'directory' ? -1 : 1;
    });
  } catch (error) {
    console.error('Error building file tree:', error);
    throw error;
  }
}

export const fileSystemRouter = router({
  readDirectory: procedure
    .input(readDirectorySchema)
    .query(async ({ input }) => {
      try {
        const absolutePath = resolveAbsolutePath(input.path);
        const tree = await buildFileTree(absolutePath);
        return tree;
      } catch (error) {
        throw mapErrorToTRPC(error);
      }
    }),

  readFile: procedure
    .input(readFileSchema)
    .query(async ({ input }) => {
      try {
        const absolutePath = resolveAbsolutePath(input.path);
        const content = await fs.readFile(absolutePath, 'utf-8');
        return { content };
      } catch (error) {
        throw mapErrorToTRPC(error);
      }
    }),

  writeFile: procedure
    .input(writeFileSchema)
    .mutation(async ({ input }) => {
      try {
        const absolutePath = resolveAbsolutePath(input.path);
        await fs.writeFile(absolutePath, input.content, 'utf-8');
        return { success: true };
      } catch (error) {
        throw mapErrorToTRPC(error);
      }
    }),

  createFile: procedure
    .input(createFileSchema)
    .mutation(async ({ input }) => {
      try {
        const absolutePath = resolveAbsolutePath(input.path);
        await fs.writeFile(absolutePath, '', 'utf-8');
        return { success: true };
      } catch (error) {
        throw mapErrorToTRPC(error);
      }
    }),

  createDirectory: procedure
    .input(createDirectorySchema)
    .mutation(async ({ input }) => {
      try {
        const absolutePath = resolveAbsolutePath(input.path);
        await fs.mkdir(absolutePath, { recursive: true });
        return { success: true };
      } catch (error) {
        throw mapErrorToTRPC(error);
      }
    }),

  deleteFile: procedure
    .input(deleteFileSchema)
    .mutation(async ({ input }) => {
      try {
        const absolutePath = resolveAbsolutePath(input.path);
        await fs.unlink(absolutePath);
        return { success: true };
      } catch (error) {
        throw mapErrorToTRPC(error);
      }
    }),

  deleteDirectory: procedure
    .input(deleteDirectorySchema)
    .mutation(async ({ input }) => {
      try {
        const absolutePath = resolveAbsolutePath(input.path);
        await fs.rm(absolutePath, { recursive: true, force: true });
        return { success: true };
      } catch (error) {
        throw mapErrorToTRPC(error);
      }
    }),

  rename: procedure
    .input(renameSchema)
    .mutation(async ({ input }) => {
      try {
        const absoluteOldPath = resolveAbsolutePath(input.oldPath);
        const absoluteNewPath = resolveAbsolutePath(input.newPath);
        await fs.rename(absoluteOldPath, absoluteNewPath);
        return { success: true };
      } catch (error) {
        throw mapErrorToTRPC(error);
      }
    }),

  exists: procedure
    .input(existsSchema)
    .query(async ({ input }) => {
      try {
        const absolutePath = resolveAbsolutePath(input.path);
        await fs.access(absolutePath);
        return { exists: true };
      } catch (error) {
        return { exists: false };
      }
    }),
});
