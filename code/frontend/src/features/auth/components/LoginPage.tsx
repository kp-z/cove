import { motion } from 'framer-motion'
import { Mail, Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { branding } from '@/core/config'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Switch } from '@/shared/components/ui/switch'
import { AnimatedBorder, LoginHeroThree } from '@/shared/components/ui/animations'

export default function LoginPage() {
  const { t } = useTranslation('common')

  return (
    <div className="fixed inset-0 bg-gray-950">
      {/* Three.js 动画背景 */}
      <div className="pointer-events-none absolute inset-0">
        <LoginHeroThree />
      </div>

      {/* 登录表单容器 */}
      <div className="relative z-10 flex min-h-screen items-center justify-end p-4 pr-20">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Glass Card Container */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
            <AnimatedBorder />

            <div className="p-8">
              {/* Logo & Title */}
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

              {/* Login Form */}
              <motion.form
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="space-y-4"
                onSubmit={(e) => e.preventDefault()}
              >
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-10"
                      disabled
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      disabled
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch id="remember" disabled />
                    <Label htmlFor="remember" className="text-sm">
                      Remember me
                    </Label>
                  </div>
                  <a
                    href="#"
                    className="text-sm text-primary hover:underline"
                    onClick={(e) => e.preventDefault()}
                  >
                    Forgot password?
                  </a>
                </div>

                <Button type="submit" className="w-full" disabled>
                  Sign In
                </Button>
              </motion.form>

              {/* Footer */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-center mt-6 text-sm text-muted-foreground"
              >
                Don't have an account?{' '}
                <a
                  href="#"
                  className="text-primary hover:underline"
                  onClick={(e) => e.preventDefault()}
                >
                  Sign up
                </a>
              </motion.div>
            </div>
          </div>

          {/* Bottom Hint */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-center mt-4 text-xs text-muted-foreground"
          >
            Framework only - No authentication implemented
          </motion.p>
        </motion.div>
      </div>
    </div>
  )
}
