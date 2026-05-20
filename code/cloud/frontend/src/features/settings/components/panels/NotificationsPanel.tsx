import { SettingsSection, SettingsItem } from '../common/SettingsItem'

export function NotificationsPanel() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Notifications</h2>

      <SettingsSection
        title="Push Notifications"
        description="Manage how you receive notifications"
      >
        <SettingsItem
          label="Enable Notifications"
          description="Receive push notifications for important updates"
        >
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" defaultChecked />
            <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </SettingsItem>

        <SettingsItem
          label="Task Updates"
          description="Get notified when tasks are assigned or updated"
        >
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" defaultChecked />
            <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </SettingsItem>

        <SettingsItem
          label="Message Mentions"
          description="Get notified when someone mentions you"
        >
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" defaultChecked />
            <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </SettingsItem>
      </SettingsSection>

      <SettingsSection
        title="Email Notifications"
        description="Configure email notification preferences"
      >
        <SettingsItem
          label="Daily Digest"
          description="Receive a daily summary of activity"
        >
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" />
            <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </SettingsItem>
      </SettingsSection>
    </div>
  )
}
