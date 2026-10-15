import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <span role={label ? 'status' : undefined} aria-label={label} className="inline-flex">
      <Loader2 aria-hidden="true" className={cn('size-4 animate-spin motion-reduce:animate-none', className)} />
    </span>
  )
}
