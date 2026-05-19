import { NotFoundError, AuthorizationError, ValidationError } from '../../../common/errors';
import { ERROR_CODES } from '../../../common/errors/error-codes';

export class MessageNotFoundError extends NotFoundError {
  readonly code = ERROR_CODES.MESSAGE_NOT_FOUND;

  constructor(messageId: string) {
    super(`Message not found: ${messageId}`, { messageId });
  }
}

export class SenderNotInChannelError extends ValidationError {
  readonly code = ERROR_CODES.SENDER_NOT_IN_CHANNEL;

  constructor(senderId: string, channelId: string) {
    super(`Sender ${senderId} is not in channel ${channelId}`, { senderId, channelId });
  }
}

export class UnauthorizedMessageDeletionError extends AuthorizationError {
  readonly code = ERROR_CODES.MESSAGE_DELETION_UNAUTHORIZED;

  constructor(messageId: string, userId: string) {
    super(`User ${userId} is not authorized to delete message ${messageId}`, { messageId, userId });
  }
}

export class UnauthorizedMessageEditError extends AuthorizationError {
  readonly code = ERROR_CODES.MESSAGE_EDIT_UNAUTHORIZED;

  constructor(messageId: string, userId: string) {
    super(`User ${userId} is not authorized to edit message ${messageId}`, { messageId, userId });
  }
}

export class SendMessageDeniedError extends AuthorizationError {
  readonly code = ERROR_CODES.SEND_MESSAGE_DENIED;

  constructor(senderId: string, channelId: string, reason: string) {
    super(`Send denied for ${senderId} in channel ${channelId}: ${reason}`, { senderId, channelId, reason });
  }
}

