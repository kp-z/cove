import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/core/auth/authStore'
import { useRealm, useRealmList, useUpdateRealm, useCurrentRealmRole } from '@/lib/trpc/hooks/realm.hooks'
import { SettingsCard } from '../common/SettingsCard'
import { SettingsRow, SettingsSelect } from '../common/SettingsControls'
import { getAvatarUrl } from '@/shared/utils/avatar'
import { canManageRealm, canInviteMembers, canEditContent } from '@/shared/utils/permissions'

export function RealmPanel() {
  const { t } = useTranslation('settings')
  const { currentRealmId, setCurrentRealmId } = useAuthStore()
  const { data: currentRealm } = useRealm(currentRealmId || '')
  const { data: realmsData } = useRealmList({ status: 'active' })
  const { data: userRole } = useCurrentRealmRole()
  const updateRealm = useUpdateRealm()

  const allRealms = realmsData?.realms || []

  const handleRealmSwitch = (realmId: string) => {
    setCurrentRealmId(realmId)
    window.location.reload()
  }

  const realmOptions = allRealms.map(realm => ({
    value: realm.id,
    label: realm.displayName || realm.display_name || realm.name,
  }))

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Realm Settings</h2>

      <SettingsCard
        title="Current Realm"
        description="Select which realm you want to work in"
      >
        <SettingsRow
          label="Active Realm"
          description="Switch between different realms you have access to"
        >
          <SettingsSelect
            value={currentRealmId || ''}
            onChange={handleRealmSwitch}
            options={realmOptions}
          />
        </SettingsRow>
      </SettingsCard>

      {currentRealm && (
        <SettingsCard
          title="Realm Information"
          description="Details about the current realm"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {currentRealm.logo_url ? (
                <img
                  src={getAvatarUrl(currentRealm.logo_url)}
                  alt={currentRealm.displayName || currentRealm.display_name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-semibold text-xl bg-gradient-to-br from-purple-500 to-pink-600">
                  {(currentRealm.displayName || currentRealm.display_name || 'R').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {currentRealm.displayName || currentRealm.display_name}
                </h3>
                {currentRealm.description && (
                  <p className="text-sm text-white/60">{currentRealm.description}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
              <div>
                <p className="text-xs text-white/50 mb-1">Status</p>
                <p className="text-sm text-white capitalize">{currentRealm.status}</p>
              </div>
              <div>
                <p className="text-xs text-white/50 mb-1">Visibility</p>
                <p className="text-sm text-white capitalize">{currentRealm.visibility}</p>
              </div>
              {userRole && (
                <div>
                  <p className="text-xs text-white/50 mb-1">Your Role</p>
                  <p className="text-sm text-white capitalize">{userRole}</p>
                </div>
              )}
            </div>
          </div>
        </SettingsCard>
      )}

      {userRole && (
        <SettingsCard
          title="Your Permissions"
          description="What you can do in this realm based on your role"
        >
          <div className="space-y-3">
            <PermissionItem
              label="Manage Realm Settings"
              granted={canManageRealm(userRole)}
            />
            <PermissionItem
              label="Invite Members"
              granted={canInviteMembers(userRole)}
            />
            <PermissionItem
              label="Edit Content"
              granted={canEditContent(userRole)}
            />
          </div>
        </SettingsCard>
      )}
    </div>
  )
}

interface PermissionItemProps {
  label: string
  granted: boolean
}

function PermissionItem({ label, granted }: PermissionItemProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-white/80">{label}</span>
      <span className={`text-xs font-medium px-2 py-1 rounded ${
        granted
          ? 'bg-green-500/20 text-green-400'
          : 'bg-red-500/20 text-red-400'
      }`}>
        {granted ? 'Granted' : 'Denied'}
      </span>
    </div>
  )
}
