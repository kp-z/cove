export class MessageNotFoundError extends Error {
  constructor(messageId: string) {
    super(`Message not found: ${messageId}`);
    this.name = 'MessageNotFoundError';
  }
}

export class SenderNotInChannelError extends Error {
  constructor(senderId: string, channelId: string) {
    super(`Sender ${senderId} is not in channel ${channelId}`);
    this.name = 'SenderNotInChannelError';
  }
}

export class UnauthorizedMessageDeletionError extends Error {
  constructor(messageId: string, userId: string) {
    super(`User ${userId} is not authorized to delete message ${messageId}`);
    this.name = 'UnauthorizedMessageDeletionError';
  }
}

export class UnauthorizedMessageEditError extends Error {
  constructor(messageId: string, userId: string) {
    super(`User ${userId} is not authorized to edit message ${messageId}`);
    this.name = 'UnauthorizedMessageEditError';
  }
}

export class SendMessageDeniedError extends Error {
  constructor(senderId: string, channelId: string, reason: string) {
    super(`Send denied for ${senderId} in channel ${channelId}: ${reason}`);
    this.name = 'SendMessageDeniedError';
  }
}
