import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Upload, Check } from 'lucide-react';
import { SettingsSection, SettingsItem } from '../common/SettingsItem';
import { useCurrentUser } from '@/core/auth/useCurrentUser';
import { useUpdateUser } from '@/lib/trpc/hooks/user.hooks';
import { useAuthStore } from '@/core/auth/authStore';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';

export function AccountPanel() {
  const { t, i18n } = useTranslation('settings');
  const { user } = useCurrentUser();
  const updateUser = useUpdateUser();
  const { updateUser: updateAuthUser } = useAuthStore();

  // 表单状态 - 使用 lazy initialization
  const [displayName, setDisplayName] = useState(() => user?.displayName || '');
  const [email, setEmail] = useState(() => user?.email || '');
  const [language, setLanguage] = useState(i18n.language);

  // 检测是否有修改
  const hasChanges = useMemo(() => {
    return (
      displayName !== user?.displayName ||
      email !== user?.email ||
      language !== i18n.language
    );
  }, [displayName, email, language, user, i18n.language]);

  // 保存个人资料
  function handleSaveProfile() {
    if (!user) return;

    updateUser.mutate(
      {
        userId: user.id,
        data: {
          displayName,
          email,
        },
      },
      {
        onSuccess: () => {
          // 更新本地 auth store
          updateAuthUser({ displayName, email });
        },
      }
    );
  }

  // 重置表单
  function handleReset() {
    if (user) {
      setDisplayName(user.displayName);
      setEmail(user.email);
    }
  }

  // 切换语言
  function handleLanguageChange(newLanguage: string) {
    setLanguage(newLanguage);
    i18n.changeLanguage(newLanguage);
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-white/60" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">{t('account.title')}</h2>

      {/* 个人资料 */}
      <SettingsSection
        title={t('account.profile.title')}
        description={t('account.profile.description')}
      >
        <SettingsItem
          label={t('account.profile.username')}
          description={t('account.profile.usernameDescription')}
        >
          <Input
            type="text"
            value={user.username}
            disabled
            className="w-64 bg-white/5 cursor-not-allowed"
          />
        </SettingsItem>

        <SettingsItem
          label={t('account.profile.displayName')}
          description={t('account.profile.displayNameDescription')}
        >
          <Input
            type="text"
            placeholder={t('account.profile.displayNamePlaceholder')}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-64"
          />
        </SettingsItem>

        <SettingsItem
          label={t('account.profile.email')}
          description={t('account.profile.emailDescription')}
        >
          <Input
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-64"
          />
        </SettingsItem>

        <SettingsItem
          label={t('account.profile.avatar')}
          description={t('account.profile.avatarDescription')}
        >
          <div className="flex items-center gap-4">
            {user.avatar && (
              <img
                src={user.avatar}
                alt={user.displayName}
                className="w-16 h-16 rounded-full object-cover"
              />
            )}
            <Button variant="outline" size="sm" disabled>
              <Upload className="w-4 h-4 mr-2" />
              {t('account.profile.uploadAvatar')}
            </Button>
          </div>
        </SettingsItem>

        {hasChanges && (
          <div className="flex items-center gap-3 pt-4">
            <Button
              onClick={handleSaveProfile}
              disabled={updateUser.isPending}
              size="sm"
            >
              {updateUser.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('account.saving')}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  {t('account.saveChanges')}
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
            >
              {t('account.cancel')}
            </Button>
          </div>
        )}
      </SettingsSection>

      {/* 用户偏好 */}
      <SettingsSection
        title={t('account.preferences.title')}
        description={t('account.preferences.description')}
      >
        <SettingsItem
          label={t('account.preferences.language')}
          description={t('account.preferences.languageDescription')}
        >
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="zh">中文</SelectItem>
            </SelectContent>
          </Select>
        </SettingsItem>

        <SettingsItem
          label={t('account.preferences.role')}
          description={t('account.preferences.roleDescription')}
        >
          <div className="px-3 py-2 rounded-lg bg-white/5 text-white/60 border border-white/10 w-64 capitalize">
            {user.role}
          </div>
        </SettingsItem>
      </SettingsSection>
    </div>
  );
}
