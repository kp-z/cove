"use strict";
/**
 * UserService - User 管理业务逻辑
 *
 * 职责：
 * - 创建和管理用户
 * - 用户查询
 * - 角色和权限管理
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const user_entity_1 = require("../../../domain/models/user/user.entity");
const user_errors_1 = require("./user.errors");
const realm_context_store_1 = require("../../context/realm-context-store");
class UserService {
    userRepository;
    eventBus;
    logger;
    auditService;
    constructor(userRepository, eventBus, logger, auditService) {
        this.userRepository = userRepository;
        this.eventBus = eventBus;
        this.logger = logger;
        this.auditService = auditService;
    }
    async createUser(dto) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Creating new user', { username: dto.username, realmId: context.realmId });
        if (await this.userRepository.usernameExists(dto.username)) {
            throw new user_errors_1.UsernameAlreadyExistsError(dto.username);
        }
        if (await this.userRepository.emailExists(dto.email)) {
            throw new user_errors_1.EmailAlreadyExistsError(dto.email);
        }
        const userId = this.generateUserId();
        const user = user_entity_1.UserEntity.create({
            userId,
            username: dto.username,
            displayName: dto.displayName,
            email: dto.email,
            role: dto.role || 'user',
            avatar: dto.avatar,
            permissions: [],
            createdAt: new Date(),
        });
        await this.userRepository.save(user, context.realmId);
        await this.publishEvent({
            eventId: this.generateEventId(),
            eventType: 'user.created',
            aggregateId: userId,
            aggregateType: 'User',
            occurredAt: new Date(),
            payload: {
                userId,
                username: dto.username,
                role: user.role,
            },
        });
        // Audit log
        if (context.userId) {
            await this.auditService.log(context.userId, 'user.create', 'user', userId, {
                after: { username: dto.username, email: dto.email, role: user.role },
            });
        }
        this.logger.info('User created successfully', { userId });
        return user;
    }
    async getUserById(userId) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new user_errors_1.UserNotFoundError(userId);
        }
        return user;
    }
    async getUserByUsername(username) {
        const user = await this.userRepository.findByUsername(username);
        if (!user) {
            throw new user_errors_1.UserNotFoundError(username);
        }
        return user;
    }
    async getUserByEmail(email) {
        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            throw new user_errors_1.UserNotFoundError(email);
        }
        return user;
    }
    async getUsersByRole(role) {
        return await this.userRepository.findByRole(role);
    }
    async getAllUsers() {
        return await this.userRepository.findAll();
    }
    async getUsersPaginated(params) {
        this.logger.info('Getting users paginated', { page: params.page, limit: params.limit, role: params.role });
        return await this.userRepository.findPaginated(params);
    }
    async updateUser(userId, dto) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Updating user', { userId, realmId: context.realmId });
        let user = await this.getUserById(userId);
        const before = { displayName: user.displayName, email: user.email };
        if (dto.displayName !== undefined) {
            user = user.updateDisplayName(dto.displayName);
        }
        if (dto.email !== undefined) {
            if (await this.userRepository.emailExists(dto.email)) {
                const existing = await this.userRepository.findByEmail(dto.email);
                if (existing && existing.userId !== userId) {
                    throw new user_errors_1.EmailAlreadyExistsError(dto.email);
                }
            }
            user = user.updateEmail(dto.email);
        }
        if (dto.preference !== undefined) {
            user = user.updatePreference(dto.preference);
        }
        await this.userRepository.update(user, context.realmId);
        await this.publishEvent({
            eventId: this.generateEventId(),
            eventType: 'user.updated',
            aggregateId: userId,
            aggregateType: 'User',
            occurredAt: new Date(),
            payload: { userId, changes: dto },
        });
        // Audit log
        if (context.userId) {
            await this.auditService.log(context.userId, 'user.update', 'user', userId, {
                before,
                after: { displayName: user.displayName, email: user.email },
            });
        }
        this.logger.info('User updated successfully', { userId });
        return user;
    }
    async updateUserRole(userId, role) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Updating user role', { userId, role, realmId: context.realmId });
        let user = await this.getUserById(userId);
        user = user.updateRole(role);
        await this.userRepository.update(user, context.realmId);
        await this.publishEvent({
            eventId: this.generateEventId(),
            eventType: 'user.role_changed',
            aggregateId: userId,
            aggregateType: 'User',
            occurredAt: new Date(),
            payload: { userId, role },
        });
        this.logger.info('User role updated successfully', { userId, role });
        return user;
    }
    async deleteUser(userId) {
        this.logger.info('Deleting user (soft delete)', { userId });
        const user = await this.getUserById(userId);
        const deletedUser = user.softDelete();
        const context = (0, realm_context_store_1.getRealmContext)();
        await this.userRepository.update(deletedUser, context.realmId);
        await this.publishEvent({
            eventId: this.generateEventId(),
            eventType: 'user.deleted',
            aggregateId: userId,
            aggregateType: 'User',
            occurredAt: new Date(),
            payload: { userId },
        });
        // Audit log
        if (context.userId) {
            await this.auditService.log(context.userId, 'user.delete', 'user', userId, {
                before: { username: user.username, status: user.status },
            });
        }
        this.logger.info('User soft deleted successfully', { userId });
    }
    async activateUser(userId) {
        this.logger.info('Activating user', { userId });
        const user = await this.getUserById(userId);
        const activatedUser = user.activate();
        const context = (0, realm_context_store_1.getRealmContext)();
        await this.userRepository.update(activatedUser, context.realmId);
        await this.publishEvent({
            eventId: this.generateEventId(),
            eventType: 'user.activated',
            aggregateId: userId,
            aggregateType: 'User',
            occurredAt: new Date(),
            payload: { userId },
        });
        // Audit log
        if (context.userId) {
            await this.auditService.log(context.userId, 'user.activate', 'user', userId, {
                before: { status: user.status },
                after: { status: activatedUser.status },
            });
        }
        this.logger.info('User activated successfully', { userId });
        return activatedUser;
    }
    async suspendUser(userId) {
        this.logger.info('Suspending user', { userId });
        const user = await this.getUserById(userId);
        const suspendedUser = user.suspend();
        const context = (0, realm_context_store_1.getRealmContext)();
        await this.userRepository.update(suspendedUser, context.realmId);
        await this.publishEvent({
            eventId: this.generateEventId(),
            eventType: 'user.suspended',
            aggregateId: userId,
            aggregateType: 'User',
            occurredAt: new Date(),
            payload: { userId },
        });
        // Audit log
        if (context.userId) {
            await this.auditService.log(context.userId, 'user.suspend', 'user', userId, {
                before: { status: user.status },
                after: { status: suspendedUser.status },
            });
        }
        this.logger.info('User suspended successfully', { userId });
        return suspendedUser;
    }
    async unlockUser(userId) {
        this.logger.info('Unlocking user', { userId });
        const user = await this.getUserById(userId);
        const unlockedUser = user.unlockAccount();
        const context = (0, realm_context_store_1.getRealmContext)();
        await this.userRepository.update(unlockedUser, context.realmId);
        await this.publishEvent({
            eventId: this.generateEventId(),
            eventType: 'user.unlocked',
            aggregateId: userId,
            aggregateType: 'User',
            occurredAt: new Date(),
            payload: { userId },
        });
        // Audit log
        if (context.userId) {
            await this.auditService.log(context.userId, 'user.unlock', 'user', userId, {
                before: { locked: user.isLocked() },
                after: { locked: unlockedUser.isLocked() },
            });
        }
        this.logger.info('User unlocked successfully', { userId });
        return unlockedUser;
    }
    generateUserId() {
        return `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    generateEventId() {
        return `event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    async publishEvent(event) {
        try {
            await this.eventBus.publish(event);
        }
        catch (error) {
            this.logger.error('Failed to publish event', error, {
                eventType: event.eventType,
                aggregateId: event.aggregateId,
            });
        }
    }
}
exports.UserService = UserService;
