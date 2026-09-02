import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import type { UserRole } from '@/types'

interface ProtectedRouteProps {
  /** 允许访问的角色列表，为空则所有已登录用户可访问 */
  allowedRoles?: UserRole[]
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  // 加载中显示空白，避免闪烁
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0d12]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-brand-500" />
      </div>
    )
  }

  // 未登录，重定向到登录页
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // 检查角色权限
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}