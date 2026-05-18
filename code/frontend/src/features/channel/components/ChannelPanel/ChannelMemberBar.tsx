/**
 * ChannelMemberBar - 频道成员/Agent 信息头
 * 参考 claude_manager 的 AgentChatHeader 实现
 *
 * 折叠态: 叠层头像 + Agent名 + 模型 + 叠层skill/tool图标 + 展开按钮
 * 展开态: 每个 Agent 独占一行的纵向列表
 */
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
import { useAgents } from '@/lib/trpc/hooks';
import type { Agent } from '@/lib/trpc-types';

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

// ── 获取 Agent 头像 URL ──
function getAgentAvatarUrl(agent: Agent): string {
  // TODO: 实现真实的头像 URL 逻辑
  // 暂时使用 placeholder
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${agent.agent_id}`;
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

// ── 叠层头像 ──
function StackedAvatars({
  agents,
  max = 3
}: {
  agents: Agent[];
  max?: number;
}) {
  if (agents.length === 0) return null;

  const visible = agents.slice(0, max);
  const overflow = agents.length - max;

  return (
    <div className="flex items-center">
      {visible.map((agent, i) => (
        <div
          key={agent.agent_id}
          className={`w-6 h-6 rounded-lg overflow-hidden flex-shrink-0 border border-white/10 ring-1 ring-[#0f111a] ${i > 0 ? '-ml-2' : ''}`}
          style={{ zIndex: max - i }}
          title={agent.display_name || agent.name}
        >
          <img
            src={getAgentAvatarUrl(agent)}
            alt={agent.display_name || agent.name}
            className="w-full h-full object-cover"
          />
        </div>
      ))}
      {overflow > 0 && (
        <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center ring-1 ring-[#0f111a] -ml-2 text-[9px] text-gray-400 font-bold flex-shrink-0">
          +{overflow}
        </div>
      )}
    </div>
  );
}

// ── Agent 行（展开态每行） ──
function AgentRow({ agent }: { agent: Agent }) {
  const skills = agent.skills?.skillIds || [];
  const tools = agent.tools?.toolIds || [];

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 transition-colors group">
      {/* 头像 */}
      <div
        className="w-5 h-5 rounded overflow-hidden flex-shrink-0 border border-white/10"
        title={agent.display_name || agent.name}
      >
        <img
          src={getAgentAvatarUrl(agent)}
          alt={agent.display_name || agent.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* 名称 */}
      <span className="text-xs text-gray-300 truncate min-w-0 flex-1">
        {agent.display_name || agent.name}
      </span>

      {/* 模型 */}
      <div className="flex items-center gap-0.5 text-[10px] text-gray-500 flex-shrink-0">
        <Sparkles className="w-2.5 h-2.5" />
        {getModelLabel(agent)}
      </div>

      {/* Skills/Tools */}
      {(skills.length > 0 || tools.length > 0) && (
        <StackedIcons skills={skills} tools={tools} max={4} />
      )}
    </div>
  );
}

// ── Props ──
export interface ChannelMemberBarProps {
  channelId?: string;
  className?: string;
}

// ── 主组件 ──
export function ChannelMemberBar({
  channelId,
  className = ''
}: ChannelMemberBarProps) {
  const [expanded, setExpanded] = useState(false);
  const { data: agents, isLoading } = useAgents();

  const handleToggleExpand = useCallback(() => {
    setExpanded(prev => !prev);
  }, []);

  // 过滤与当前频道相关的 agents
  // TODO: 根据实际业务逻辑过滤 agents
  const channelAgents = agents || [];
  const primaryAgent = channelAgents[0] || null;

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
            <span className="font-medium">Agents</span>
            <span className="text-gray-600">({channelAgents.length})</span>
          </button>
        </div>

        {/* Agent 列表 */}
        <div className="max-h-48 overflow-y-auto border-t border-white/5">
          {channelAgents.map(agent => (
            <AgentRow key={agent.agent_id} agent={agent} />
          ))}
          {channelAgents.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-600">无 Agent</div>
          )}
        </div>
      </div>
    );
  }

  // 折叠态
  const primarySkills = primaryAgent?.skills?.skillIds || [];
  const primaryTools = primaryAgent?.tools?.toolIds || [];

  return (
    <div className={`px-3 py-2 border-b border-white/10 flex items-center gap-2 ${className}`}>
      {/* 展开按钮 */}
      <button
        onClick={handleToggleExpand}
        className="p-0.5 text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>

      {/* 叠层头像 */}
      <StackedAvatars agents={channelAgents} />

      {/* 名称 + 模型 */}
      {primaryAgent && (
        <>
          <span className="text-xs text-gray-300 truncate min-w-0">
            {primaryAgent.display_name || primaryAgent.name}
          </span>
          <div className="flex items-center gap-0.5 text-[10px] text-gray-500 flex-shrink-0">
            <Sparkles className="w-2.5 h-2.5" />
            {getModelLabel(primaryAgent)}
          </div>
        </>
      )}

      {/* 叠层 skill/tool 图标 */}
      {primaryAgent && (primarySkills.length > 0 || primaryTools.length > 0) && (
        <StackedIcons skills={primarySkills} tools={primaryTools} />
      )}

      {/* 占位 flex-1 推按钮到右侧 */}
      <div className="flex-1" />
    </div>
  );
}
