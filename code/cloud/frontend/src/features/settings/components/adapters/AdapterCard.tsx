import { useTranslation } from 'react-i18next'
import { Edit2, Trash2, CheckCircle, Zap, Loader2, Sparkles, Cpu, Terminal, Globe, AlertCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react'
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
  const [testMessage, setTestMessage] = useState<string>('')
  const [detailOpen, setDetailOpen] = useState(false)

  const handleTest = async () => {
    setIsTesting(true)
    setTestStatus('idle')
    setTestMessage('')
    try {
      await onTestConnection()
      setTestStatus('success')
      setTestMessage('连接成功')
      setTimeout(() => setTestStatus('idle'), 3000)
    } catch (error) {
      setTestStatus('error')
      setTestMessage(error instanceof Error ? error.message : '连接失败')
      setTimeout(() => setTestStatus('idle'), 5000)
    } finally {
      setIsTesting(false)
    }
  }

  // Get type icon
  const getTypeIcon = () => {
    switch (adapter.type) {
      case 'anthropic-api':
        return <Sparkles size={18} className="text-indigo-400" />
      case 'openai-api':
        return <Cpu size={18} className="text-green-400" />
      case 'claude-code-cli':
        return <Terminal size={18} className="text-blue-400" />
      default:
        return <Sparkles size={18} className="text-gray-400" />
    }
  }

  // Get display info
  const getDisplayInfo = () => {
    const parts: string[] = []

    if (adapter.type === 'claude-code-cli') {
      const cliPath = adapter.config?.cli_path || '/usr/local/bin/claude'
      return cliPath
    } else {
      const baseUrl = adapter.config?.base_url || '官方网关'
      const model = adapter.config?.model
      return model ? `${baseUrl} · ${model}` : baseUrl
    }
  }

  // Get status icon
  const getStatusIcon = () => {
    if (testStatus === 'success') {
      return <CheckCircle size={18} className="text-emerald-400" />
    }
    if (testStatus === 'error') {
      return <AlertCircle size={18} className="text-rose-400" />
    }
    return null
  }

  const showDetailControl = testStatus === 'error' && testMessage.length > 32

  return (
    <GlassCard hover={false}>
      <div className="p-3 sm:p-4">
        {/* Header: Name + Status Badge + Actions */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="font-medium text-white">{adapter.name}</span>
            {isDefault && (
              <span className="shrink-0 rounded-md border border-white/15 bg-white/[0.06] px-2 py-0.5 text-xs text-gray-300">
                当前激活
              </span>
            )}
            {!canModify && (
              <span className="shrink-0 rounded-md border border-white/15 bg-white/[0.06] px-2 py-0.5 text-xs text-gray-300">
                只读
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex shrink-0 flex-wrap justify-end gap-1.5 sm:gap-2">
            {canModify && isDefault && (
              <button
                type="button"
                disabled
                className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-gray-500 cursor-not-allowed sm:px-3"
              >
                取消
              </button>
            )}
            {canModify && !isDefault && (
              <button
                type="button"
                onClick={onSetDefault}
                className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs text-gray-200 hover:bg-white/15 sm:px-3"
              >
                激活
              </button>
            )}
            {canModify && (
              <>
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={isTesting}
                  className={`inline-flex items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1.5 text-xs sm:px-3 ${
                    isTesting
                      ? 'cursor-not-allowed text-gray-500'
                      : 'text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {isTesting ? (
                    <Loader2 size={12} className="shrink-0 animate-spin" />
                  ) : (
                    <Zap size={12} className="shrink-0" />
                  )}
                  测试
                </button>
                <button
                  type="button"
                  onClick={onEdit}
                  className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs hover:bg-white/15 sm:px-3"
                >
                  编辑
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  className="rounded-lg bg-red-500/20 px-2.5 py-1.5 text-xs text-red-300 hover:bg-red-500/30 sm:px-3"
                >
                  删除
                </button>
              </>
            )}
          </div>
        </div>

        {/* Config Info */}
        <div className="mt-2 flex min-w-0 items-center gap-1.5 text-xs text-gray-500">
          <Globe size={14} className="shrink-0 text-gray-500" aria-hidden />
          <span className="min-w-0 truncate font-mono text-gray-400">{getDisplayInfo()}</span>
        </div>

        {/* Status Bar */}
        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-white/5 pt-2.5">
          {testStatus !== 'idle' && (
            <span className="inline-flex items-center gap-1.5">
              {getStatusIcon()}
              <span className={`text-sm font-semibold ${testStatus === 'success' ? 'text-emerald-300' : 'text-rose-300'}`}>
                {testMessage}
              </span>
            </span>
          )}
          {testStatus === 'idle' && (
            <span className="inline-flex items-center gap-1.5">
              {getTypeIcon()}
              <span className="text-sm font-medium text-gray-400">
                {adapter.type === 'anthropic-api' ? 'Anthropic API' :
                 adapter.type === 'openai-api' ? 'OpenAI API' : 'Claude Code CLI'}
              </span>
            </span>
          )}
          {showDetailControl && (
            <button
              type="button"
              onClick={() => setDetailOpen(v => !v)}
              className="ml-auto inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] text-gray-400 hover:bg-white/10 hover:text-gray-200"
            >
              详情
              {detailOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}
        </div>

        {/* Detail Panel */}
        {detailOpen && showDetailControl && (
          <div className="mt-2 space-y-2 rounded-lg border border-white/5 bg-black/20 p-2.5">
            <p className="text-xs leading-relaxed text-gray-300">{testMessage}</p>
          </div>
        )}
      </div>
    </GlassCard>
  )
}
