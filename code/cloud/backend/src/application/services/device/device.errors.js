"use strict";
/**
 * Device Service Error Classes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnauthorizedDeviceAccessError = exports.DeviceNotRevokedError = exports.DeviceAlreadyRevokedError = exports.DeviceNotActiveError = exports.DeviceNameAlreadyExistsError = exports.DeviceNotFoundError = void 0;
const errors_1 = require("../../../common/errors");
const error_codes_1 = require("../../../common/errors/error-codes");
class DeviceNotFoundError extends errors_1.NotFoundError {
    code = error_codes_1.ERROR_CODES.DEVICE_NOT_FOUND;
    constructor(deviceId) {
        super(`Device not found: ${deviceId}`, { deviceId });
    }
}
exports.DeviceNotFoundError = DeviceNotFoundError;
class DeviceNameAlreadyExistsError extends errors_1.ConflictError {
    code = error_codes_1.ERROR_CODES.DEVICE_NAME_EXISTS;
    constructor(name, userId) {
        super(`Device name already exists for user ${userId}: ${name}`, { name, userId });
    }
}
exports.DeviceNameAlreadyExistsError = DeviceNameAlreadyExistsError;
class DeviceNotActiveError extends errors_1.ValidationError {
    code = error_codes_1.ERROR_CODES.DEVICE_NOT_ACTIVE;
    constructor(deviceId) {
        super(`Device is not active: ${deviceId}`, { deviceId });
    }
}
exports.DeviceNotActiveError = DeviceNotActiveError;
class DeviceAlreadyRevokedError extends errors_1.ValidationError {
    code = error_codes_1.ERROR_CODES.DEVICE_ALREADY_REVOKED;
    constructor(deviceId) {
        super(`Device is already revoked: ${deviceId}`, { deviceId });
    }
}
exports.DeviceAlreadyRevokedError = DeviceAlreadyRevokedError;
class DeviceNotRevokedError extends errors_1.ValidationError {
    code = error_codes_1.ERROR_CODES.DEVICE_NOT_REVOKED;
    constructor(deviceId) {
        super(`Device is not revoked: ${deviceId}`, { deviceId });
    }
}
exports.DeviceNotRevokedError = DeviceNotRevokedError;
class UnauthorizedDeviceAccessError extends errors_1.AuthorizationError {
    code = error_codes_1.ERROR_CODES.UNAUTHORIZED_DEVICE_ACCESS;
    constructor(deviceId, userId) {
        super(`User ${userId} is not authorized to access device ${deviceId}`, { deviceId, userId });
    }
}
exports.UnauthorizedDeviceAccessError = UnauthorizedDeviceAccessError;
