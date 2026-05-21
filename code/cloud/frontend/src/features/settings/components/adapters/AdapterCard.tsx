import { useTranslation } from 'react-i18next'
import { Edit2, Trash2, CheckCircle, Zap, Loader2, Sparkles, Cpu, Terminal, Info, AlertCircle } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { GlassCard } from '@/shared/components/ui/cards/GlassCard'
import { useState } from 'react'
import type { Adapter } from '@/features/settings/types/adapter.types'

interface AdapterCardProps {
  adapter: Adapter
  isDefault: boolean
  canModify: boolean
  onEdit: () => void
  onDelete: () => void
  onSetDefault: () => void
  onTestConnection: () => void
}

export function AdapterCard({
  adapter,
  isDefault,
  canModify,
  onEdit,
  onDelete,
  onSetDefault,
  onTestConnection,
}: AdapterCardProps) {
  const { t } = useTranslation('settings')
  const [isTesting, setIsTesting] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleTest = async () => {
    setIsTesting(true)
    setTestStatus('idle')
    try {
      await onTestConnection()
      setTestStatus('success')
      setTimeout(() => setTestStatus('idle'), 3000)
    } catch (error) {
      setTestStatus('error')
      setTimeout(() => setTestStatus('idle'), 3000)
    } finally {
      setIsTesting(false)
    }
  }

  // Get type icon
  const getTypeIcon = () => {
    switch (adapter.type) {
      case 'anthropic-api':
        return <Sparkles size={20} className="text-indigo-400" />
      case 'openai-api':
        return <Cpu size={20} className="text-green-400" />
      case 'claude-code-cli':
        return <Terminal size={20} className="text-blue-400" />
      default:
        return <Sparkles size={20} className="text-gray-400" />
    }
  }

  // Get display info
  const getDisplayInfo = () => {
    const parts: string[] = []

    if (adapter.type === 'claude-code-cli') {
      const cliPath = adapter.config?.cli_path || '/usr/local/bin/claude'
      parts.push(cliPath)
    } else {
      if (adapter.config?.base_url) {
        parts.push(adapter.config.base_url)
      }
      if (adapter.config?.model) {
        parts.push(adapter.config.model)
      }
    }

    return parts.length > 0 ? parts.join(' • ') : 'No configuration'
  }

  // Get test status indicator
  const getTestStatusIndicator = () => {
    if (testStatus === 'success') {
      return (
        <div className="flex items-center gap-1 text-xs text-green-400">
          <CheckCircle size={12} />
          <span>连接成功</span>
        </div>
      )
    }
    if (testStatus === 'error') {
      return (
        <div className="flex items-center gap-1 text-xs text-red-400">
          <AlertCircle size={12} />
          <span>连接失败</span>
        </div>
      )
    }
    return null
  }

  return (
    <GlassCard>
      <div className="p-4 flex items-center gap-3">
        {/* Left: Type Icon */}
        <div className="flex-shrink-0">
          {getTypeIcon()}
        </div>

        {/* Middle: Info */}
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-white truncate">
              {adapter.name}
            </h3>
            {isDefault && (
              <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-green-500/20 text-green-300 rounded flex-shrink-0">
                <CheckCircle size={10} />
                激活
              </span>
            )}
            {!canModify && (
              <span className="px-2 py-0.5 text-xs bg-gray-500/20 text-gray-300 rounded flex-shrink-0">
                只读
              </span>
            )}
          </div>

          {/* Config info */}
          <p className="text-xs text-white/50 truncate mb-1">
            {getDisplayInfo()}
          </p>

          {/* Test status */}
          {getTestStatusIndicator()}
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Test button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTest}
            disabled={isTesting}
            className="h-8 px-3 text-white/70 hover:text-white text-xs"
            title="测试连接"
          >
            {isTesting ? (
              <>
                <Loader2 size={14} className="mr-1 animate-spin" />
                测试中
              </>
            ) : (
              <>
                <Zap size={14} className="mr-1" />
                测试
              </>
            )}
          </Button>

          {/* Details button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="h-8 px-3 text-white/70 hover:text-white text-xs"
            title="查看详情"
          >
            <Info size={14} className="mr-1" />
            详情
          </Button>

          {canModify && (
            <>
              {/* Edit button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
                className="h-8 w-8 p-0 text-white/70 hover:text-white"
                title="编辑"
              >
                <Edit2 size={14} />
              </Button>

              {/* Activate button */}
              {!isDefault && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSetDefault}
                  className="h-8 w-8 p-0 text-white/70 hover:text-white"
                  title="激活"
                >
                  <CheckCircle size={14} />
                </Button>
              )}

              {/* Delete button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="h-8 w-8 p-0 text-white/70 hover:text-red-400"
                title="删除"
              >
                <Trash2 size={14} />
              </Button>
            </>
          )}
        </div>
      </div>
    </GlassCard>
  )
}
