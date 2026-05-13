export class ChannelNotFoundError extends Error {
  constructor(channelId: string) {
    super(`Channel not found: ${channelId}`);
    this.name = 'ChannelNotFoundError';
  }
}

export class ChannelNotActiveError extends Error {
  constructor(channelId: string) {
    super(`Channel is not active: ${channelId}`);
    this.name = 'ChannelNotActiveError';
  }
}

export class ChannelNotArchivedError extends Error {
  constructor(channelId: string) {
    super(`Channel must be archived before deletion: ${channelId}`);
    this.name = 'ChannelNotArchivedError';
  }
}

export class MemberNotInChannelError extends Error {
  constructor(memberId: string, channelId: string) {
    super(`Member ${memberId} is not in channel ${channelId}`);
    this.name = 'MemberNotInChannelError';
  }
}
