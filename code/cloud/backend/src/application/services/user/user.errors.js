"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailAlreadyExistsError = exports.UsernameAlreadyExistsError = exports.UserNotFoundError = void 0;
const errors_1 = require("../../../common/errors");
const error_codes_1 = require("../../../common/errors/error-codes");
class UserNotFoundError extends errors_1.NotFoundError {
    code = error_codes_1.ERROR_CODES.USER_NOT_FOUND;
    constructor(identifier) {
        super(`User not found: ${identifier}`, { identifier });
    }
}
exports.UserNotFoundError = UserNotFoundError;
class UsernameAlreadyExistsError extends errors_1.ConflictError {
    code = error_codes_1.ERROR_CODES.USERNAME_ALREADY_EXISTS;
    constructor(username) {
        super(`Username already exists: ${username}`, { username });
    }
}
exports.UsernameAlreadyExistsError = UsernameAlreadyExistsError;
class EmailAlreadyExistsError extends errors_1.ConflictError {
    code = error_codes_1.ERROR_CODES.EMAIL_ALREADY_EXISTS;
    constructor(email) {
        super(`Email already exists: ${email}`, { email });
    }
}
exports.EmailAlreadyExistsError = EmailAlreadyExistsError;
