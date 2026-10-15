import { Eye, EyeOff } from 'lucide-react'
import { useId, useState, type ComponentProps, type ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export interface ControlProps {
  id: string
  'aria-invalid'?: true
  'aria-describedby'?: string
}

export function Field({
  label,
  error,
  hint,
  required,
  className,
  labelClassName,
  children,
}: {
  label: string
  error?: string
  hint?: string
  required?: boolean
  className?: string
  labelClassName?: string
  children: (props: ControlProps) => ReactNode
}) {
  const id = useId()
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label htmlFor={id} className={cn('text-[15px] leading-4', labelClassName)}>
        {label}
        {required && <span aria-hidden="true" className="ml-1 text-accent">*</span>}
      </Label>
      {children({ id, ...(error ? { 'aria-invalid': true as const } : {}), ...(describedBy ? { 'aria-describedby': describedBy } : {}) })}
      {hint && !error && <p id={`${id}-hint`} className="text-xs text-secondary">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

export function PasswordInput({ className, ...props }: Omit<ComponentProps<typeof Input>, 'type'>) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} className={cn('pr-11', className)} />
      <button
        type="button"
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={visible}
        onClick={() => setVisible((v) => !v)}
        className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-sm text-secondary hover:text-accent"
      >
        {visible ? <EyeOff className="size-[18px]" aria-hidden="true" /> : <Eye className="size-[18px]" aria-hidden="true" />}
      </button>
    </div>
  )
}
