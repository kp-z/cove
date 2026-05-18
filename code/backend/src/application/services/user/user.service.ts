/**
 * UserService - User 管理业务逻辑
 *
 * 职责：
 * - 创建和管理用户
 * - 用户查询
 * - 角色和权限管理
 */

import { UserEntity, UserRole, UserPreference } from '../../../domain/models/user/user.entity';
import { UserNotFoundError, UsernameAlreadyExistsError, EmailAlreadyExistsError } from './user.errors';
import {
  IUserRepository,
  IEventBus,
  ILogger,
  DomainEvent,
} from '../../interfaces';
import { ServerContext } from '../../context/server-context';

export interface CreateUserDTO {
  readonly username: string;
  readonly displayName: string;
  readonly email: string;
  readonly role?: UserRole;
  readonly avatar?: string;
}

export interface UpdateUserDTO {
  readonly displayName?: string;
  readonly email?: string;
  readonly avatar?: string;
  readonly preference?: UserPreference;
}

export class UserService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger
  ) {}

  async createUser(dto: CreateUserDTO, context: ServerContext): Promise<UserEntity> {
    this.logger.info('Creating new user', { username: dto.username, serverId: context.serverId });

    if (await this.userRepository.usernameExists(dto.username)) {
      throw new UsernameAlreadyExistsError(dto.username);
    }

    if (await this.userRepository.emailExists(dto.email)) {
      throw new EmailAlreadyExistsError(dto.email);
    }

    const userId = this.generateUserId();

    const user = UserEntity.create({
      userId,
      username: dto.username,
      displayName: dto.displayName,
      email: dto.email,
      role: dto.role || 'user',
      avatar: dto.avatar,
      permissions: [],
      createdAt: new Date(),
    });

    await this.userRepository.save(user, context.serverId);

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

    this.logger.info('User created successfully', { userId });
    return user;
  }

  async getUserById(userId: string): Promise<UserEntity> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }
    return user;
  }

  async getUserByUsername(username: string): Promise<UserEntity> {
    const user = await this.userRepository.findByUsername(username);
    if (!user) {
      throw new UserNotFoundError(username);
    }
    return user;
  }

  async getUserByEmail(email: string): Promise<UserEntity> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new UserNotFoundError(email);
    }
    return user;
  }

  async getUsersByRole(role: UserRole): Promise<UserEntity[]> {
    return await this.userRepository.findByRole(role);
  }

  async getAllUsers(): Promise<UserEntity[]> {
    return await this.userRepository.findAll();
  }

  async updateUser(userId: string, dto: UpdateUserDTO, context: ServerContext): Promise<UserEntity> {
    this.logger.info('Updating user', { userId, serverId: context.serverId });

    let user = await this.getUserById(userId);

    if (dto.displayName !== undefined) {
      user = user.updateDisplayName(dto.displayName);
    }

    if (dto.email !== undefined) {
      if (await this.userRepository.emailExists(dto.email)) {
        const existing = await this.userRepository.findByEmail(dto.email);
        if (existing && existing.userId !== userId) {
          throw new EmailAlreadyExistsError(dto.email);
        }
      }
      user = user.updateEmail(dto.email);
    }

    if (dto.preference !== undefined) {
      user = user.updatePreference(dto.preference);
    }

    await this.userRepository.update(user, context.serverId);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'user.updated',
      aggregateId: userId,
      aggregateType: 'User',
      occurredAt: new Date(),
      payload: { userId, changes: dto },
    });

    this.logger.info('User updated successfully', { userId });
    return user;
  }

  async updateUserRole(userId: string, role: UserRole, context: ServerContext): Promise<UserEntity> {
    this.logger.info('Updating user role', { userId, role, serverId: context.serverId });

    let user = await this.getUserById(userId);
    user = user.updateRole(role);

    await this.userRepository.update(user, context.serverId);

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

  async deleteUser(userId: string): Promise<void> {
    this.logger.info('Deleting user', { userId });

    await this.getUserById(userId);
    await this.userRepository.delete(userId);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'user.deleted',
      aggregateId: userId,
      aggregateType: 'User',
      occurredAt: new Date(),
      payload: { userId },
    });

    this.logger.info('User deleted successfully', { userId });
  }

  private generateUserId(): string {
    return `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateEventId(): string {
    return `event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private async publishEvent(event: DomainEvent): Promise<void> {
    try {
      await this.eventBus.publish(event);
    } catch (error) {
      this.logger.error('Failed to publish event', error as Error, {
        eventType: event.eventType,
        aggregateId: event.aggregateId,
      });
    }
  }
}

