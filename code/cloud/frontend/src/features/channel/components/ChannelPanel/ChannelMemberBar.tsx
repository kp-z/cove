import { useState, useCallback } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Sparkles,
  Loader2,
  Zap,
  Wrench,
  FileText,
  Pencil,
  Terminal,
  Search,
  FolderSearch,
  Globe,
  Download,
  MessageSquare,
  ListChecks,
  BookOpen,
  type LucideIcon,
} from 'lucide-react';
import { useChannelMembers } from '@/lib/trpc/hooks';
import { useAgent } from '@/lib/trpc/hooks/agent.hooks';
import { useUser } from '@/lib/trpc/hooks/user.hooks';
import { getAvatarUrl } from '@/shared/utils/avatar';
import { getAgentAvatarUrl } from '@/features/agent/utils/avatar';
import type { Agent, User } from '@/lib/trpc-types';

// ── Tool → Icon 映射 ──
const TOOL_ICON_MAP: Record<string, LucideIcon> = {
  Read: FileText,
  Write: Pencil,
  Edit: Pencil,
  Bash: Terminal,
  Grep: Search,
  Glob: FolderSearch,
  WebSearch: Globe,
  WebFetch: Download,
  AskUser: MessageSquare,
  Task: ListChecks,
  TodoRead: BookOpen,
  TodoWrite: ListChecks,
  NotebookEdit: BookOpen,
  NotebookRead: BookOpen,
  MultiEdit: Pencil,
};

// ── 按名称 hash 分配颜色（12色调色板） ──
const COLOR_PALETTE = [
  { text: 'text-purple-400', bg: 'bg-purple-500/20' },
  { text: 'text-blue-400', bg: 'bg-blue-500/20' },
  { text: 'text-green-400', bg: 'bg-green-500/20' },
  { text: 'text-orange-400', bg: 'bg-orange-500/20' },
  { text: 'text-pink-400', bg: 'bg-pink-500/20' },
  { text: 'text-cyan-400', bg: 'bg-cyan-500/20' },
  { text: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  { text: 'text-red-400', bg: 'bg-red-500/20' },
  { text: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  { text: 'text-indigo-400', bg: 'bg-indigo-500/20' },
  { text: 'text-amber-400', bg: 'bg-amber-500/20' },
  { text: 'text-teal-400', bg: 'bg-teal-500/20' },
];

function hashColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return COLOR_PALETTE[h % COLOR_PALETTE.length];
}

function getModelLabel(agent: Agent): string {
  const model = agent.runtime_config?.model || 'sonnet';
  if (model === 'opus') return 'Opus';
  if (model === 'sonnet') return 'Sonnet';
  if (model === 'haiku') return 'Haiku';
  return model.charAt(0).toUpperCase() + model.slice(1);
}

// ── 叠层图标（Skills + Tools）──
function StackedIcons({
  skills,
  tools,
  max = 5
}: {
  skills: string[];
  tools: string[];
  max?: number;
}) {
  const total = skills.length + tools.length;
  if (total === 0) return null;

  const visible = Math.min(total, max);
  const overflow = total - visible;

  const items: { key: string; icon: LucideIcon; color: string; bg: string; label: string }[] = [];

  for (const s of skills) {
    const c = hashColor(s);
    items.push({ key: `s-${s}`, icon: Zap, color: c.text, bg: c.bg, label: s });
  }

  for (const t of tools) {
    const Icon = TOOL_ICON_MAP[t] || Wrench;
    const c = hashColor(t);
    items.push({ key: `t-${t}`, icon: Icon, color: c.text, bg: c.bg, label: t });
  }

  return (
    <div className="flex items-center">
      {items.slice(0, visible).map((item, i) => {
        const Icon = item.icon;
        return (
          <div
            key={item.key}
            className={`w-4 h-4 rounded-full ${item.bg} flex items-center justify-center ring-1 ring-[#0f111a] ${i > 0 ? '-ml-1' : ''}`}
            style={{ zIndex: visible - i }}
            title={item.label}
          >
            <Icon className={`w-2.5 h-2.5 ${item.color}`} />
          </div>
        );
      })}
      {overflow > 0 && (
        <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center ring-1 ring-[#0f111a] -ml-1 text-[8px] text-gray-400 font-bold">
          +{overflow}
        </div>
      )}
    </div>
  );
}

// ── Props ──
export interface ChannelMemberBarProps {
  channelId: string;
  className?: string;
}

// ── Hook to fetch member details ──
function useMemberDetails(memberId: string, memberType: 'agent' | 'human') {
  const { data: agent } = useAgent(memberId, { enabled: memberType === 'agent' });
  const { data: user } = useUser(memberId, { enabled: memberType === 'human' });

  return memberType === 'agent' ? agent : user;
}

// ── Member Row Component ──
function MemberRow({ memberId, memberType }: { memberId: string; memberType: 'agent' | 'human' }) {
  const memberData = useMemberDetails(memberId, memberType);

  if (!memberData) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5">
        <div className="w-5 h-5 rounded overflow-hidden flex-shrink-0 border border-white/10 bg-white/5 animate-pulse" />
        <span className="text-xs text-gray-500">Loading...</span>
      </div>
    );
  }

  if (memberType === 'agent') {
    const agent = memberData as Agent;
    const skills = agent.skills?.skillIds || [];
    const tools = agent.tools?.toolIds || [];
    const avatarUrl = getAgentAvatarUrl(agent.persona?.avatar?.url);

    return (
      <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 transition-colors group">
        <div
          className="w-5 h-5 rounded overflow-hidden flex-shrink-0 border border-white/10"
          title={agent.display_name || agent.name}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={agent.display_name || agent.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
              {(agent.display_name || agent.name).charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <span className="text-xs text-gray-300 truncate min-w-0 flex-1">
          {agent.display_name || agent.name}
        </span>
        <div className="flex items-center gap-0.5 text-[10px] text-gray-500 flex-shrink-0">
          <Sparkles className="w-2.5 h-2.5" />
          {getModelLabel(agent)}
        </div>
        {(skills.length > 0 || tools.length > 0) && (
          <StackedIcons skills={skills} tools={tools} max={4} />
        )}
      </div>
    );
  } else {
    const user = memberData as User;
    const avatarUrl = getAvatarUrl(user.avatar);
    const displayName = user.username || user.email;

    return (
      <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 transition-colors group">
        <div
          className="w-5 h-5 rounded overflow-hidden flex-shrink-0 border border-white/10"
          title={displayName}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center text-white text-xs font-semibold">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <span className="text-xs text-gray-300 truncate min-w-0 flex-1">
          {displayName}
        </span>
        <div className="flex items-center gap-0.5 text-[10px] text-gray-500 flex-shrink-0">
          <span>User</span>
        </div>
      </div>
    );
  }
}

// ── 主组件 ──
export function ChannelMemberBar({
  channelId,
  className = ''
}: ChannelMemberBarProps) {
  const [expanded, setExpanded] = useState(false);
  const { data: membersData, isLoading } = useChannelMembers(channelId);

  const handleToggleExpand = useCallback(() => {
    setExpanded(prev => !prev);
  }, []);

  const members = membersData?.members || [];
  const agentMembers = members.filter(m => m.memberType === 'agent');
  const userMembers = members.filter(m => m.memberType === 'human');
  const totalMembers = members.length;

  // 加载态
  if (isLoading) {
    return (
      <div className={`px-4 py-3 border-b border-white/10 flex items-center gap-2 ${className}`}>
        <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-indigo-500/20 flex-shrink-0">
          <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
        </div>
        <div className="text-xs text-gray-400">加载中...</div>
      </div>
    );
  }

  // 展开态
  if (expanded) {
    return (
      <div className={`border-b border-white/10 ${className}`}>
        {/* 顶行 */}
        <div className="px-3 py-2 flex items-center justify-between">
          <button
            onClick={handleToggleExpand}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 transition-colors"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            <span className="font-medium">Members</span>
            <span className="text-gray-600">({totalMembers})</span>
          </button>
        </div>

        {/* Member 列表 */}
        <div className="max-h-48 overflow-y-auto border-t border-white/5">
          {/* Agents 部分 */}
          {agentMembers.length > 0 && (
            <>
              <div className="px-3 py-1 text-[10px] text-gray-500 font-medium">
                Agents ({agentMembers.length})
              </div>
              {agentMembers.map(member => (
                <MemberRow
                  key={member.memberId}
                  memberId={member.memberId}
                  memberType="agent"
                />
              ))}
            </>
          )}

          {/* Users 部分 */}
          {userMembers.length > 0 && (
            <>
              <div className="px-3 py-1 text-[10px] text-gray-500 font-medium">
                Users ({userMembers.length})
              </div>
              {userMembers.map(member => (
                <MemberRow
                  key={member.memberId}
                  memberId={member.memberId}
                  memberType="human"
                />
              ))}
            </>
          )}

          {totalMembers === 0 && (
            <div className="px-3 py-2 text-xs text-gray-600">无成员</div>
          )}
        </div>
      </div>
    );
  }

  // 折叠态 - 显示第一个成员的信息
  const firstMember = members[0];

  if (!firstMember) {
    return (
      <div className={`px-3 py-2 border-b border-white/10 flex items-center gap-2 ${className}`}>
        <button
          onClick={handleToggleExpand}
          className="p-0.5 text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <span className="text-xs text-gray-500">No members</span>
      </div>
    );
  }

  return (
    <CollapsedMemberBar
      members={members}
      totalMembers={totalMembers}
      onToggleExpand={handleToggleExpand}
      className={className}
    />
  );
}

// ── 折叠态组件 ──
function CollapsedMemberBar({
  members,
  totalMembers,
  onToggleExpand,
  className
}: {
  members: Array<{ memberId: string; memberType: 'agent' | 'human' }>;
  totalMembers: number;
  onToggleExpand: () => void;
  className: string;
}) {
  // 获取前3个成员的详细信息用于头像显示
  const visibleMembers = members.slice(0, 3);
  const firstMember = members[0];
  const firstMemberData = useMemberDetails(firstMember.memberId, firstMember.memberType);

  if (!firstMemberData) {
    return (
      <div className={`px-3 py-2 border-b border-white/10 flex items-center gap-2 ${className}`}>
        <button
          onClick={onToggleExpand}
          className="p-0.5 text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <div className="w-6 h-6 rounded-lg bg-white/5 animate-pulse" />
        <span className="text-xs text-gray-500">Loading...</span>
      </div>
    );
  }

  const isAgent = firstMember.memberType === 'agent';
  const agent = isAgent ? (firstMemberData as Agent) : null;
  const user = !isAgent ? (firstMemberData as User) : null;

  const displayName = isAgent
    ? (agent!.display_name || agent!.name)
    : (user!.username || user!.email);

  const skills = agent?.skills?.skillIds || [];
  const tools = agent?.tools?.toolIds || [];

  return (
    <div className={`px-3 py-2 border-b border-white/10 flex items-center gap-2 ${className}`}>
      <button
        onClick={onToggleExpand}
        className="p-0.5 text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>

      {/* 叠层头像 */}
      <CollapsedAvatars members={visibleMembers} />

      {/* 名称 + 模型 */}
      <span className="text-xs text-gray-300 truncate min-w-0">
        {displayName}
      </span>

      {isAgent && agent && (
        <div className="flex items-center gap-0.5 text-[10px] text-gray-500 flex-shrink-0">
          <Sparkles className="w-2.5 h-2.5" />
          {getModelLabel(agent)}
        </div>
      )}

      {/* 叠层 skill/tool 图标 */}
      {isAgent && (skills.length > 0 || tools.length > 0) && (
        <StackedIcons skills={skills} tools={tools} />
      )}

      {/* 成员数量 */}
      {totalMembers > 1 && (
        <span className="text-[10px] text-gray-500 flex-shrink-0">
          +{totalMembers - 1}
        </span>
      )}

      <div className="flex-1" />
    </div>
  );
}

// ── 折叠态头像组件 ──
function CollapsedAvatars({
  members,
  max = 3
}: {
  members: Array<{ memberId: string; memberType: 'agent' | 'human' }>;
  max?: number;
}) {
  const visible = members.slice(0, max);
  const overflow = members.length - max;

  return (
    <div className="flex items-center">
      {visible.map((member, i) => (
        <CollapsedAvatar
          key={member.memberId}
          memberId={member.memberId}
          memberType={member.memberType}
          zIndex={max - i}
          isStacked={i > 0}
        />
      ))}
      {overflow > 0 && (
        <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center ring-1 ring-[#0f111a] -ml-2 text-[9px] text-gray-400 font-bold flex-shrink-0">
          +{overflow}
        </div>
      )}
    </div>
  );
}

// ── 单个折叠态头像 ──
function CollapsedAvatar({
  memberId,
  memberType,
  zIndex,
  isStacked
}: {
  memberId: string;
  memberType: 'agent' | 'human';
  zIndex: number;
  isStacked: boolean;
}) {
  const memberData = useMemberDetails(memberId, memberType);

  if (!memberData) {
    return (
      <div
        className={`w-6 h-6 rounded-lg bg-white/5 animate-pulse flex-shrink-0 border border-white/10 ring-1 ring-[#0f111a] ${isStacked ? '-ml-2' : ''}`}
        style={{ zIndex }}
      />
    );
  }

  const isAgent = memberType === 'agent';
  const agent = isAgent ? (memberData as Agent) : null;
  const user = !isAgent ? (memberData as User) : null;

  const displayName = isAgent
    ? (agent!.display_name || agent!.name)
    : (user!.username || user!.email);

  const avatarUrl = isAgent
    ? getAgentAvatarUrl(agent!.persona?.avatar?.url)
    : getAvatarUrl(user!.avatar);

  return (
    <div
      className={`w-6 h-6 rounded-lg overflow-hidden flex-shrink-0 border border-white/10 ring-1 ring-[#0f111a] ${isStacked ? '-ml-2' : ''}`}
      style={{ zIndex }}
      title={displayName}
    >
      <img
        src={avatarUrl}
        alt={displayName}
        className="w-full h-full object-cover"
      />
    </div>
  );
}
