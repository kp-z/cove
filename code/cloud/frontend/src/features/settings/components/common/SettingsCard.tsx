import { ReactNode } from 'react'
import { GlassCard } from '@/shared/components/ui/cards/GlassCard'

interface SettingsCardProps {
  title: string
  description?: string
  children: ReactNode
}

export function SettingsCard({ title, description, children }: SettingsCardProps) {
  return (
    <GlassCard padding="p-6" className="mb-6" hover={false}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {description && (
          <p className="text-sm text-white/60 mt-1">{description}</p>
        )}
      </div>
      <div className="space-y-6">{children}</div>
    </GlassCard>
  )
}

interface SettingsRowProps {
  label: string
  description?: string
  children: ReactNode
}

export function SettingsRow({ label, description, children }: SettingsRowProps) {
  return (
    <div className="flex items-start justify-between gap-8 py-3 border-b border-white/5 last:border-b-0 last:pb-0 first:pt-0">
      <div className="flex-1 min-w-0">
        <div className="text-white font-medium">{label}</div>
        {description && (
          <div className="text-sm text-white/60 mt-1">{description}</div>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}
