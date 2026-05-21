import { z } from 'zod';
import { router, procedure } from '../trpc';
import type { FileSystemService } from '../../../application/services/filesystem/filesystem.service';
import { mapErrorToTRPC } from '../../../common/errors';

// Zod schemas for input validation
const readDirectorySchema = z.object({
  path: z.string().min(1),
  recursive: z.boolean().optional(),
});

const readFileSchema = z.object({
  path: z.string().min(1),
  encoding: z.enum(['utf-8', 'ascii', 'base64', 'hex', 'binary']).optional(),
});

const writeFileSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
  encoding: z.enum(['utf-8', 'ascii', 'base64', 'hex', 'binary']).optional(),
  mode: z.number().optional(),
});

const createDirectorySchema = z.object({
  path: z.string().min(1),
  recursive: z.boolean().optional(),
});

const deleteSchema = z.object({
  path: z.string().min(1),
  recursive: z.boolean().optional(),
});

const renameSchema = z.object({
  oldPath: z.string().min(1),
  newPath: z.string().min(1),
});

const existsSchema = z.object({
  path: z.string().min(1),
});

export function createFileSystemRouter(fileSystemService: FileSystemService) {
  return router({
    // Read directory contents
    readDirectory: procedure
      .input(readDirectorySchema)
      .query(async ({ input }) => {
        try {
          const entries = await fileSystemService.readDirectory(input.path, {
            recursive: input.recursive,
          });
          return { success: true, data: entries };
        } catch (error) {
          throw mapErrorToTRPC(error as Error);
        }
      }),

    // Read file content
    readFile: procedure
      .input(readFileSchema)
      .query(async ({ input }) => {
        try {
          const fileContent = await fileSystemService.readFile(
            input.path,
            input.encoding as BufferEncoding
          );
          return { success: true, data: fileContent };
        } catch (error) {
          throw mapErrorToTRPC(error as Error);
        }
      }),

    // Write file content
    writeFile: procedure
      .input(writeFileSchema)
      .mutation(async ({ input }) => {
        try {
          await fileSystemService.writeFile(input.path, input.content, {
            encoding: input.encoding as BufferEncoding,
            mode: input.mode,
          });
          return { success: true, message: 'File written successfully' };
        } catch (error) {
          throw mapErrorToTRPC(error as Error);
        }
      }),

    // Create directory
    createDirectory: procedure
      .input(createDirectorySchema)
      .mutation(async ({ input }) => {
        try {
          await fileSystemService.createDirectory(input.path, input.recursive);
          return { success: true, message: 'Directory created successfully' };
        } catch (error) {
          throw mapErrorToTRPC(error as Error);
        }
      }),

    // Delete file or directory
    delete: procedure
      .input(deleteSchema)
      .mutation(async ({ input }) => {
        try {
          await fileSystemService.delete(input.path, input.recursive);
          return { success: true, message: 'Deleted successfully' };
        } catch (error) {
          throw mapErrorToTRPC(error as Error);
        }
      }),

    // Rename file or directory
    rename: procedure
      .input(renameSchema)
      .mutation(async ({ input }) => {
        try {
          await fileSystemService.rename(input.oldPath, input.newPath);
          return { success: true, message: 'Renamed successfully' };
        } catch (error) {
          throw mapErrorToTRPC(error as Error);
        }
      }),

    // Check if path exists
    exists: procedure
      .input(existsSchema)
      .query(async ({ input }) => {
        try {
          const exists = await fileSystemService.exists(input.path);
          return { success: true, data: { exists } };
        } catch (error) {
          throw mapErrorToTRPC(error as Error);
        }
      }),
  });
}
