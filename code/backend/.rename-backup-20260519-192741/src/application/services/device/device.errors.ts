/**
 * Device Service Error Classes
 */

import { NotFoundError, ConflictError, ValidationError, AuthorizationError } from '../../../common/errors';
import { ERROR_CODES } from '../../../common/errors/error-codes';

export class DeviceNotFoundError extends NotFoundError {
  readonly code = ERROR_CODES.DEVICE_NOT_FOUND;

  constructor(deviceId: string) {
    super(`Device not found: ${deviceId}`, { deviceId });
  }
}

export class DeviceNameAlreadyExistsError extends ConflictError {
  readonly code = ERROR_CODES.DEVICE_NAME_EXISTS;

  constructor(name: string, userId: string) {
    super(`Device name already exists for user ${userId}: ${name}`, { name, userId });
  }
}

export class DeviceNotActiveError extends ValidationError {
  readonly code = ERROR_CODES.DEVICE_NOT_ACTIVE;

  constructor(deviceId: string) {
    super(`Device is not active: ${deviceId}`, { deviceId });
  }
}

export class DeviceAlreadyRevokedError extends ValidationError {
  readonly code = ERROR_CODES.DEVICE_ALREADY_REVOKED;

  constructor(deviceId: string) {
    super(`Device is already revoked: ${deviceId}`, { deviceId });
  }
}

export class DeviceNotRevokedError extends ValidationError {
  readonly code = ERROR_CODES.DEVICE_NOT_REVOKED;

  constructor(deviceId: string) {
    super(`Device is not revoked: ${deviceId}`, { deviceId });
  }
}

export class UnauthorizedDeviceAccessError extends AuthorizationError {
  readonly code = ERROR_CODES.UNAUTHORIZED_DEVICE_ACCESS;

  constructor(deviceId: string, userId: string) {
    super(`User ${userId} is not authorized to access device ${deviceId}`, { deviceId, userId });
  }
}
