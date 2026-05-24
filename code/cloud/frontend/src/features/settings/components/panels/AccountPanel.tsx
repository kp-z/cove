import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Check } from 'lucide-react';
import { SettingsCard } from '../common/SettingsCard';
import { useCurrentUser } from '@/core/auth/useCurrentUser';
import { useUpdateUser } from '@/lib/trpc/hooks/user.hooks';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { AvatarEditor } from '@/shared/components/display/Avatar';

export function AccountPanel() {
  const { t, i18n } = useTranslation('settings');
  const { user, isLoading: isLoadingUser } = useCurrentUser();
  const updateUser = useUpdateUser();

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

    updateUser.mutate({
      userId: user.id,
      data: {
        displayName,
        email,
      },
      // No need to manually update authStore - TanStack Query will refetch
    });
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

  if (isLoadingUser || !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-white/60" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">{t('account.title')}</h2>

      {/* 个人资料 - 方案 A 布局 */}
      <SettingsCard
        title={t('account.profile.title')}
        description={t('account.profile.description')}
      >
        <div className="flex gap-8">
          {/* 左侧：头像区域 */}
          <div className="flex-shrink-0">
            <AvatarEditor
              type="user"
              id={user.id}
              name={user.displayName}
              currentAvatar={user.avatar}
              size="xl"
              editable={true}
            />
          </div>

          {/* 右侧：表单区域 */}
          <div className="flex-1 space-y-5">
            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-white font-medium">
                {t('account.profile.displayName')}
              </Label>
              <Input
                id="displayName"
                type="text"
                placeholder={t('account.profile.displayNamePlaceholder')}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
              <p className="text-sm text-white/60">
                {t('account.profile.displayNameDescription')}
              </p>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white font-medium">
                {t('account.profile.email')}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
              <p className="text-sm text-white/60">
                {t('account.profile.emailDescription')}
              </p>
            </div>

            {/* Username (只读) */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-white font-medium">
                {t('account.profile.username')}
              </Label>
              <Input
                id="username"
                type="text"
                value={user.username}
                disabled
                className="bg-white/5 border-white/10 text-white/60 cursor-not-allowed"
              />
              <p className="text-sm text-white/60">
                {t('account.profile.usernameDescription')}
              </p>
            </div>

            {/* Role (徽章显示) */}
            <div className="space-y-2">
              <Label className="text-white font-medium">
                {t('account.preferences.role')}
              </Label>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 text-sm font-medium capitalize">
                  🏷️ {user.role}
                </span>
              </div>
              <p className="text-sm text-white/60">
                {t('account.preferences.roleDescription')}
              </p>
            </div>

            {/* 保存按钮 */}
            {hasChanges && (
              <div className="flex items-center gap-3 pt-4 border-t border-white/10">
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
          </div>
        </div>
      </SettingsCard>

      {/* 用户偏好 - 卡片式语言选择器 */}
      <SettingsCard
        title={t('account.preferences.title')}
        description={t('account.preferences.description')}
      >
        <div className="space-y-2">
          <Label className="text-white font-medium">
            {t('account.preferences.language')}
          </Label>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            {/* English */}
            <button
              onClick={() => handleLanguageChange('en')}
              className={`
                relative p-4 rounded-xl border-2 transition-all
                ${language === 'en'
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <div className="text-white font-medium">English</div>
                  <div className="text-sm text-white/60">EN</div>
                </div>
                {language === 'en' && (
                  <Check className="w-5 h-5 text-blue-400" />
                )}
              </div>
            </button>

            {/* 中文 */}
            <button
              onClick={() => handleLanguageChange('zh')}
              className={`
                relative p-4 rounded-xl border-2 transition-all
                ${language === 'zh'
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <div className="text-white font-medium">中文</div>
                  <div className="text-sm text-white/60">ZH</div>
                </div>
                {language === 'zh' && (
                  <Check className="w-5 h-5 text-blue-400" />
                )}
              </div>
            </button>
          </div>
          <p className="text-sm text-white/60">
            {t('account.preferences.languageDescription')}
          </p>
        </div>
      </SettingsCard>
    </div>
  );
}
