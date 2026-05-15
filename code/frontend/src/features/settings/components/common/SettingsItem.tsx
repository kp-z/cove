import { ReactNode } from 'react'

interface SettingsSectionProps {
  title: string
  description?: string
  children: ReactNode
}

export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <div className="mb-8">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {description && (
          <p className="text-sm text-white/60 mt-1">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

interface SettingsItemProps {
  label: string
  description?: string
  children: ReactNode
}

export function SettingsItem({ label, description, children }: SettingsItemProps) {
  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
      <div className="flex-1">
        <div className="text-white font-medium">{label}</div>
        {description && (
          <div className="text-sm text-white/60 mt-1">{description}</div>
        )}
      </div>
      <div className="ml-4">{children}</div>
    </div>
  )
}
