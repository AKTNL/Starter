import { forwardRef } from 'react'

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'success' | 'warning'
}

export const Alert = forwardRef<
  HTMLDivElement,
  AlertProps
>(({ className, variant = 'default', ...props }, ref) => {
  // 变体样式
  const variantStyles = {
    default: 'bg-background text-foreground',
    destructive:
      'bg-destructive/20 text-destructive border border-destructive/40',
    success: 'bg-success/20 text-success border border-success/40',
    warning: 'bg-warning/20 text-warning border border-warning/40',
  }

  return (
    <div
      ref={ref}
      role="alert"
      className={`
        relative w-full rounded-lg border px-4 py-3 text-sm
        ${variantStyles[variant]}
        ${className}
      `}
      {...props}
    />
  )
})
Alert.displayName = 'Alert'