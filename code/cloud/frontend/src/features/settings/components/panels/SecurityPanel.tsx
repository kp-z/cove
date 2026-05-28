import { SettingsCard } from '../common/SettingsCard';
import { SettingsRow } from '../common/SettingsControls';
import { Button } from '@/shared/components/ui/button';

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
          <Button onClick={() => {}} variant="settings-default">
            Change Password
          </Button>
        </SettingsRow>

        <SettingsRow
          label="Two-Factor Authentication"
          description="Add an extra layer of security to your account"
        >
          <Button onClick={() => {}} variant="primary">
            Enable 2FA
          </Button>
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
          <Button onClick={() => {}} variant="settings-default">
            View Sessions
          </Button>
        </SettingsRow>

        <SettingsRow
          label="Sign Out All Devices"
          description="Sign out from all devices except this one"
        >
          <Button onClick={() => {}} variant="danger">
            Sign Out All
          </Button>
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
          <Button onClick={() => {}} variant="settings-default">
            Request Data
          </Button>
        </SettingsRow>

        <SettingsRow
          label="Delete Account"
          description="Permanently delete your account and all data"
        >
          <Button onClick={() => {}} variant="danger">
            Delete Account
          </Button>
        </SettingsRow>
      </SettingsCard>
    </div>
  );
}
