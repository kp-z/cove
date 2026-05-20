import { forwardRef, TextareaHTMLAttributes, SelectHTMLAttributes, InputHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/utils'

const baseInputClass = 'w-full px-3 py-2 bg-white/10 text-white border border-white/20 rounded-lg focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20 transition-colors duration-150'

export interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(baseInputClass, className)}
        {...props}
      />
    )
  }
)
FormInput.displayName = 'FormInput'

export interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(baseInputClass, className)}
        {...props}
      >
        {children}
      </select>
    )
  }
)
FormSelect.displayName = 'FormSelect'

export interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(baseInputClass, 'resize-none', className)}
        {...props}
      />
    )
  }
)
FormTextarea.displayName = 'FormTextarea'
