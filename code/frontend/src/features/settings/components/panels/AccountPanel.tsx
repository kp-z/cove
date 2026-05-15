import { SettingsSection, SettingsItem } from '../common/SettingsItem'

export function AccountPanel() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Account</h2>

      <SettingsSection
        title="Profile"
        description="Manage your account information"
      >
        <SettingsItem
          label="Display Name"
          description="Your name as it appears to others"
        >
          <input
            type="text"
            placeholder="Enter your name"
            className="px-3 py-2 rounded-lg bg-white/10 text-white border border-white/20 focus:outline-none focus:border-white/40 w-64"
          />
        </SettingsItem>

        <SettingsItem
          label="Email"
          description="Your email address"
        >
          <input
            type="email"
            placeholder="email@example.com"
            className="px-3 py-2 rounded-lg bg-white/10 text-white border border-white/20 focus:outline-none focus:border-white/40 w-64"
          />
        </SettingsItem>

        <SettingsItem
          label="Avatar"
          description="Upload a profile picture"
        >
          <button className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors">
            Upload Image
          </button>
        </SettingsItem>
      </SettingsSection>

      <SettingsSection
        title="Preferences"
        description="Customize your account preferences"
      >
        <SettingsItem
          label="Status"
          description="Set your availability status"
        >
          <select className="px-3 py-2 rounded-lg bg-white/10 text-white border border-white/20 focus:outline-none focus:border-white/40">
            <option value="online">Online</option>
            <option value="away">Away</option>
            <option value="busy">Busy</option>
            <option value="offline">Offline</option>
          </select>
        </SettingsItem>
      </SettingsSection>
    </div>
  )
}
