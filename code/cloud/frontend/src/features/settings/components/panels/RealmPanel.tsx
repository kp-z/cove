import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAuthStore } from '@/core/auth/authStore';
import { useRealm, useRealmList, useUpdateRealm, useCreateRealm, useCurrentRealmRole, useRealmMembers } from '@/lib/trpc/hooks/realm.hooks';
import { trpc } from '@/lib/trpc';
import { SettingsCard } from '../common/SettingsCard';
import {
  RealmSwitcher,
  RealmInfoCard,
  RealmStatsCard,
  RealmMembersCard,
  RealmAdaptersCard,
  RealmEditDialog,
  type RealmUpdateData,
  type RealmStats,
  type RealmMember,
  type RealmAdapter,
} from './RealmPanel/';
import { canManageRealm } from '@/shared/utils/permissions';

export function RealmPanel() {
  const { currentRealmId, setCurrentRealmId, userId } = useAuthStore();
  const { data: currentRealm } = useRealm(currentRealmId || '');
  const { data: realmsData } = useRealmList({ status: 'active' });
  const { data: userRoleData } = useCurrentRealmRole();
  const { data: membersData, isLoading: membersLoading } = useRealmMembers(currentRealmId || '', { enabled: !!currentRealmId });
  const updateRealm = useUpdateRealm();
  const createRealm = useCreateRealm();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const utils = trpc.useUtils();

  const allRealms = realmsData?.realms || [];
  const userRole = userRoleData?.role || null;
  const canEdit = userRole ? canManageRealm(userRole) : false;

  // Transform backend members data to frontend format
  const members: RealmMember[] = (membersData?.members || []).map((m: any) => ({
    userId: m.user_id,
    username: m.username || 'unknown',
    displayName: m.display_name || m.username || 'Unknown User',
    avatar: m.avatar,
    role: m.role,
    status: m.status,
    joinedAt: m.joined_at || new Date().toISOString(),
  }));

  // Mock data for stats and adapters - TODO: Replace with real API when available
  const mockStats: RealmStats = {
    users: members.length,
    agents: 12, // TODO: Get from API
    projects: 3, // TODO: Get from API
    adapters: 2, // TODO: Get from API
  };

  const mockAdapters: RealmAdapter[] = [
    {
      adapterId: '1',
      name: 'Claude Sonnet',
      provider: 'anthropic',
      model: 'claude-sonnet-4-6',
      isDefault: true,
      status: 'active',
    },
    {
      adapterId: '2',
      name: 'GPT-4',
      provider: 'openai',
      model: 'gpt-4',
      isDefault: false,
      status: 'active',
    },
  ];

  const handleRealmSwitch = (realmId: string) => {
    setCurrentRealmId(realmId);
    utils.invalidate();
  };

  const handleSave = (data: RealmUpdateData) => {
    if (!currentRealmId) return;

    updateRealm.mutate(
      {
        realmId: currentRealmId,
        data,
      },
      {
        onSuccess: () => {
          setIsEditDialogOpen(false);
        },
      }
    );
  };

  const handleCreate = (data: RealmUpdateData) => {
    if (!userId) return;

    createRealm.mutate(
      {
        name: data.displayName?.toLowerCase().replace(/\s+/g, '-') || 'new-realm',
        displayName: data.displayName || 'New Realm',
        description: data.description,
        ownerId: userId,
        visibility: data.visibility,
      },
      {
        onSuccess: (newRealm) => {
          setIsCreateDialogOpen(false);
          setCurrentRealmId(newRealm.realm_id);
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Realm Settings</h2>
          <p className="text-sm text-white/60">
            Manage your workspace and switch between realms
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setIsCreateDialogOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-blue-500 text-white hover:bg-blue-600"
          >
            <Plus className="w-4 h-4" />
            Create Realm
          </button>
        )}
      </div>

      {/* Realm Switcher */}
      {allRealms.length > 1 && (
        <SettingsCard title="Switch Realm" description="Select a different workspace">
          <RealmSwitcher
            realms={allRealms}
            currentRealmId={currentRealmId || ''}
            onSwitch={handleRealmSwitch}
          />
        </SettingsCard>
      )}

      {/* Current Realm Info */}
      {currentRealm && (
        <RealmInfoCard
          realm={currentRealm}
          onEdit={canEdit ? () => setIsEditDialogOpen(true) : undefined}
          canEdit={canEdit}
        />
      )}

      {/* Statistics */}
      <RealmStatsCard stats={mockStats} />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Members */}
        <RealmMembersCard
          members={members}
          isLoading={membersLoading}
          canManage={canEdit}
          onAddMember={() => console.log('Add member')}
        />

        {/* Adapters */}
        <RealmAdaptersCard
          adapters={mockAdapters}
          canManage={canEdit}
          onAddAdapter={() => console.log('Add adapter')}
          onSetDefault={(id) => console.log('Set default adapter:', id)}
        />
      </div>

      {/* Edit Dialog */}
      <RealmEditDialog
        realm={currentRealm}
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onSave={handleSave}
        isLoading={updateRealm.isPending}
      />

      {/* Create Dialog */}
      <RealmEditDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSave={handleCreate}
        isLoading={createRealm.isPending}
      />
    </div>
  );
}
