import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './authStore';
import { useVerifyToken } from '@/lib/trpc/hooks/auth.hooks';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, logout } = useAuthStore();
  const location = useLocation();

  const storedToken =
    localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');

  const { isLoading, isError } = useVerifyToken(
    isAuthenticated ? storedToken : null
  );

  useEffect(() => {
    if (isError) {
      logout();
    }
  }, [isError, logout]);

  if (isLoading && storedToken && isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f111a]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
