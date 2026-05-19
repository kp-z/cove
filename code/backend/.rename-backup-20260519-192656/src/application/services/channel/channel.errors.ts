import { NotFoundError, StateError, ConflictError } from '../../../common/errors';
import { ERROR_CODES } from '../../../common/errors/error-codes';

export class ChannelNotFoundError extends NotFoundError {
  readonly code = ERROR_CODES.CHANNEL_NOT_FOUND;

  constructor(channelId: string) {
    super(`Channel not found: ${channelId}`, { channelId });
  }
}

export class ChannelNotActiveError extends StateError {
  readonly code = ERROR_CODES.CHANNEL_NOT_ACTIVE;

  constructor(channelId: string) {
    super(`Channel is not active: ${channelId}`, { channelId });
  }
}

export class ChannelNotArchivedError extends StateError {
  readonly code = ERROR_CODES.CHANNEL_NOT_ARCHIVED;

  constructor(channelId: string) {
    super(`Channel must be archived before deletion: ${channelId}`, { channelId });
  }
}

export class MemberNotInChannelError extends NotFoundError {
  readonly code = ERROR_CODES.MEMBER_NOT_IN_CHANNEL;

  constructor(memberId: string, channelId: string) {
    super(`Member ${memberId} is not in channel ${channelId}`, { memberId, channelId });
  }
}

export class ChannelAlreadyExistsError extends ConflictError {
  readonly code = 'CHANNEL_ALREADY_EXISTS';

  constructor(channelName: string) {
    super(`Channel already exists: ${channelName}`, { channelName });
  }
}

export class MemberAlreadyInChannelError extends ConflictError {
  readonly code = 'MEMBER_ALREADY_IN_CHANNEL';

  constructor(memberId: string, channelId: string) {
    super(`Member ${memberId} is already in channel ${channelId}`, { memberId, channelId });
  }
}

