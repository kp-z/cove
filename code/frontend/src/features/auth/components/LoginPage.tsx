import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Lock, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TRPCClientError } from '@trpc/client';
import { branding } from '@/core/config';
import { useAuthStore } from '@/core/auth/authStore';
import { useLogin } from '@/lib/trpc/hooks/auth.hooks';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import { AnimatedBorder, LoginHeroThree } from '@/shared/components/ui/animations';

export default function LoginPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, rememberMe: storedRememberMe } = useAuthStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMeLocal] = useState(storedRememberMe);
  const [error, setError] = useState('');

  const loginMutation = useLogin();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    useAuthStore.setState({ rememberMe });

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

              <motion.form
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="space-y-4"
                onSubmit={handleSubmit}
              >
                {error && (
                  <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="username">{t('auth.username')}</Label>
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
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">{t('auth.password')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder={t('auth.passwordPlaceholder')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
