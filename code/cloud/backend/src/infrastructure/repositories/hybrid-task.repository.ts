import { HybridRepository } from './hybrid-repository.base';
import { TaskEntity, TaskStatus, TaskPriority, TaskType } from '../../domain/models/task/task.entity';
import { ITaskRepository } from '../../application/interfaces/repositories/task.repository.interface';
import { ActorRef } from '../../domain/models/value-objects/actor-ref';
import { AssigneeRef } from '../../domain/models/value-objects/assignee-ref';
import { getRealmContext } from '../../application/context/realm-context-store';

interface TaskDbRecord {
  id: string;
  realmId: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  projectId: string;
  channelId: string;
  assigneeId: string | null;
  detailsPath: string;
  createdAt: Date;
  updatedAt: Date;
  dueDate: Date | null;
}

interface TaskContent {
  taskType: TaskType;
  taskNumber?: number;
  krId?: string;
  sourceMessageId?: string;
  assignee?: any;
  dependsOn?: string[];
  createdBy: any;
}

export class HybridTaskRepository
  extends HybridRepository<TaskEntity, TaskDbRecord, TaskContent>
  implements ITaskRepository
{
  getEntityType(): string { return 'tasks'; }
  getEntityId(entity: TaskEntity): string { return entity.taskId; }

  toDomain(dbRecord: TaskDbRecord, content: TaskContent): TaskEntity {
    return TaskEntity.create({
      taskId: dbRecord.id,
      realmId: dbRecord.realmId,
      title: dbRecord.title,
      description: dbRecord.description,
      taskType: content.taskType,
      priority: dbRecord.priority as TaskPriority,
      status: dbRecord.status as TaskStatus,
      channelId: dbRecord.channelId,
      projectId: dbRecord.projectId,
      krId: content.krId,
      taskNumber: content.taskNumber,
      sourceMessageId: content.sourceMessageId,
      assignee: content.assignee ? AssigneeRef.fromJSON(content.assignee) : undefined,
      dependsOn: content.dependsOn,
      createdBy: ActorRef.create(content.createdBy),
      createdAt: dbRecord.createdAt,
    });
  }

  toDatabase(entity: TaskEntity): TaskDbRecord {
    return {
      id: entity.taskId,
      realmId: entity.realmId,
      title: entity.title,
      description: entity.description || '',
      status: entity.status,
      priority: entity.priority,
      projectId: entity.projectId,
      channelId: entity.channelId,
      assigneeId: entity.assignee?.id ?? null,
      detailsPath: '',
      createdAt: entity.createdAt,
      updatedAt: new Date(),
      dueDate: null,
    };
  }

  toStorage(entity: TaskEntity): TaskContent {
    return {
      taskType: entity.taskType,
      taskNumber: entity.taskNumber,
      krId: entity.krId,
      sourceMessageId: entity.sourceMessageId,
      assignee: entity.assignee?.toJSON(),
      dependsOn: entity.dependsOn ? [...entity.dependsOn] : undefined,
      createdBy: entity.createdBy.toJSON(),
    };
  }

  getContentPath(dbRecord: TaskDbRecord): string {
    return dbRecord.detailsPath;
  }

  // --- ITaskRepository ---

  async findById(taskId: string, realmId: string): Promise<TaskEntity | null> {
    return this.findEntityById(taskId, realmId);
  }

  async findByChannel(channelId: string): Promise<TaskEntity[]> {
    const context = getRealmContext();
    const records = await this.prisma.task.findMany({
      where: {
        channelId,
        realmId: context.realmId,
      },
      orderBy: { createdAt: 'desc' },
    });
    return this.loadEntities(records as unknown as TaskDbRecord[]);
  }

  async findByProject(projectId: string): Promise<TaskEntity[]> {
    const context = getRealmContext();
    const records = await this.prisma.task.findMany({
      where: {
        projectId,
        realmId: context.realmId,
      },
      orderBy: { createdAt: 'desc' },
    });
    return this.loadEntities(records as unknown as TaskDbRecord[]);
  }

  async findByStatus(status: TaskStatus): Promise<TaskEntity[]> {
    const context = getRealmContext();
    const records = await this.prisma.task.findMany({
      where: {
        status,
        realmId: context.realmId,
      },
      orderBy: { createdAt: 'desc' },
    });
    return this.loadEntities(records as unknown as TaskDbRecord[]);
  }

  async findByPriority(priority: TaskPriority): Promise<TaskEntity[]> {
    const context = getRealmContext();
    const records = await this.prisma.task.findMany({
      where: {
        priority,
        realmId: context.realmId,
      },
      orderBy: { createdAt: 'desc' },
    });
    return this.loadEntities(records as unknown as TaskDbRecord[]);
  }

  async findByAssignee(assigneeId: string): Promise<TaskEntity[]> {
    const context = getRealmContext();
    const records = await this.prisma.task.findMany({
      where: {
        assigneeId,
        realmId: context.realmId,
      },
      orderBy: { createdAt: 'desc' },
    });
    return this.loadEntities(records as unknown as TaskDbRecord[]);
  }

  async findByKR(krId: string): Promise<TaskEntity[]> {
    const context = getRealmContext();
    // KR is not in the database, need to load all and filter
    const all = await this.prisma.task.findMany({
      where: { realmId: context.realmId },
      orderBy: { createdAt: 'desc' },
    });
    const entities = await this.loadEntities(all as unknown as TaskDbRecord[]);
    return entities.filter(e => e.krId === krId);
  }

  async save(task: TaskEntity): Promise<void> {
    await this.saveEntity(task, task.realmId);
  }

  async update(task: TaskEntity): Promise<void> {
    await this.updateEntity(task, task.realmId);
  }

  async delete(taskId: string, realmId: string): Promise<void> {
    await this.deleteEntity(taskId, realmId);
  }

  async exists(taskId: string): Promise<boolean> {
    const context = getRealmContext();
    const count = await this.prisma.task.count({
      where: {
        id: taskId,
        realmId: context.realmId,
      },
    });
    return count > 0;
  }

  async getNextTaskNumber(channelId: string): Promise<number> {
    const context = getRealmContext();
    const count = await this.prisma.task.count({
      where: {
        channelId,
        realmId: context.realmId,
      },
    });
    return count + 1;
  }

  // --- Database operations (required by HybridRepository) ---

  protected async saveToDatabase(dbRecord: TaskDbRecord, contentPath: string): Promise<void> {
    await this.prisma.task.create({
      data: {
        realmId: dbRecord.realmId,
        id: dbRecord.id,
        title: dbRecord.title,
        description: dbRecord.description,
        status: dbRecord.status,
        priority: dbRecord.priority,
        projectId: dbRecord.projectId,
        channelId: dbRecord.channelId,
        assigneeId: dbRecord.assigneeId,
        detailsPath: contentPath,
        createdAt: dbRecord.createdAt,
        updatedAt: dbRecord.updatedAt,
        dueDate: dbRecord.dueDate,
      },
    });
  }

  protected async updateInDatabase(entityId: string, dbRecord: TaskDbRecord, contentPath: string): Promise<void> {
    await this.prisma.task.update({
      where: { id: entityId },
      data: {
        title: dbRecord.title,
        description: dbRecord.description,
        status: dbRecord.status,
        priority: dbRecord.priority,
        assigneeId: dbRecord.assigneeId,
        detailsPath: contentPath,
        updatedAt: dbRecord.updatedAt,
        dueDate: dbRecord.dueDate,
      },
    });
  }

  protected async deleteFromDatabase(entityId: string, realmId: string): Promise<void> {
    await this.prisma.task.delete({ where: { id: entityId, realmId } });
  }

  protected async findInDatabase(entityId: string, realmId: string): Promise<TaskDbRecord | null> {
    const record = await this.prisma.task.findFirst({
      where: {
        id: entityId,
        realmId,
      },
    });
    return record as unknown as TaskDbRecord | null;
  }
}
