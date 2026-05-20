"use strict";
/**
 * Realm Service Error Classes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnauthorizedRealmAccessError = exports.RealmNotArchivedError = exports.RealmAlreadyArchivedError = exports.RealmNotActiveError = exports.RealmNameAlreadyExistsError = exports.RealmNotFoundError = void 0;
const errors_1 = require("../../../common/errors");
const error_codes_1 = require("../../../common/errors/error-codes");
class RealmNotFoundError extends errors_1.NotFoundError {
    code = error_codes_1.ERROR_CODES.REALM_NOT_FOUND;
    constructor(realmId) {
        super(`Realm not found: ${realmId}`, { realmId });
    }
}
exports.RealmNotFoundError = RealmNotFoundError;
class RealmNameAlreadyExistsError extends errors_1.ConflictError {
    code = error_codes_1.ERROR_CODES.REALM_NAME_EXISTS;
    constructor(name) {
        super(`Realm name already exists: ${name}`, { name });
    }
}
exports.RealmNameAlreadyExistsError = RealmNameAlreadyExistsError;
class RealmNotActiveError extends errors_1.ValidationError {
    code = error_codes_1.ERROR_CODES.REALM_NOT_ACTIVE;
    constructor(realmId) {
        super(`Realm is not active: ${realmId}`, { realmId });
    }
}
exports.RealmNotActiveError = RealmNotActiveError;
class RealmAlreadyArchivedError extends errors_1.ValidationError {
    code = error_codes_1.ERROR_CODES.REALM_ALREADY_ARCHIVED;
    constructor(realmId) {
        super(`Realm is already archived: ${realmId}`, { realmId });
    }
}
exports.RealmAlreadyArchivedError = RealmAlreadyArchivedError;
class RealmNotArchivedError extends errors_1.ValidationError {
    code = error_codes_1.ERROR_CODES.REALM_NOT_ARCHIVED;
    constructor(realmId) {
        super(`Realm is not archived: ${realmId}`, { realmId });
    }
}
exports.RealmNotArchivedError = RealmNotArchivedError;
class UnauthorizedRealmAccessError extends errors_1.AuthorizationError {
    code = error_codes_1.ERROR_CODES.UNAUTHORIZED_REALM_ACCESS;
    constructor(realmId, userId) {
        super(`User ${userId} is not authorized to access server ${realmId}`, { realmId, userId });
    }
}
exports.UnauthorizedRealmAccessError = UnauthorizedRealmAccessError;
