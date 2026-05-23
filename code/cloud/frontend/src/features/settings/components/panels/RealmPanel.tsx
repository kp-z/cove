import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/core/auth/authStore';
import { useRealm, useRealmList, useUpdateRealm, useCurrentRealmRole } from '@/lib/trpc/hooks/realm.hooks';
import { SettingsCard } from '../common/SettingsCard';
import { RealmCard, RealmSwitcher, RealmEditForm, type RealmUpdateData } from './RealmPanel/';
import { canManageRealm } from '@/shared/utils/permissions';

export function RealmPanel() {
  const { t } = useTranslation('settings');
  const { currentRealmId, setCurrentRealmId } = useAuthStore();
  const { data: currentRealm } = useRealm(currentRealmId || '');
  const { data: realmsData } = useRealmList({ status: 'active' });
  const { data: userRole } = useCurrentRealmRole();
  const updateRealm = useUpdateRealm();
  const [isEditing, setIsEditing] = useState(false);

  const allRealms = realmsData?.realms || [];
  const canEdit = userRole ? canManageRealm(userRole) : false;

  const handleRealmSwitch = (realmId: string) => {
    setCurrentRealmId(realmId);
    window.location.reload();
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
          setIsEditing(false);
        },
      }
    );
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Realm Settings</h2>

      <SettingsCard
        title="Current Realm"
        description="Manage your workspace and switch between realms"
      >
        <div className="space-y-4">
          {/* Current Realm Card */}
          {currentRealm && (
            <RealmCard
              realm={currentRealm}
              userRole={userRole}
              onEdit={canEdit ? () => setIsEditing(!isEditing) : undefined}
            />
          )}

          {/* Edit Form (collapsible) */}
          {isEditing && currentRealm && (
            <RealmEditForm
              realm={currentRealm}
              onSave={handleSave}
              onCancel={() => setIsEditing(false)}
              isLoading={updateRealm.isPending}
            />
          )}

          {/* Realm Switcher */}
          {allRealms.length > 1 && (
            <div>
              <h3 className="text-sm font-medium text-white/80 mb-3">Switch Realm</h3>
              <RealmSwitcher
                realms={allRealms}
                currentRealmId={currentRealmId || ''}
                onSwitch={handleRealmSwitch}
              />
            </div>
          )}
        </div>
      </SettingsCard>
    </div>
  );
}
