import { forwardRef } from 'react'

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export const Label = forwardRef<
  HTMLLabelElement,
  LabelProps
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={`
      text-sm font-medium leading-none peer-disabled:cursor-not-allowed
      peer-disabled:opacity-50
      ${className}
    `}
    {...props}
  />
))
Label.displayName = 'Label'