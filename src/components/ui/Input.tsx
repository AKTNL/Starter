import { forwardRef } from 'react'

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg'
}

export const Input = forwardRef<
  HTMLInputElement,
  InputProps
>(({ className, variant = 'default', size = 'default', ...props }, ref) => {
  // 变体样式
  const variantStyles = {
    default: 'bg-background text-foreground',
    destructive:
      'bg-destructive/20 text-destructive border-destructive/40 placeholder:text-destructive/40',
    outline: 'bg-background text-foreground border',
    secondary:
      'bg-secondary/20 text-secondary-foreground border-secondary/40 placeholder:text-secondary/40',
    ghost: 'bg-background text-foreground',
    link: 'bg-background text-foreground underline-offset-4 hover:underline',
  }

  // 大小样式
  const sizeStyles = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 px-3',
    lg: 'h-11 px-8',
  }

  return (
    <input
      ref={ref}
      className={`
        flex h-10 w-full rounded-md border border-input bg-background
        px-3 py-2 text-sm ring-offset-background file:border-0
        file:bg-transparent file:text-sm file:focus:outline-none
        placeholder:text-muted-foreground
        focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-ring focus-visible:ring-offset-2
        disabled:cursor-not-allowed disabled:opacity-50
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      {...props}
    />
  )
})
Input.displayName = 'Input'