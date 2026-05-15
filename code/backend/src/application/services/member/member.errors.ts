import { NotFoundError, ConflictError } from '../../../common/errors';
import { ERROR_CODES } from '../../../common/errors/error-codes';

export class MemberNotFoundError extends NotFoundError {
  readonly code = ERROR_CODES.MEMBER_NOT_FOUND;

  constructor(memberId: string) {
    super(`Member not found: ${memberId}`, { memberId });
  }
}

export class MemberNotFoundInChannelError extends NotFoundError {
  readonly code = ERROR_CODES.MEMBER_NOT_FOUND_IN_CHANNEL;

  constructor(userId: string, channelId: string) {
    super(`User ${userId} is not a member of channel ${channelId}`, { userId, channelId });
  }
}

export class MemberAlreadyInChannelError extends ConflictError {
  readonly code = ERROR_CODES.MEMBER_ALREADY_IN_CHANNEL;

  constructor(userId: string, channelId: string) {
    super(`User ${userId} is already a member of channel ${channelId}`, { userId, channelId });
  }
}

export class ChannelNotFoundForMemberError extends NotFoundError {
  readonly code = ERROR_CODES.CHANNEL_NOT_FOUND_FOR_MEMBER;

  constructor(channelId: string) {
    super(`Channel not found: ${channelId}`, { channelId });
  }
}

export class UserNotFoundForMemberError extends NotFoundError {
  readonly code = ERROR_CODES.USER_NOT_FOUND_FOR_MEMBER;

  constructor(userId: string) {
    super(`User not found: ${userId}`, { userId });
  }
}
