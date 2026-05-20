/**
 * IRealmMemberRepository - Server 成员仓储接口
 *
 * 职责：
 * - Server 成员的持久化操作
 * - Server 成员查询
 */

import { RealmMemberEntity, RealmRole, MemberStatus } from '../../../domain/models/realm-member/realm-member.entity';

export interface IRealmMemberRepository {
  // 基本 CRUD
  findById(memberId: string): Promise<RealmMemberEntity | null>;
  findByServerAndUser(realmId: string, userId: string): Promise<RealmMemberEntity | null>;
  save(member: RealmMemberEntity, realmId: string): Promise<void>;
  update(member: RealmMemberEntity, realmId: string): Promise<void>;

  // 查询
  findByServer(realmId: string): Promise<RealmMemberEntity[]>;
  findByRole(realmId: string, role: RealmRole): Promise<RealmMemberEntity[]>;
  findByStatus(realmId: string, status: MemberStatus): Promise<RealmMemberEntity[]>;

  // 检查
  existsByServerAndUser(realmId: string, userId: string): Promise<boolean>;
}
