import { useState, useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Lock, Loader2, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TRPCClientError } from '@trpc/client';
import { branding } from '@/core/config';
import { useAuthStore } from '@/core/auth/authStore';
import { useLogin, useRegister } from '@/lib/trpc/hooks/auth.hooks';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { AnimatedBorder, LoginHeroThree } from '@/shared/components/ui/animations';

const REMEMBERED_USERNAME_KEY = 'cove_remembered_username';

export default function LoginPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, rememberMe: storedRememberMe } = useAuthStore();

  // 登录表单状态 - 使用 lazy initialization 从 localStorage 读取记住的用户名
  const [loginUsername, setLoginUsername] = useState(() => {
    return localStorage.getItem(REMEMBERED_USERNAME_KEY) || '';
  });
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMeLocal] = useState(() => {
    const rememberedUsername = localStorage.getItem(REMEMBERED_USERNAME_KEY);
    return rememberedUsername ? true : storedRememberMe;
  });
  const [loginError, setLoginError] = useState('');

  // 注册表单状态
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerDisplayName, setRegisterDisplayName] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [registerError, setRegisterError] = useState('');

  const loginMutation = useLogin();
  const registerMutation = useRegister();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoginError('');

    // 保存 rememberMe 状态到 store
    useAuthStore.setState({ rememberMe });

    // 如果勾选了"记住我"，保存用户名到 localStorage
    if (rememberMe) {
      localStorage.setItem(REMEMBERED_USERNAME_KEY, loginUsername);
    } else {
      localStorage.removeItem(REMEMBERED_USERNAME_KEY);
    }

    loginMutation.mutate(
      { username: loginUsername, password: loginPassword },
      {
        onSuccess: () => {
          navigate(from, { replace: true });
        },
        onError: (err) => {
          if (err instanceof TRPCClientError) {
            const code = err.data?.code;
            if (code === 'UNAUTHORIZED') {
              setLoginError(t('auth.invalidCredentials'));
            } else if (code === 'FORBIDDEN') {
              setLoginError(t('auth.accountDisabled'));
            } else {
              setLoginError(t('auth.unknownError'));
            }
          } else {
            setLoginError(t('auth.unknownError'));
          }
        },
      }
    );
  }

  function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setRegisterError('');

    // 验证密码匹配
    if (registerPassword !== registerConfirmPassword) {
      setRegisterError(t('auth.passwordMismatch'));
      return;
    }

    // 验证用户名格式
    if (!/^[a-zA-Z0-9_]+$/.test(registerUsername)) {
      setRegisterError(t('auth.invalidUsernameFormat'));
      return;
    }

    registerMutation.mutate(
      {
        username: registerUsername,
        email: registerEmail,
        displayName: registerDisplayName,
        password: registerPassword,
      },
      {
        onSuccess: () => {
          navigate(from, { replace: true });
        },
        onError: (err) => {
          if (err instanceof TRPCClientError) {
            const message = err.message;
            if (message.includes('already exists') || message.includes('duplicate')) {
              setRegisterError(t('auth.usernameExists'));
            } else if (message.includes('email')) {
              setRegisterError(t('auth.emailExists'));
            } else {
              setRegisterError(message || t('auth.registrationFailed'));
            }
          } else {
            setRegisterError(t('auth.registrationFailed'));
          }
        },
      }
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-950">
      <div className="pointer-events-none absolute inset-0">
        <LoginHeroThree />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-end p-4 pr-20">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
            <AnimatedBorder />

            <div className="p-8">
              <div className="flex items-center gap-4 mb-8">
                <img
                  src={branding.logo.svg}
                  alt={branding.logo.alt}
                  className="w-16 h-16 flex-shrink-0"
                />
                <div>
                  <h1 className="text-2xl font-bold mb-1">{branding.app.slogan}</h1>
                  <p className="text-muted-foreground text-sm">{t('welcome.subtitle')}</p>
                </div>
              </div>

              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">{t('auth.signIn')}</TabsTrigger>
                  <TabsTrigger value="register">{t('auth.signUp')}</TabsTrigger>
                </TabsList>

                {/* 登录表单 */}
                <TabsContent value="login">
                  <motion.form
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-4"
                    onSubmit={handleLoginSubmit}
                  >
                    {loginError && (
                      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                        {loginError}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="login-username">{t('auth.username')}</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="login-username"
                          type="text"
                          placeholder={t('auth.usernamePlaceholder')}
                          value={loginUsername}
                          onChange={(e) => setLoginUsername(e.target.value)}
                          className="pl-10"
                          autoComplete="username"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-password">{t('auth.password')}</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="login-password"
                          type="password"
                          placeholder={t('auth.passwordPlaceholder')}
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="pl-10"
                          autoComplete="current-password"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        id="remember"
                        checked={rememberMe}
                        onCheckedChange={setRememberMeLocal}
                      />
                      <Label htmlFor="remember" className="text-sm">
                        {t('auth.rememberMe')}
                      </Label>
                    </div>

                    <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                      {loginMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          {t('auth.signingIn')}
                        </>
                      ) : (
                        t('auth.signIn')
                      )}
                    </Button>
                  </motion.form>
                </TabsContent>

                {/* 注册表单 */}
                <TabsContent value="register">
                  <motion.form
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-4"
                    onSubmit={handleRegisterSubmit}
                  >
                    {registerError && (
                      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                        {registerError}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="register-username">{t('auth.username')}</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="register-username"
                          type="text"
                          placeholder={t('auth.usernamePlaceholder')}
                          value={registerUsername}
                          onChange={(e) => setRegisterUsername(e.target.value)}
                          className="pl-10"
                          autoComplete="username"
                          minLength={3}
                          maxLength={20}
                          pattern="[a-zA-Z0-9_]+"
                          title={t('auth.usernameRequirements')}
                          required
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t('auth.usernameRequirements')}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-email">{t('auth.email')}</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="register-email"
                          type="email"
                          placeholder={t('auth.emailPlaceholder')}
                          value={registerEmail}
                          onChange={(e) => setRegisterEmail(e.target.value)}
                          className="pl-10"
                          autoComplete="email"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-displayName">{t('auth.displayName')}</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="register-displayName"
                          type="text"
                          placeholder={t('auth.displayNamePlaceholder')}
                          value={registerDisplayName}
                          onChange={(e) => setRegisterDisplayName(e.target.value)}
                          className="pl-10"
                          autoComplete="name"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-password">{t('auth.password')}</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="register-password"
                          type="password"
                          placeholder={t('auth.passwordPlaceholder')}
                          value={registerPassword}
                          onChange={(e) => setRegisterPassword(e.target.value)}
                          className="pl-10"
                          autoComplete="new-password"
                          minLength={8}
                          required
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t('auth.passwordRequirements')}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-confirmPassword">{t('auth.confirmPassword')}</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="register-confirmPassword"
                          type="password"
                          placeholder={t('auth.confirmPasswordPlaceholder')}
                          value={registerConfirmPassword}
                          onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                          className="pl-10"
                          autoComplete="new-password"
                          minLength={8}
                          required
                        />
                      </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                      {registerMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          {t('auth.signingUp')}
                        </>
                      ) : (
                        t('auth.signUp')
                      )}
                    </Button>
                  </motion.form>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
