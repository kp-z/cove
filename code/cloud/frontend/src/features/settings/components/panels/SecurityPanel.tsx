import { SettingsCard } from '../common/SettingsCard';
import { SettingsRow, SettingsButton } from '../common/SettingsControls';

export function SecurityPanel() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Security</h2>

      <SettingsCard
        title="Authentication"
        description="Manage your login and authentication settings"
      >
        <SettingsRow
          label="Change Password"
          description="Update your account password"
        >
          <SettingsButton onClick={() => {}}>
            Change Password
          </SettingsButton>
        </SettingsRow>

        <SettingsRow
          label="Two-Factor Authentication"
          description="Add an extra layer of security to your account"
        >
          <SettingsButton onClick={() => {}} variant="primary">
            Enable 2FA
          </SettingsButton>
        </SettingsRow>
      </SettingsCard>

      <SettingsCard
        title="Sessions"
        description="Manage your active sessions"
      >
        <SettingsRow
          label="Active Sessions"
          description="View and manage devices where you're logged in"
        >
          <SettingsButton onClick={() => {}}>
            View Sessions
          </SettingsButton>
        </SettingsRow>

        <SettingsRow
          label="Sign Out All Devices"
          description="Sign out from all devices except this one"
        >
          <SettingsButton onClick={() => {}} variant="danger">
            Sign Out All
          </SettingsButton>
        </SettingsRow>
      </SettingsCard>

      <SettingsCard
        title="Data & Privacy"
        description="Control your data and privacy settings"
      >
        <SettingsRow
          label="Download Your Data"
          description="Request a copy of your data"
        >
          <SettingsButton onClick={() => {}}>
            Request Data
          </SettingsButton>
        </SettingsRow>

        <SettingsRow
          label="Delete Account"
          description="Permanently delete your account and all data"
        >
          <SettingsButton onClick={() => {}} variant="danger">
            Delete Account
          </SettingsButton>
        </SettingsRow>
      </SettingsCard>
    </div>
  );
}
