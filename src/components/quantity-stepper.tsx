import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  value: number
  min?: number
  max: number
  onChange: (value: number) => void
  label: string
  disabled?: boolean
  className?: string
}

export function QuantityStepper({ value, min = 1, max, onChange, label, disabled, className }: Props) {
  const btn =
    'grid h-[30px] w-5 place-items-center rounded-full bg-primary text-ink shadow-[0_4px_8px_rgba(20,13,10,0.2)] disabled:opacity-40 lg:w-5'
  return (
    <div role="group" aria-label={`Quantidade de ${label}`} className={cn('flex items-center gap-3', className)}>
      <button type="button" className={btn} aria-label={`Diminuir quantidade de ${label}`} disabled={disabled || value <= min} onClick={() => onChange(value - 1)}>
        <Minus className="size-3.5" aria-hidden="true" />
      </button>
      <output aria-live="polite" className="min-w-5 text-center text-xl leading-6 max-lg:text-base" data-testid="cart-qty">
        {value}
      </output>
      <button type="button" className={btn} aria-label={`Aumentar quantidade de ${label}`} disabled={disabled || value >= max} onClick={() => onChange(value + 1)}>
        <Plus className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  )
}
