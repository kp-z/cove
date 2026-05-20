import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, Loader2, Mail, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TRPCClientError } from '@trpc/client';
import { branding } from '@/core/config';
import { useAuthStore } from '@/core/auth/authStore';
import { useLogin, useRegister } from '@/lib/trpc/hooks/auth.hooks';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import { LoginBackground } from '@/shared/components/ui/animations';
import { GlassCard, GlassCardVariants } from '@/shared/components/ui/cards/GlassCard';

const REMEMBERED_USERNAME_KEY = 'cove_remembered_username';

export default function LoginPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, rememberMe: storedRememberMe } = useAuthStore();

  // 视图模式：'login' 或 'register'
  const [mode, setMode] = useState<'login' | 'register'>('login');

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

  const loginMutation = useLogin();
  const registerMutation = useRegister();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
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
        { username, password },
        {
          onSuccess: () => {
            navigate(from, { replace: true });
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

  return (
    <div className="fixed inset-0 bg-gray-950">
      <LoginBackground />

      <div className="relative z-10 flex min-h-screen items-center justify-end p-4 pr-20">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          <GlassCard {...GlassCardVariants.hero} className="rounded-2xl">
            <div>
              {/* Header */}
              <div className="flex items-center gap-4 mb-8">
                <img
                  src={branding.logo.svg}
                  alt={branding.logo.alt}
                  className="w-16 h-16 flex-shrink-0"
                />
                <div>
                  <h1 className="text-2xl font-bold mb-1">{branding.app.slogan}</h1>
                  <p className="text-muted-foreground text-sm">
                    {mode === 'login' ? t('welcome.subtitle') : t('auth.createAccount')}
                  </p>
                </div>
              </div>

              {/* Form */}
              <form className="space-y-4" onSubmit={handleSubmit}>
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
                          type="text"
                          placeholder={t('auth.usernamePlaceholder')}
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="pl-10"
                          autoComplete="username"
                          minLength={3}
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
                          type={showPassword ? "text" : "password"}
                          placeholder={t('auth.passwordPlaceholder')}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10 pr-10"
                          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                          minLength={8}
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
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder={t('auth.confirmPasswordPlaceholder')}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="pl-10 pr-10"
                            autoComplete="new-password"
                            minLength={8}
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
