import { AlertTriangle, SearchX } from 'lucide-react'
import type { ReactNode } from 'react'
import { describeError } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function ErrorState({
  error,
  onRetry,
  title = 'Não foi possível carregar',
  className,
  retrying,
}: {
  error?: unknown
  onRetry?: () => void
  title?: string
  className?: string
  retrying?: boolean
}) {
  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center gap-3 rounded-lg border border-border bg-surface-card p-8 text-center', className)}
    >
      <AlertTriangle className="size-8 text-danger" aria-hidden="true" />
      <h2 className="text-base font-bold">{title}</h2>
      {error ? <p className="max-w-md text-sm text-muted">{describeError(error)}</p> : null}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} disabled={retrying}>
          {retrying ? 'Tentando…' : 'Tentar novamente'}
        </Button>
      )}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
  className,
  icon,
}: {
  title: string
  description?: string
  action?: ReactNode
  className?: string
  icon?: ReactNode
}) {
  return (
    <div className={cn('flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-soft p-8 text-center', className)}>
      {icon ?? <SearchX className="size-8 text-secondary" aria-hidden="true" />}
      <h2 className="text-base font-bold">{title}</h2>
      {description ? <p className="max-w-md text-sm text-muted">{description}</p> : null}
      {action}
    </div>
  )
}

export function InlineNotice({
  tone = 'info',
  children,
  className,
  role = 'status',
}: {
  tone?: 'info' | 'warning' | 'error' | 'success'
  children: ReactNode
  className?: string
  role?: 'status' | 'alert'
}) {
  const tones = {
    info: 'border-border-soft bg-surface-dark text-foreground',
    warning: 'border-primary/60 bg-primary/10 text-accent',
    error: 'border-danger/60 bg-danger-bg text-danger',
    success: 'border-success/60 bg-success-bg text-success',
  }
  return (
    <div role={role} className={cn('rounded-md border px-3 py-2 text-sm', tones[tone], className)}>
      {children}
    </div>
  )
}
