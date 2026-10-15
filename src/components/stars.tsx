import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Stars({ value, className, size = 15 }: { value: number; className?: string; size?: number }) {
  const rounded = Math.round(value)
  return (
    <span role="img" aria-label={`Nota ${value.toFixed(1).replace('.', ',')} de 5`} className={cn('inline-flex gap-1', className)}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} width={size} height={size} aria-hidden="true" className={i < rounded ? 'text-accent' : 'text-border-soft'} fill="currentColor" strokeWidth={0} />
      ))}
    </span>
  )
}
