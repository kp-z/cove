import { useState, useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, Loader2, Mail, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TRPCClientError } from '@trpc/client';
import { branding } from '@/core/config';
import { useAuthStore } from '@/core/auth/authStore';
import { useRegister } from '@/lib/trpc/hooks/auth.hooks';
import { trpc } from '@/lib/trpc';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import { LoginBackground } from '@/shared/components/ui/animations';
import { GlassCard, GlassCardVariants } from '@/shared/components/ui/cards/GlassCard';
import { LoginFlowOrchestrator } from './LoginFlowOrchestrator';
import { BackendStatusIndicator } from './BackendStatusIndicator';
import { useBackendHealth } from '@/core/hooks/useBackendHealth';
import { useRealmStore } from '@/core/stores/realmStore';
import { logger } from '@/lib/logger';

const log = logger.scope('LoginPage');

const REMEMBERED_USERNAME_KEY = 'cove_remembered_username';

// 复制 useLoginFlow 中的 determineDestination 逻辑
function determineDestination(context: any): { path: string; realmId?: string } {
  if (!context) {
    return { path: '/' };
  }

  // 首次登录 -> 欢迎向导
  if (context.isFirstLogin) {
    return { path: '/welcome' };
  }

  // 有上次访问的 Realm 且 device online -> 直接进入
  const lastRealmId = context.preferences?.lastAccessedRealmId;
  if (lastRealmId) {
    const realm = context.realms.find((r: any) => r.realmId === lastRealmId);
    if (realm && realm.status === 'active' && realm.deviceStatus === 'online') {
      return { path: '/', realmId: lastRealmId };
    }
  }

  // 其他情况 -> Realm 选择器
  return { path: '/select-realm' };
}

export default function LoginPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, rememberMe: storedRememberMe, currentRealmId } = useAuthStore();
  const { setRealms } = useRealmStore();
  const backendStatus = useBackendHealth();

  // 视图模式：'login' 或 'register'
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // 登录流程状态
  const [showOrchestrator, setShowOrchestrator] = useState(false);
  const [userContext, setUserContext] = useState<any>(null);
  const [isCheckingRealm, setIsCheckingRealm] = useState(false);

  // 统一表单状态
  const [username, setUsername] = useState(() => {
    return localStorage.getItem(REMEMBERED_USERNAME_KEY) || '';
  });
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMeLocal] = useState(() => {
    const rememberedUsername = localStorage.getItem(REMEMBERED_USERNAME_KEY);
    return rememberedUsername ? true : storedRememberMe;
  });
  const [error, setError] = useState('');

  const loginMutation = trpc.auth.login.useMutation();
  const registerMutation = useRegister();
  const utils = trpc.useUtils();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  // 刷新页面时检查是否需要显示 RealmSelector
  useEffect(() => {
    async function checkRealmSelection() {
      // 只在已认证但未选择 realm 且未显示 orchestrator 时执行
      if (isAuthenticated && !currentRealmId && !showOrchestrator && !isCheckingRealm) {
        setIsCheckingRealm(true);
        try {
          // 获取 realm 列表
          const realmListData = await utils.realm.list.fetch();

          if (realmListData && realmListData.realms && realmListData.realms.length > 0) {
            // 规范化 realm 数据
            const normalizedRealms = realmListData.realms.map((realm: any) => ({
              realmId: realm.realm_id,
              name: realm.name,
              displayName: realm.display_name,
              description: realm.description,
              logoUrl: realm.logo_url,
              status: realm.status,
              deviceStatus: realm.deviceStatus,
              isDefault: realm.isDefault,
              lastAccessedAt: realm.last_accessed_at,
              ownerId: realm.owner_id,
            }));

            // 显示 RealmSelector
            setRealms(normalizedRealms);
            setUserContext({
              isFirstLogin: false,
              realms: normalizedRealms,
              preferences: {},
            });
            setShowOrchestrator(true);
          }
        } catch (error) {
          log.error('Failed to fetch realm list on refresh', error);
        } finally {
          setIsCheckingRealm(false);
        }
      }
    }

    checkRealmSelection();
  }, [isAuthenticated, currentRealmId, showOrchestrator, isCheckingRealm, utils, setRealms]);

  // 只有在已认证且已选择 realm 时才重定向
  if (isAuthenticated && currentRealmId && !showOrchestrator) {
    return <Navigate to={from} replace />;
  }

  // 加载中状态
  if (isCheckingRealm) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f111a]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // 如果需要显示流程协调器
  if (showOrchestrator && userContext) {
    return <LoginFlowOrchestrator context={userContext} />;
  }

  // 切换模式时清空错误和密码
  function toggleMode() {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
    setPassword('');
    setConfirmPassword('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (mode === 'login') {
      // 登录逻辑
      useAuthStore.setState({ rememberMe });

      if (rememberMe) {
        localStorage.setItem(REMEMBERED_USERNAME_KEY, username);
      } else {
        localStorage.removeItem(REMEMBERED_USERNAME_KEY);
      }

      loginMutation.mutate(
        { username, password, rememberMe },
        {
          onSuccess: async (data) => {
            // 清除之前的 realm 缓存（登录是新会话的开始）
            localStorage.removeItem('current_realm_id');
            sessionStorage.removeItem('current_realm_id');

            // 立即设置 showOrchestrator 为 true，防止自动重定向
            setShowOrchestrator(true);

            // 手动调用 authStore.login 来设置认证状态（不传 realmId）
            const { login: authLogin } = useAuthStore.getState();
            authLogin(data.user.user_id, data.token, rememberMe); // 不传 defaultRealmId

            // 等待一小段时间确保 token 被设置到 storage
            await new Promise(resolve => setTimeout(resolve, 100));

            // 获取完整的 Realm 列表（包含 deviceStatus, isDefault, logoUrl）
            try {
              const realmListData = await utils.realm.list.fetch();

              if (realmListData && realmListData.realms && realmListData.realms.length > 0) {

                // 规范化 realm 数据：snake_case → camelCase
                const normalizedRealms = realmListData.realms.map((realm: any) => ({
                  realmId: realm.realm_id,
                  name: realm.name,
                  displayName: realm.display_name,
                  description: realm.description,
                  logoUrl: realm.logo_url,
                  status: realm.status,
                  deviceStatus: realm.deviceStatus,
                  isDefault: realm.isDefault,
                  lastAccessedAt: realm.last_accessed_at,
                  ownerId: realm.owner_id,
                }));

                // 存储 Realm 信息
                setRealms(normalizedRealms);

                // 构建 user context
                const userContext = {
                  isFirstLogin: data.context?.isFirstLogin || false,
                  realms: normalizedRealms,
                  preferences: data.context?.preferences || {},
                };

                // 决定导航目标
                const destination = determineDestination(userContext);

                if (destination.realmId) {
                  // 自动进入 realm：设置 currentRealmId 并导航
                  log.debug('Auto-entering realm', { realmId: destination.realmId });
                  const { setCurrentRealmId } = useAuthStore.getState();
                  setCurrentRealmId(destination.realmId);
                  setShowOrchestrator(false);
                  navigate(destination.path, { replace: true });
                } else if (destination.path === '/select-realm') {
                  // 显示 realm 选择器
                  setUserContext(userContext);
                  // showOrchestrator 已经在前面设置为 true
                } else {
                  // 其他路径（welcome 等）
                  setUserContext(userContext);
                  // showOrchestrator 已经在前面设置为 true
                }
              } else {
                setShowOrchestrator(false);
                navigate(from, { replace: true });
              }
            } catch (error) {
              log.error('Failed to fetch realm list', error);
              // 回退到旧流程
              setShowOrchestrator(false);
              navigate(from, { replace: true });
            }
          },
          onError: (err) => {
            if (err instanceof TRPCClientError) {
              const code = err.data?.code;
              if (code === 'UNAUTHORIZED') {
                setError(t('auth.invalidCredentials'));
              } else if (code === 'FORBIDDEN') {
                setError(t('auth.accountDisabled'));
              } else {
                setError(t('auth.unknownError'));
              }
            } else {
              setError(t('auth.unknownError'));
            }
          },
        }
      );
    } else {
      // 注册逻辑
      if (password !== confirmPassword) {
        setError(t('auth.passwordMismatch'));
        return;
      }

      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        setError(t('auth.invalidUsernameFormat'));
        return;
      }

      registerMutation.mutate(
        {
          username,
          email,
          displayName,
          password,
        },
        {
          onSuccess: () => {
            navigate(from, { replace: true });
          },
          onError: (err) => {
            if (err instanceof TRPCClientError) {
              const message = err.message;
              if (message.includes('already exists') || message.includes('duplicate')) {
                setError(t('auth.usernameExists'));
              } else if (message.includes('email')) {
                setError(t('auth.emailExists'));
              } else {
                setError(message || t('auth.registrationFailed'));
              }
            } else {
              setError(t('auth.registrationFailed'));
            }
          },
        }
      );
    }
  }

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  // 根据后端状态生成副标题
  const getSubtitle = () => {
    if (mode === 'register') {
      return t('auth.createAccount');
    }

    // 登录模式下根据后端状态显示不同提示
    switch (backendStatus) {
      case 'online':
        return t('welcome.subtitle'); // "Sign in to continue"
      case 'offline':
        return 'Backend is offline, please start the server';
      case 'checking':
        return 'Checking backend status...';
      default:
        return t('welcome.subtitle');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-950">
      <LoginBackground />

      <div className="relative z-10 flex min-h-screen items-center justify-center md:justify-end p-4 md:pr-20">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-sm md:max-w-md"
        >
          <GlassCard {...GlassCardVariants.hero} className="rounded-2xl">
            <div>
              {/* Header */}
              <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
                <img
                  src={branding.logo.svg}
                  alt={branding.logo.alt}
                  className="w-12 h-12 md:w-16 md:h-16 flex-shrink-0"
                />
                <div className="flex-1">
                  <h1 className="text-xl md:text-2xl font-bold mb-1">{branding.app.slogan}</h1>
                  <div className="flex items-center gap-2">
                    <p className="text-muted-foreground text-xs md:text-sm">
                      {getSubtitle()}
                    </p>
                    <BackendStatusIndicator />
                  </div>
                </div>
              </div>

              {/* Form */}
              <form className="space-y-3 md:space-y-4" onSubmit={handleSubmit}>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400"
                  >
                    {error}
                  </motion.div>
                )}

                <AnimatePresence mode="wait">
                  <motion.div
                    key={mode}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3"
                  >
                    {/* Username */}
                    <div className="space-y-1.5">
                      <Label htmlFor="username" className="text-sm">{t('auth.username')}</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="username"
                          name="username"
                          type="text"
                          placeholder={t('auth.usernamePlaceholder')}
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="pl-10"
                          autoComplete="username"
                          minLength={2}
                          maxLength={20}
                          pattern={mode === 'register' ? '[a-zA-Z0-9_]+' : undefined}
                          required
                        />
                      </div>
                      {mode === 'register' && (
                        <p className="text-xs text-muted-foreground">
                          {t('auth.usernameRequirements')}
                        </p>
                      )}
                    </div>

                    {/* Email (注册时显示) */}
                    {mode === 'register' && (
                      <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-sm">{t('auth.email')}</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder={t('auth.emailPlaceholder')}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-10"
                            autoComplete="email"
                            required
                          />
                        </div>
                      </div>
                    )}

                    {/* Display Name (注册时显示) */}
                    {mode === 'register' && (
                      <div className="space-y-1.5">
                        <Label htmlFor="displayName" className="text-sm">{t('auth.displayName')}</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="displayName"
                            name="displayName"
                            type="text"
                            placeholder={t('auth.displayNamePlaceholder')}
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="pl-10"
                            autoComplete="name"
                            required
                          />
                        </div>
                      </div>
                    )}

                    {/* Password */}
                    <div className="space-y-1.5">
                      <Label htmlFor="password" className="text-sm">{t('auth.password')}</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          placeholder={t('auth.passwordPlaceholder')}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10 pr-10"
                          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                          minLength={6}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          tabIndex={-1}
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {mode === 'register' && (
                        <p className="text-xs text-muted-foreground">
                          {t('auth.passwordRequirements')}
                        </p>
                      )}
                    </div>

                    {/* Confirm Password (注册时显示) */}
                    {mode === 'register' && (
                      <div className="space-y-1.5">
                        <Label htmlFor="confirmPassword" className="text-sm">{t('auth.confirmPassword')}</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="confirmPassword"
                            name="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder={t('auth.confirmPasswordPlaceholder')}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="pl-10 pr-10"
                            autoComplete="new-password"
                            minLength={6}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            tabIndex={-1}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Remember Me (登录时显示) */}
                    {mode === 'login' && (
                      <div className="flex items-center gap-2 pt-1">
                        <Switch
                          id="remember"
                          checked={rememberMe}
                          onCheckedChange={setRememberMeLocal}
                        />
                        <Label htmlFor="remember" className="text-sm">
                          {t('auth.rememberMe')}
                        </Label>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Submit Button */}
                <Button type="submit" className="w-full mt-6" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      {mode === 'login' ? t('auth.signingIn') : t('auth.signingUp')}
                    </>
                  ) : (
                    mode === 'login' ? t('auth.signIn') : t('auth.signUp')
                  )}
                </Button>

                {/* Toggle Mode Button */}
                <div className="text-center pt-4">
                  <button
                    type="button"
                    onClick={toggleMode}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {mode === 'login' ? t('auth.noAccount') : t('auth.hasAccount')}
                  </button>
                </div>
              </form>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}
