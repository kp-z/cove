"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SendMessageDeniedError = exports.UnauthorizedMessageEditError = exports.UnauthorizedMessageDeletionError = exports.SenderNotInChannelError = exports.MessageNotFoundError = void 0;
const errors_1 = require("../../../common/errors");
const error_codes_1 = require("../../../common/errors/error-codes");
class MessageNotFoundError extends errors_1.NotFoundError {
    code = error_codes_1.ERROR_CODES.MESSAGE_NOT_FOUND;
    constructor(messageId) {
        super(`Message not found: ${messageId}`, { messageId });
    }
}
exports.MessageNotFoundError = MessageNotFoundError;
class SenderNotInChannelError extends errors_1.ValidationError {
    code = error_codes_1.ERROR_CODES.SENDER_NOT_IN_CHANNEL;
    constructor(senderId, channelId) {
        super(`Sender ${senderId} is not in channel ${channelId}`, { senderId, channelId });
    }
}
exports.SenderNotInChannelError = SenderNotInChannelError;
class UnauthorizedMessageDeletionError extends errors_1.AuthorizationError {
    code = error_codes_1.ERROR_CODES.MESSAGE_DELETION_UNAUTHORIZED;
    constructor(messageId, userId) {
        super(`User ${userId} is not authorized to delete message ${messageId}`, { messageId, userId });
    }
}
exports.UnauthorizedMessageDeletionError = UnauthorizedMessageDeletionError;
class UnauthorizedMessageEditError extends errors_1.AuthorizationError {
    code = error_codes_1.ERROR_CODES.MESSAGE_EDIT_UNAUTHORIZED;
    constructor(messageId, userId) {
        super(`User ${userId} is not authorized to edit message ${messageId}`, { messageId, userId });
    }
}
exports.UnauthorizedMessageEditError = UnauthorizedMessageEditError;
class SendMessageDeniedError extends errors_1.AuthorizationError {
    code = error_codes_1.ERROR_CODES.SEND_MESSAGE_DENIED;
    constructor(senderId, channelId, reason) {
        super(`Send denied for ${senderId} in channel ${channelId}: ${reason}`, { senderId, channelId, reason });
    }
}
exports.SendMessageDeniedError = SendMessageDeniedError;
