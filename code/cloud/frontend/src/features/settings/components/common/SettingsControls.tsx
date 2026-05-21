import { ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'

// SettingsRow - 设置项行布局组件
interface SettingsRowProps {
  label: string
  description?: string
  children: ReactNode
}

export function SettingsRow({ label, description, children }: SettingsRowProps) {
  return (
    <div className="flex items-start justify-between py-3 first:pt-0 last:pb-0">
      <div className="flex-1 pr-4">
        <div className="text-sm font-medium text-white">{label}</div>
        {description && (
          <div className="text-sm text-white/60 mt-1">{description}</div>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

// SettingsToggle - 开关控件
interface SettingsToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export function SettingsToggle({ checked, onChange, disabled = false }: SettingsToggleProps) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <div className="w-11 h-6 bg-white/20 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
    </label>
  )
}

// SettingsSelect - 下拉选择控件
interface SettingsSelectOption {
  value: string
  label: string
}

interface SettingsSelectProps {
  value: string
  onChange: (value: string) => void
  options: SettingsSelectOption[]
  disabled?: boolean
}

export function SettingsSelect({ value, onChange, options, disabled }: SettingsSelectProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-64">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// SettingsInput - 输入框控件
interface SettingsInputProps {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  type?: string
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function SettingsInput({
  value,
  onChange,
  type = 'text',
  placeholder,
  disabled,
  className,
}: SettingsInputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        'w-64 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40',
        'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
    />
  )
}

// SettingsButton - 按钮控件
interface SettingsButtonProps {
  onClick: () => void
  children: ReactNode
  variant?: 'default' | 'primary' | 'danger'
  disabled?: boolean
}

export function SettingsButton({
  onClick,
  children,
  variant = 'default',
  disabled,
}: SettingsButtonProps) {
  const variantStyles = {
    default: 'bg-white/10 hover:bg-white/20 text-white',
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    danger: 'bg-red-600/80 hover:bg-red-600 text-white',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'px-4 py-2 rounded-lg transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-blue-500/50',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantStyles[variant]
      )}
    >
      {children}
    </button>
  )
}

// ColorPicker - 颜色选择器（保留原有的）
interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  colors: readonly string[]
}

export function ColorPicker({ value, onChange, colors }: ColorPickerProps) {
  const colorMap: Record<string, string> = {
    blue: '#3b82f6',
    purple: '#a855f7',
    green: '#22c55e',
    orange: '#f97316',
    red: '#ef4444',
    pink: '#ec4899',
    yellow: '#eab308',
    cyan: '#06b6d4',
  }

  return (
    <div className="flex gap-2">
      {colors.map((color) => (
        <button
          key={color}
          onClick={() => onChange(color)}
          className={`w-8 h-8 rounded-full hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-white/50 ${
            value === color ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : ''
          }`}
          style={{
            backgroundColor: colorMap[color] || color,
          }}
          aria-label={color}
        />
      ))}
    </div>
  )
}
