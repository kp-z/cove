import { useTranslation } from 'react-i18next'
import { Edit2, Trash2, Globe, CheckCircle, Zap, Loader2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
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

  const handleTest = async () => {
    setIsTesting(true)
    try {
      await onTestConnection()
    } finally {
      setIsTesting(false)
    }
  }

  // Get display URL/path based on adapter type
  const getDisplayUrl = () => {
    if (adapter.type === 'claude-code-cli') {
      return adapter.config?.cli_path || '/usr/local/bin/claude'
    }
    return adapter.config?.base_url || 'N/A'
  }

  // Get model info
  const getModelInfo = () => {
    return adapter.config?.model || 'N/A'
  }

  return (
    <div
      className={`
        p-6 rounded-xl border transition-all
        ${isDefault
          ? 'bg-white/5 border-green-500/50 ring-1 ring-green-500/20'
          : 'bg-white/5 border-white/10 hover:border-white/20'
        }
      `}
    >
      {/* Header: Name + Status Badge + Actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-medium text-white">{adapter.name}</h3>
          {isDefault && (
            <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-300 border border-green-500/30">
              当前激活
            </span>
          )}
          {!canModify && (
            <span className="text-xs px-2 py-1 rounded bg-gray-500/20 text-gray-300 border border-gray-500/30">
              {t('adapters.card.readOnly')}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* 测试连通性 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTest}
            disabled={isTesting}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            {isTesting ? (
              <Loader2 size={14} className="mr-1 animate-spin" />
            ) : (
              <Zap size={14} className="mr-1" />
            )}
            测试
          </Button>

          {canModify && (
            <>
              {/* 编辑 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
                className="text-white/60 hover:text-white hover:bg-white/10"
              >
                <Edit2 size={14} className="mr-1" />
                编辑
              </Button>

              {/* 激活为默认 / 当前激活 */}
              {isDefault ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled
                  className="bg-green-500/20 text-green-300 border border-green-500/30 cursor-not-allowed"
                >
                  <CheckCircle size={14} className="mr-1" />
                  当前激活
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSetDefault}
                  className="text-white/60 hover:text-white hover:bg-white/10"
                >
                  <CheckCircle size={14} className="mr-1" />
                  激活
                </Button>
              )}

              {/* 删除 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <Trash2 size={14} className="mr-1" />
                删除
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Content: URL + Model */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-white/60">
          <Globe size={14} className="flex-shrink-0" />
          <span className="truncate">{getDisplayUrl()}</span>
          <span className="text-white/40">·</span>
          <span className="text-white/80">{getModelInfo()}</span>
        </div>
      </div>
    </div>
  )
}
