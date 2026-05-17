/**
 * 设计 Token 系统 - 统一的视觉样式常量
 *
 * 用于确保整个应用的视觉一致性，包括圆角、间距、颜色、阴影等。
 * 所有组件应优先使用这些 token 而不是硬编码的值。
 */

/**
 * 圆角系统
 * 基于 8px 网格系统，提供一致的圆角大小
 */
export const borderRadius = {
  none: '0',
  sm: '0.375rem',    // 6px - 小元素（按钮、输入框）
  md: '0.5rem',      // 8px - 中等元素（卡片内部元素）
  lg: '0.75rem',     // 12px - 大元素（对话框、抽屉）
  xl: '1rem',        // 16px - 超大元素（主要卡片）
  '2xl': '1.5rem',   // 24px - Dashboard 卡片、面板
  '3xl': '2rem',     // 32px - 特殊容器
  full: '9999px',    // 完全圆形（头像、徽章）

  // 特殊用途
  card: '1.5rem',           // 24px - Dashboard 卡片标准圆角
  panel: '1rem',            // 16px - 侧边面板圆角
  mobileNav: '2.75rem',     // 44px - 移动端导航栏圆角（iOS 风格）
  button: '0.5rem',         // 8px - 按钮圆角
  input: '0.5rem',          // 8px - 输入框圆角
  modal: '1rem',            // 16px - 模态框圆角
  dropdown: '0.75rem',      // 12px - 下拉菜单圆角
} as const;

/**
 * 间距系统
 * 基于 4px 基准网格
 */
export const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
} as const;

/**
 * 颜色系统
 * 基于项目的深色主题配色
 */
export const colors = {
  // 背景色
  background: {
    primary: '#0f111a',      // 主背景
    secondary: '#13151f',    // 次级背景
    tertiary: '#1a1d2e',     // 三级背景
    elevated: '#2a2d3e',     // 悬浮元素背景
  },

  // 文本色
  text: {
    primary: '#e4e4e7',      // 主文本
    secondary: '#9ca3af',    // 次级文本
    tertiary: '#6b7280',     // 三级文本
    disabled: '#4b5563',     // 禁用文本
  },

  // 边框色
  border: {
    default: 'rgba(255, 255, 255, 0.1)',   // 默认边框
    hover: 'rgba(255, 255, 255, 0.2)',     // 悬浮边框
    focus: 'rgba(59, 130, 246, 0.5)',      // 聚焦边框
  },

  // 品牌色
  brand: {
    primary: '#3b82f6',      // 主品牌色（蓝色）
    secondary: '#8b5cf6',    // 次级品牌色（紫色）
  },

  // 状态色
  status: {
    success: '#10b981',      // 成功（绿色）
    warning: '#f59e0b',      // 警告（橙色）
    error: '#ef4444',        // 错误（红色）
    info: '#3b82f6',         // 信息（蓝色）
  },

  // 玻璃态效果
  glass: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: 'rgba(255, 255, 255, 0.1)',
    hover: 'rgba(255, 255, 255, 0.1)',
  },
} as const;

/**
 * 阴影系统
 */
export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',

  // 特殊用途
  card: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  panel: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  mobileNav: '0 -4px 20px rgba(0, 0, 0, 0.3)',
  glow: '0 0 20px rgba(255, 255, 255, 0.3)',
} as const;

/**
 * 动画时长
 */
export const duration = {
  fast: '150ms',
  normal: '300ms',
  slow: '500ms',
} as const;

/**
 * 动画缓动函数
 */
export const easing = {
  linear: 'linear',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

/**
 * Z-index 层级系统
 */
export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modalBackdrop: 40,
  modal: 50,
  popover: 60,
  tooltip: 70,
  notification: 80,
} as const;

/**
 * 断点系统（与 Tailwind 保持一致）
 */
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

/**
 * 设计 Token 类型导出
 */
export type BorderRadius = typeof borderRadius;
export type Spacing = typeof spacing;
export type Colors = typeof colors;
export type Shadows = typeof shadows;
export type Duration = typeof duration;
export type Easing = typeof easing;
export type ZIndex = typeof zIndex;
export type Breakpoints = typeof breakpoints;

/**
 * 完整的设计 Token 对象
 */
export const designTokens = {
  borderRadius,
  spacing,
  colors,
  shadows,
  duration,
  easing,
  zIndex,
  breakpoints,
} as const;

export type DesignTokens = typeof designTokens;
