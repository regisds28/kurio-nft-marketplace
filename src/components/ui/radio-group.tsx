import * as React from 'react'
import { RadioGroup as RadioPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'

export function RadioGroup({ className, ...props }: React.ComponentProps<typeof RadioPrimitive.Root>) {
  return <RadioPrimitive.Root className={cn('grid gap-3', className)} {...props} />
}

export function RadioGroupItem({ className, ...props }: React.ComponentProps<typeof RadioPrimitive.Item>) {
  return (
    <RadioPrimitive.Item
      className={cn(
        'grid size-[18px] shrink-0 place-items-center rounded-full border border-border-soft bg-surface-dark',
        'data-[state=checked]:border-primary disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <RadioPrimitive.Indicator className="size-2.5 rounded-full bg-primary" />
    </RadioPrimitive.Item>
  )
}
