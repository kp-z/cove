import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { useAdapters, useCreateAdapter, useUpdateAdapter, useDeleteAdapter, useTestConnection } from '@/lib/trpc/hooks'
import { useServer, useUpdateServer } from '@/lib/trpc/hooks/server.hooks'
import { useAuthStore } from '@/core/auth/authStore'
import { Button } from '@/shared/components/ui/button'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import { AdapterCard } from '@/features/settings/components/adapters/AdapterCard'
import { AdapterFormDialog, type AdapterFormData } from '@/features/settings/components/adapters/AdapterFormDialog'
import { toast } from 'sonner'
import type { Adapter } from '@/features/settings/types/adapter.types'

type AdapterType = 'anthropic-api' | 'openai-api' | 'claude-code-cli'

export function AdaptersPanel() {
  const { t } = useTranslation('settings')
  const { data: adaptersData } = useAdapters()
  // Wrap in useMemo to prevent dependency changes in other useMemo hooks
  const adapters = useMemo(() => adaptersData?.adapters || [], [adaptersData?.adapters])

  // Get current user
  const user = useAuthStore(state => state.user)

  // Use 'default-server' as the server ID (matches backend context default)
  const { data: server } = useServer('default-server')
  const updateServer = useUpdateServer()

  // CRUD hooks
  const createAdapter = useCreateAdapter()
  const updateAdapter = useUpdateAdapter()
  const deleteAdapter = useDeleteAdapter()

  // UI state
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null)
  const [editingAdapter, setEditingAdapter] = useState<Adapter | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<AdapterType>('anthropic-api')

  const defaultAdapterId = server?.settings?.default_adapter_id || ''

  // Filter adapters by active tab
  const filteredAdapters = useMemo(() => {
    return adapters.filter(adapter => adapter.type === activeTab)
  }, [adapters, activeTab])

  // Test connection hook
  const testConnection = useTestConnection()

  const handleDefaultChange = (adapterId: string) => {
    if (!server) return

    updateServer.mutate({
      serverId: server.server_id,
      data: {
        settings: {
          default_adapter_id: adapterId || undefined,
        },
      },
    }, {
      onSuccess: () => {
        toast.success('Default adapter updated')
      },
      onError: (error: Error) => {
        toast.error('Failed to update default adapter', {
          description: error.message,
        })
      },
    })
  }

  const handleSetDefault = (adapterId: string) => {
    handleDefaultChange(adapterId)
  }

  const handleTestConnection = async (adapterId: string) => {
    try {
      const result = await testConnection.mutateAsync({ adapterId })

      if (result.success) {
        toast.success(result.message, {
          description: result.details?.modelCount
            ? `Found ${result.details.modelCount} models (${result.details.latency}ms)`
            : `Latency: ${result.details?.latency}ms`,
        })
      } else {
        toast.error('Connection test failed', {
          description: result.message,
        })
      }
    } catch (error) {
      toast.error('Connection test failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  // Event handlers
  const handleCreate = () => {
    setDialogMode('create')
    setEditingAdapter(null)
  }

  const handleEdit = (adapter: Adapter) => {
    setDialogMode('edit')
    setEditingAdapter(adapter)
  }

  const handleDialogClose = () => {
    setDialogMode(null)
    setEditingAdapter(null)
  }

  const handleSubmit = async (data: AdapterFormData) => {
    try {
      if (dialogMode === 'create') {
        await createAdapter.mutateAsync({
          name: data.name,
          description: data.description,
          scope: data.scope,
          adapter: {
            type: data.type,
            config: data.config,
          },
        })
        toast.success('Adapter created successfully')
      } else if (dialogMode === 'edit' && editingAdapter) {
        await updateAdapter.mutateAsync({
          adapterId: editingAdapter.id,
          data: {
            name: data.name,
            description: data.description,
            adapter: {
              type: data.type,
              config: data.config,
            },
          },
        })
        toast.success('Adapter updated successfully')
      }
      handleDialogClose()
    } catch (error) {
      toast.error(dialogMode === 'create' ? 'Failed to create adapter' : 'Failed to update adapter', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!deleteConfirmId) return
    try {
      await deleteAdapter.mutateAsync({ adapterId: deleteConfirmId })
      setDeleteConfirmId(null)
      toast.success('Adapter deleted successfully')
    } catch (error) {
      toast.error('Failed to delete adapter', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return (
    <div>
      {/* Header */}
      <h2 className="text-2xl font-bold text-white mb-6">{t('adapters.title')}</h2>

      {/* Tabs + Add Button 在同一行 */}
      <div className="flex items-center justify-between mb-6 border-b border-white/10">
        <Tabs.Root value={activeTab} onValueChange={(v) => setActiveTab(v as AdapterType)}>
          <Tabs.List className="flex items-center gap-1">
            <Tabs.Trigger
              value="anthropic-api"
              className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 transition-colors"
            >
              Anthropic API
            </Tabs.Trigger>
            <Tabs.Trigger
              value="openai-api"
              className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 transition-colors"
            >
              OpenAI API
            </Tabs.Trigger>
            <Tabs.Trigger
              value="claude-code-cli"
              className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 transition-colors"
            >
              Claude Code CLI
            </Tabs.Trigger>
          </Tabs.List>
        </Tabs.Root>

        <Button onClick={handleCreate}>
          <Plus size={16} className="mr-2" />
          {t('adapters.add')}
        </Button>
      </div>

      {/* Adapter Form Dialog */}
      <AdapterFormDialog
        open={dialogMode !== null}
        onOpenChange={(open) => !open && handleDialogClose()}
        mode={dialogMode || 'create'}
        initialData={editingAdapter ? {
          name: editingAdapter.name,
          description: editingAdapter.description || '',
          type: editingAdapter.type,
          scope: editingAdapter.scope,
          config: { ...editingAdapter.config },
        } : undefined}
        onSubmit={handleSubmit}
        isSubmitting={createAdapter.isPending || updateAdapter.isPending}
      />

      {/* Adapter Cards - 只显示当前 tab */}
      <div className="space-y-2">
        {filteredAdapters.length > 0 ? (
          filteredAdapters.map(adapter => {
            const isDefault = defaultAdapterId === adapter.id
            const canModify = adapter.scope === 'private' || adapter.owner_id === user?.id

            return (
              <AdapterCard
                key={adapter.id}
                adapter={adapter}
                isDefault={isDefault}
                canModify={canModify}
                onEdit={() => handleEdit(adapter)}
                onDelete={() => setDeleteConfirmId(adapter.id)}
                onSetDefault={() => handleSetDefault(adapter.id)}
                onTestConnection={() => handleTestConnection(adapter.id)}
              />
            )
          })
        ) : (
          <div className="text-center py-8 text-white/60">
            No {activeTab} adapters found. Create one to get started.
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog.Root
        open={!!deleteConfirmId}
        onOpenChange={open => { if (!open) setDeleteConfirmId(null) }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
          <AlertDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-popover border border-border rounded-2xl p-6 shadow-2xl z-50">
            <AlertDialog.Title className="text-lg font-bold mb-2 text-white">
              {t('adapters.deleteConfirm.title')}
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-white/60 mb-6">
              {t('adapters.deleteConfirm.message')}
            </AlertDialog.Description>
            <div className="flex justify-end gap-3">
              <AlertDialog.Cancel asChild>
                <Button variant="outline">Cancel</Button>
              </AlertDialog.Cancel>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteAdapter.isPending}
              >
                {deleteAdapter.isPending ? 'Deleting...' : t('adapters.delete')}
              </Button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  )
}
