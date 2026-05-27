/**
 * HybridWorkflowRepository - Workflow 混合持久化实现
 *
 * 混合策略：
 * - 数据库：存储索引字段（id, name, projectId, status）
 * - 文件系统：存储完整的 Workflow 实体 JSON
 */

import { HybridRepository } from './hybrid-repository.base';
import { WorkflowEntity, WorkflowStatus } from '../../domain/models/workflow/workflow.entity';
import { IWorkflowRepository } from '../../application/interfaces/repositories/workflow.repository.interface';

interface WorkflowDbRecord {
  id: string;
  realmId: string;
  name: string;
  type: string;
  status: string;
  projectId: string;
  definitionPath: string;
  createdAt: Date;
  updatedAt: Date;
}

interface WorkflowContent {
  description?: string;
  krId?: string;
  steps: any[][];
  triggers: any[];
  createdBy: {
    id: string;
    type: 'human' | 'agent';
  };
  meta: {
    tags?: string[];
    category?: string;
  };
}

export class HybridWorkflowRepository
  extends HybridRepository<WorkflowEntity, WorkflowDbRecord, WorkflowContent>
  implements IWorkflowRepository
{
  getEntityType(): string { return 'workflows'; }
  getEntityId(entity: WorkflowEntity): string { return entity.workflowId; }

  toDomain(dbRecord: WorkflowDbRecord, content: WorkflowContent): WorkflowEntity {
    return WorkflowEntity.create({
      workflowId: dbRecord.id,
      realmId: dbRecord.realmId,
      name: dbRecord.name,
      description: content.description,
      krId: content.krId,
      projectId: dbRecord.projectId,
      status: dbRecord.status as WorkflowStatus,
      steps: content.steps,
      triggers: content.triggers,
      createdAt: dbRecord.createdAt,
      updatedAt: dbRecord.updatedAt,
      createdBy: content.createdBy,
      meta: content.meta,
    });
  }

  toDatabase(entity: WorkflowEntity): WorkflowDbRecord {
    return {
      id: entity.workflowId,
      realmId: entity.realmId,
      name: entity.name,
      type: 'sequential',
      status: entity.status,
      projectId: entity.projectId,
      definitionPath: '',
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  toStorage(entity: WorkflowEntity): WorkflowContent {
    return {
      description: entity.description,
      krId: entity.krId,
      steps: Array.from(entity.steps.map(stage => Array.from(stage))),
      triggers: Array.from(entity.triggers),
      createdBy: entity.createdBy,
      meta: {
        tags: entity.meta.tags ? Array.from(entity.meta.tags) : undefined,
        category: entity.meta.category,
      },
    };
  }

  getContentPath(dbRecord: WorkflowDbRecord): string {
    return dbRecord.definitionPath;
  }

  // --- IWorkflowRepository ---

  async findById(workflowId: string, realmId: string): Promise<WorkflowEntity | null> {
    return this.findEntityById(workflowId, realmId);
  }

  async findByProject(projectId: string, realmId: string): Promise<WorkflowEntity[]> {
    const records = await this.prisma.workflow.findMany({
      where: {
        projectId,
        realmId,
      },
      orderBy: { name: 'asc' },
    });
    return this.loadEntities(records as unknown as WorkflowDbRecord[]);
  }

  async findByKR(krId: string, realmId: string): Promise<WorkflowEntity[]> {
    // KR filtering would need to be done in memory since it's in the content
    const all = await this.findAll(realmId);
    return all.filter(w => w.krId === krId);
  }

  async findByStatus(status: WorkflowStatus, realmId: string): Promise<WorkflowEntity[]> {
    const records = await this.prisma.workflow.findMany({
      where: {
        status,
        realmId,
      },
      orderBy: { name: 'asc' },
    });
    return this.loadEntities(records as unknown as WorkflowDbRecord[]);
  }

  async findActive(realmId: string): Promise<WorkflowEntity[]> {
    return this.findByStatus('active', realmId);
  }

  async findAll(realmId: string): Promise<WorkflowEntity[]> {
    const records = await this.prisma.workflow.findMany({
      where: { realmId },
      orderBy: { name: 'asc' },
    });
    return this.loadEntities(records as unknown as WorkflowDbRecord[]);
  }

  async save(workflow: WorkflowEntity): Promise<void> {
    await this.saveEntity(workflow, workflow.realmId);
  }

  async update(workflow: WorkflowEntity): Promise<void> {
    await this.updateEntity(workflow, workflow.realmId);
  }

  async delete(workflowId: string, realmId: string): Promise<void> {
    await this.deleteEntity(workflowId, realmId);
  }

  async exists(workflowId: string, realmId: string): Promise<boolean> {
    const count = await this.prisma.workflow.count({
      where: {
        id: workflowId,
        realmId,
      },
    });
    return count > 0;
  }

  // --- Database operations (required by HybridRepository) ---

  protected async saveToDatabase(dbRecord: WorkflowDbRecord, contentPath: string): Promise<void> {
    await this.prisma.workflow.create({
      data: {
        realmId: dbRecord.realmId,
        id: dbRecord.id,
        name: dbRecord.name,
        type: dbRecord.type,
        status: dbRecord.status,
        projectId: dbRecord.projectId,
        definitionPath: contentPath,
        createdAt: dbRecord.createdAt,
        updatedAt: dbRecord.updatedAt,
      },
    });
  }

  protected async updateInDatabase(entityId: string, dbRecord: WorkflowDbRecord, contentPath: string): Promise<void> {
    await this.prisma.workflow.update({
      where: { id: entityId },
      data: {
        name: dbRecord.name,
        type: dbRecord.type,
        status: dbRecord.status,
        definitionPath: contentPath,
        updatedAt: dbRecord.updatedAt,
      },
    });
  }

  protected async deleteFromDatabase(entityId: string, realmId: string): Promise<void> {
    await this.prisma.workflow.delete({
      where: {
        id: entityId,
        realmId,
      }
    });
  }

  protected async findInDatabase(entityId: string, realmId: string): Promise<WorkflowDbRecord | null> {
    const record = await this.prisma.workflow.findFirst({
      where: {
        id: entityId,
        realmId,
      },
    });
    return record as unknown as WorkflowDbRecord | null;
  }
}
