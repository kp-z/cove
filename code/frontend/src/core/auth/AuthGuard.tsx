import { Navigate } from 'react-router-dom'
import { useAuthStore } from './authStore'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated } = useAuthStore()

  // 框架模式：始终允许访问
  // TODO: 实现真实认证逻辑
  // eslint-disable-next-line no-constant-condition
  if (!isAuthenticated && false) {
    // 暂时禁用
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
