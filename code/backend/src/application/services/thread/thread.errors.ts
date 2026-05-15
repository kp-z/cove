import { NotFoundError, ValidationError } from '../../../common/errors';
import { ERROR_CODES } from '../../../common/errors/error-codes';

export class ThreadNotFoundError extends NotFoundError {
  readonly code = 'THREAD_NOT_FOUND';

  constructor(threadId: string) {
    super(`Thread not found: ${threadId}`, { threadId });
  }
}

export class RootMessageNotFoundError extends NotFoundError {
  readonly code = ERROR_CODES.ROOT_MESSAGE_NOT_FOUND;

  constructor(messageId: string) {
    super(`Root message not found: ${messageId}`, { messageId });
  }
}

export class NestedThreadError extends ValidationError {
  readonly code = ERROR_CODES.NESTED_THREAD_NOT_ALLOWED;

  constructor(messageId: string) {
    super(`Cannot create a thread on a thread reply: ${messageId}`, { messageId });
  }
}
