import { useState } from 'react'
import { SettingsCard } from '../common/SettingsCard'
import { SettingsRow, SettingsToggle } from '../common/SettingsControls'

export function NotificationsPanel() {
  const [pushEnabled, setPushEnabled] = useState(true)
  const [taskUpdates, setTaskUpdates] = useState(true)
  const [mentions, setMentions] = useState(true)
  const [dailyDigest, setDailyDigest] = useState(false)

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Notifications</h2>

      <SettingsCard
        title="Push Notifications"
        description="Manage how you receive notifications"
      >
        <SettingsRow
          label="Enable Notifications"
          description="Receive push notifications for important updates"
        >
          <SettingsToggle
            checked={pushEnabled}
            onChange={setPushEnabled}
          />
        </SettingsRow>

        <SettingsRow
          label="Task Updates"
          description="Get notified when tasks are assigned or updated"
        >
          <SettingsToggle
            checked={taskUpdates}
            onChange={setTaskUpdates}
          />
        </SettingsRow>

        <SettingsRow
          label="Message Mentions"
          description="Get notified when someone mentions you"
        >
          <SettingsToggle
            checked={mentions}
            onChange={setMentions}
          />
        </SettingsRow>
      </SettingsCard>

      <SettingsCard
        title="Email Notifications"
        description="Configure email notification preferences"
      >
        <SettingsRow
          label="Daily Digest"
          description="Receive a daily summary of activity"
        >
          <SettingsToggle
            checked={dailyDigest}
            onChange={setDailyDigest}
          />
        </SettingsRow>
      </SettingsCard>
    </div>
  )
}
