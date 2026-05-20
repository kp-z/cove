"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemberAlreadyInChannelError = exports.ChannelAlreadyExistsError = exports.MemberNotInChannelError = exports.ChannelNotArchivedError = exports.ChannelNotActiveError = exports.ChannelNotFoundError = void 0;
const errors_1 = require("../../../common/errors");
const error_codes_1 = require("../../../common/errors/error-codes");
class ChannelNotFoundError extends errors_1.NotFoundError {
    code = error_codes_1.ERROR_CODES.CHANNEL_NOT_FOUND;
    constructor(channelId) {
        super(`Channel not found: ${channelId}`, { channelId });
    }
}
exports.ChannelNotFoundError = ChannelNotFoundError;
class ChannelNotActiveError extends errors_1.StateError {
    code = error_codes_1.ERROR_CODES.CHANNEL_NOT_ACTIVE;
    constructor(channelId) {
        super(`Channel is not active: ${channelId}`, { channelId });
    }
}
exports.ChannelNotActiveError = ChannelNotActiveError;
class ChannelNotArchivedError extends errors_1.StateError {
    code = error_codes_1.ERROR_CODES.CHANNEL_NOT_ARCHIVED;
    constructor(channelId) {
        super(`Channel must be archived before deletion: ${channelId}`, { channelId });
    }
}
exports.ChannelNotArchivedError = ChannelNotArchivedError;
class MemberNotInChannelError extends errors_1.NotFoundError {
    code = error_codes_1.ERROR_CODES.MEMBER_NOT_IN_CHANNEL;
    constructor(memberId, channelId) {
        super(`Member ${memberId} is not in channel ${channelId}`, { memberId, channelId });
    }
}
exports.MemberNotInChannelError = MemberNotInChannelError;
class ChannelAlreadyExistsError extends errors_1.ConflictError {
    code = 'CHANNEL_ALREADY_EXISTS';
    constructor(channelName) {
        super(`Channel already exists: ${channelName}`, { channelName });
    }
}
exports.ChannelAlreadyExistsError = ChannelAlreadyExistsError;
class MemberAlreadyInChannelError extends errors_1.ConflictError {
    code = 'MEMBER_ALREADY_IN_CHANNEL';
    constructor(memberId, channelId) {
        super(`Member ${memberId} is already in channel ${channelId}`, { memberId, channelId });
    }
}
exports.MemberAlreadyInChannelError = MemberAlreadyInChannelError;
