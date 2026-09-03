import { forwardRef } from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  asChild?: boolean
}

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonProps
>(({ className, variant = 'default', size = 'default', asChild = false, ...props }, ref) => {
  // 变体样式
  const variantStyles = {
    default: 'bg-primary-600 text-primary-foreground hover:bg-primary-700',
    destructive:
      'bg-destructive text-destructive-foreground hover:bg-destructive/80',
    outline:
      'border border-input hover:bg-accent hover:text-accent-foreground',
    secondary:
      'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    link: 'text-primary-underline-offset-4 hover:primary-underline',
  }

  // 大小样式
  const sizeStyles = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 px-3 rounded-md',
    lg: 'h-11 px-8 rounded-md',
    icon: 'h-10 w-10',
  }

  const Comp = asChild ? 'span' : 'button'

  return (
    <Comp
      ref={ref}
      className={`
        inline-flex items-center justify-center rounded-md text-sm font-medium
        transition-colors focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none
        disabled:opacity-50
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      {...props}
    />
  )
})
Button.displayName = 'Button'