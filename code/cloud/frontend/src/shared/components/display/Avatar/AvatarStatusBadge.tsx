import {
  Loader2,
  Sparkles,
  Wrench,
  Pencil,
  AlertTriangle,
  Check,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/shared/utils/cn';

/**
 * Avatar 右上角状态胶囊（纯展示组件，领域无关）
 *
 * 用途：在头像右上角叠加一个「状态动画胶囊」，用于直观表达实体当前的运行/在线状态。
 * 设计原则：
 * - 纯展示：不感知任何业务领域概念（如流式阶段），仅接收抽象的 AvatarStatus。
 * - 视觉零回归：online 状态必须与历史写死的绿色脉冲圆点完全一致（emerald-400 + 脉冲 + 描边）。
 * - 随头像缩放：通过 size 映射尺寸，胶囊与图标随头像大小同步缩放。
 */

/** 头像尺寸类型（与 Avatar 组件保持一致，集中定义供复用） */
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** 抽象的头像状态（领域无关，由上层业务映射得到） */
export type AvatarStatus =
  | 'loading'    // 加载中
  | 'thinking'   // 思考中
  | 'tool'       // 调用工具中
  | 'responding' // 正在回复
  | 'error'      // 响应失败
  | 'success'    // 已完成
  | 'online'     // 在线
  | 'offline';   // 离线

/** 单个状态的渲染配置 */
interface StatusConfigItem {
  /** 是否仅渲染为简单小圆点（online/offline），否则渲染为图标胶囊 */
  dotOnly: boolean;
  /** lucide 图标组件（dotOnly 时可为 undefined） */
  icon?: LucideIcon;
  /** 胶囊/圆点的配色 class（背景/文字色） */
  colorClass: string;
  /** 动画 class（无动画则为空字符串） */
  animationClass: string;
  /** 悬浮提示与无障碍文案（中文） */
  tooltip: string;
}

// 步骤 1：状态配置映射表 —— 每个状态对应图标、配色、动画与中文文案
const STATUS_CONFIG: Record<AvatarStatus, StatusConfigItem> = {
  // loading：旋转 Loader2，蓝色（与气泡内「正在输入」蓝色主题一致），表示等待/加载
  loading: {
    dotOnly: false,
    icon: Loader2,
    colorClass: 'bg-blue-500 text-white',
    animationClass: 'animate-spin',
    tooltip: '正在加载…',
  },
  // thinking：脉冲 Sparkles，蓝色，表示思考中
  thinking: {
    dotOnly: false,
    icon: Sparkles,
    colorClass: 'bg-blue-500 text-white',
    animationClass: 'animate-pulse',
    tooltip: '思考中…',
  },
  // tool：跳动 Wrench，紫色，表示调用工具
  tool: {
    dotOnly: false,
    icon: Wrench,
    colorClass: 'bg-purple-500 text-white',
    animationClass: 'animate-bounce',
    tooltip: '调用工具中…',
  },
  // responding：轻脉冲 Pencil，绿色，表示正在回复
  responding: {
    dotOnly: false,
    icon: Pencil,
    colorClass: 'bg-emerald-500 text-white',
    animationClass: 'animate-pulse',
    tooltip: '正在回复…',
  },
  // error：脉冲 AlertTriangle，红色，表示响应失败
  error: {
    dotOnly: false,
    icon: AlertTriangle,
    colorClass: 'bg-red-500 text-white',
    animationClass: 'animate-pulse',
    tooltip: '响应失败',
  },
  // success：静态 Check，绿色，表示已完成
  success: {
    dotOnly: false,
    icon: Check,
    colorClass: 'bg-emerald-500 text-white',
    animationClass: '',
    tooltip: '已完成',
  },
  // online：纯绿色脉冲圆点（与历史写死圆点一致：emerald-400 + 脉冲）
  online: {
    dotOnly: true,
    colorClass: 'bg-emerald-400',
    animationClass: 'animate-pulse',
    tooltip: '在线',
  },
  // offline：纯灰色静态圆点
  offline: {
    dotOnly: true,
    colorClass: 'bg-gray-500',
    animationClass: '',
    tooltip: '离线',
  },
};

/**
 * 尺寸映射：根据头像 size 计算胶囊容器尺寸、图标像素、圆点尺寸。
 * - badge：图标胶囊（dotOnly=false）的容器尺寸 class。
 * - icon：lucide 图标的像素大小。
 * - dot：简单圆点（dotOnly=true）的尺寸 class（online 需与历史 w-2 h-2 一致）。
 */
const SIZE_MAP: Record<AvatarSize, { badge: string; icon: number; dot: string }> = {
  xs: { badge: 'w-3 h-3', icon: 8, dot: 'w-1.5 h-1.5' },
  sm: { badge: 'w-4 h-4', icon: 10, dot: 'w-2 h-2' },
  md: { badge: 'w-4 h-4', icon: 11, dot: 'w-2 h-2' },
  lg: { badge: 'w-5 h-5', icon: 13, dot: 'w-2.5 h-2.5' },
  xl: { badge: 'w-6 h-6', icon: 16, dot: 'w-3 h-3' },
};

export interface AvatarStatusBadgeProps {
  /** 抽象状态 */
  status: AvatarStatus;
  /** 头像尺寸（决定胶囊缩放），默认 sm 与历史绿色圆点尺寸保持一致 */
  size?: AvatarSize;
}

/**
 * AvatarStatusBadge —— 渲染头像右上角的状态圆点/图标胶囊。
 */
export function AvatarStatusBadge({ status, size = 'sm' }: AvatarStatusBadgeProps) {
  // 步骤 1：取出当前状态与尺寸的配置
  const config = STATUS_CONFIG[status];
  const sizeConf = SIZE_MAP[size];

  // 步骤 2：online/offline 渲染为简单小圆点（不放图标）
  // 注意：偏移与描边沿用历史写死圆点（-top-0.5/-right-0.5 + ring-1），确保旧 isRunning 调用点视觉零回归。
  if (config.dotOnly) {
    return (
      <div
        className={cn(
          'absolute -top-0.5 -right-0.5 rounded-full ring-1 ring-[#0f111a]',
          sizeConf.dot,
          config.colorClass,
          config.animationClass
        )}
        title={config.tooltip}
        aria-label={config.tooltip}
        role="img"
      />
    );
  }

  // 步骤 3：其余状态渲染为「图标胶囊」（圆形容器 + 居中小图标 + 动画）
  const Icon = config.icon;
  return (
    <div
      className={cn(
        'absolute -top-1 -right-1 flex items-center justify-center rounded-full ring-2 ring-[#0f111a]',
        sizeConf.badge,
        config.colorClass
      )}
      title={config.tooltip}
      aria-label={config.tooltip}
      role="img"
    >
      {Icon && <Icon size={sizeConf.icon} className={config.animationClass} />}
    </div>
  );
}
