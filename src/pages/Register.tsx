import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, UserPlus } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import type { FormErrors } from '@/types'

export function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [serverError, setServerError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    if (!username.trim()) {
      newErrors.username = '请输入用户名'
    } else if (username.length < 2) {
      newErrors.username = '用户名至少2个字符'
    }

    if (!email.trim()) {
      newErrors.email = '请输入邮箱'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = '请输入有效的邮箱地址'
    }

    if (!password) {
      newErrors.password = '请输入密码'
    } else if (password.length < 6) {
      newErrors.password = '密码最少6位字符'
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = '请确认密码'
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = '两次输入的密码不一致'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError('')

    if (!validate()) return

    setIsSubmitting(true)
    const result = await register(username, email, password)
    setIsSubmitting(false)

    if (result.success) {
      navigate('/', { replace: true })
    } else {
      setServerError(result.error ?? '注册失败，请重试')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0d12] p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-brand-500 text-2xl font-bold text-white">
            S
          </div>
          <h1 className="text-2xl font-semibold text-white">创建账号</h1>
          <p className="mt-2 text-sm text-white/50">注册以使用管理后台</p>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {serverError && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {serverError}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="username" className="block text-sm font-medium text-white/70">
              用户名
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              autoComplete="username"
              className={cn(
                'w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white',
                'placeholder:text-white/30 focus:border-brand-500/50 focus:outline-none',
                errors.username && 'border-red-500/50',
              )}
            />
            {errors.username && (
              <p className="text-xs text-red-400">{errors.username}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="reg-email" className="block text-sm font-medium text-white/70">
              邮箱
            </label>
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入邮箱"
              autoComplete="email"
              className={cn(
                'w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white',
                'placeholder:text-white/30 focus:border-brand-500/50 focus:outline-none',
                errors.email && 'border-red-500/50',
              )}
            />
            {errors.email && (
              <p className="text-xs text-red-400">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="reg-password" className="block text-sm font-medium text-white/70">
              密码
            </label>
            <div className="relative">
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码（至少6位）"
                autoComplete="new-password"
                className={cn(
                  'w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 pr-10 text-sm text-white',
                  'placeholder:text-white/30 focus:border-brand-500/50 focus:outline-none',
                  errors.password && 'border-red-500/50',
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
                aria-label={showPassword ? '隐藏密码' : '显示密码'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-400">{errors.password}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="confirm-password" className="block text-sm font-medium text-white/70">
              确认密码
            </label>
            <div className="relative">
              <input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入密码"
                autoComplete="new-password"
                className={cn(
                  'w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 pr-10 text-sm text-white',
                  'placeholder:text-white/30 focus:border-brand-500/50 focus:outline-none',
                  errors.confirmPassword && 'border-red-500/50',
                )}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
                aria-label={showConfirmPassword ? '隐藏密码' : '显示密码'}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-red-400">{errors.confirmPassword}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5',
              'text-sm font-medium text-white transition-colors hover:bg-brand-600',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                注册中...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                注册
              </>
            )}
          </button>
        </form>

        {/* 登录链接 */}
        <p className="text-center text-sm text-white/50">
          已有账号？{' '}
          <Link to="/login" className="text-brand-400 hover:text-brand-300">
            立即登录
          </Link>
        </p>
      </div>
    </div>
  )
}