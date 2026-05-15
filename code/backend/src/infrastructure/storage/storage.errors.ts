import { InternalError, NotFoundError } from '../../common/errors';
import { ERROR_CODES } from '../../common/errors/error-codes';

export class StorageError extends InternalError {
  readonly code = ERROR_CODES.STORAGE_ERROR;

  constructor(operation: string, reason: string) {
    super(
      `Storage operation failed: ${operation} - ${reason}`,
      { operation, reason }
    );
  }
}

export class StorageFileNotFoundError extends NotFoundError {
  readonly code = ERROR_CODES.STORAGE_FILE_NOT_FOUND;

  constructor(filePath: string) {
    super(
      `File not found: ${filePath}`,
      { filePath }
    );
  }
}

export class StoragePathResolutionError extends InternalError {
  readonly code = ERROR_CODES.STORAGE_PATH_RESOLUTION_ERROR;

  constructor(path: string, reason: string) {
    super(
      `Failed to resolve path: ${path} - ${reason}`,
      { path, reason }
    );
  }
}
