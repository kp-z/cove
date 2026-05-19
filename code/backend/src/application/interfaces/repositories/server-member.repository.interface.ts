/**
 * IServerMemberRepository - Server 成员仓储接口
 *
 * 职责：
 * - Server 成员的持久化操作
 * - Server 成员查询
 */

import { ServerMemberEntity, ServerRole, MemberStatus } from '../../../domain/models/server-member/server-member.entity';

export interface IServerMemberRepository {
  // 基本 CRUD
  findById(memberId: string): Promise<ServerMemberEntity | null>;
  findByServerAndUser(serverId: string, userId: string): Promise<ServerMemberEntity | null>;
  save(member: ServerMemberEntity, serverId: string): Promise<void>;
  update(member: ServerMemberEntity, serverId: string): Promise<void>;

  // 查询
  findByServer(serverId: string): Promise<ServerMemberEntity[]>;
  findByRole(serverId: string, role: ServerRole): Promise<ServerMemberEntity[]>;
  findByStatus(serverId: string, status: MemberStatus): Promise<ServerMemberEntity[]>;

  // 检查
  existsByServerAndUser(serverId: string, userId: string): Promise<boolean>;
}
