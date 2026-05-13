/**
 * IMemberRepository - Member Repository 接口
 *
 * Application Layer 通过此接口访问 Member 数据。
 */

import { MemberEntity, MemberRole, MemberStatus } from '../../../domain/models/member/member.entity';

export interface IMemberRepository {
  findById(memberId: string): Promise<MemberEntity | null>;
  findByChannel(channelId: string): Promise<MemberEntity[]>;
  findByUser(userId: string): Promise<MemberEntity[]>;
  findByChannelAndUser(channelId: string, userId: string): Promise<MemberEntity | null>;
  findByRole(channelId: string, role: MemberRole): Promise<MemberEntity[]>;
  findByStatus(channelId: string, status: MemberStatus): Promise<MemberEntity[]>;
  save(member: MemberEntity): Promise<void>;
  update(member: MemberEntity): Promise<void>;
  delete(memberId: string): Promise<void>;
  exists(memberId: string): Promise<boolean>;
  existsByChannelAndUser(channelId: string, userId: string): Promise<boolean>;
}
