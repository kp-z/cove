import { SettingsSection, SettingsItem } from '../common/SettingsItem'

export function SecurityPanel() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Security</h2>

      <SettingsSection
        title="Authentication"
        description="Manage your login and authentication settings"
      >
        <SettingsItem
          label="Change Password"
          description="Update your account password"
        >
          <button className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors">
            Change Password
          </button>
        </SettingsItem>

        <SettingsItem
          label="Two-Factor Authentication"
          description="Add an extra layer of security to your account"
        >
          <button className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
            Enable 2FA
          </button>
        </SettingsItem>
      </SettingsSection>

      <SettingsSection
        title="Sessions"
        description="Manage your active sessions"
      >
        <SettingsItem
          label="Active Sessions"
          description="View and manage devices where you're logged in"
        >
          <button className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors">
            View Sessions
          </button>
        </SettingsItem>

        <SettingsItem
          label="Sign Out All Devices"
          description="Sign out from all devices except this one"
        >
          <button className="px-4 py-2 rounded-lg bg-red-600/80 text-white hover:bg-red-600 transition-colors">
            Sign Out All
          </button>
        </SettingsItem>
      </SettingsSection>

      <SettingsSection
        title="Data & Privacy"
        description="Control your data and privacy settings"
      >
        <SettingsItem
          label="Download Your Data"
          description="Request a copy of your data"
        >
          <button className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors">
            Request Data
          </button>
        </SettingsItem>

        <SettingsItem
          label="Delete Account"
          description="Permanently delete your account and all data"
        >
          <button className="px-4 py-2 rounded-lg bg-red-600/80 text-white hover:bg-red-600 transition-colors">
            Delete Account
          </button>
        </SettingsItem>
      </SettingsSection>
    </div>
  )
}
