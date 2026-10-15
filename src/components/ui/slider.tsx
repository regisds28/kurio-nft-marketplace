import * as React from 'react'
import { Slider as SliderPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'

interface SliderProps extends React.ComponentProps<typeof SliderPrimitive.Root> {
  thumbLabels?: string[]
}

export function Slider({ className, thumbLabels = [], value, defaultValue, ...props }: SliderProps) {
  const count = (value ?? defaultValue ?? [0]).length
  return (
    <SliderPrimitive.Root
      value={value}
      defaultValue={defaultValue}
      className={cn('relative flex w-full touch-none items-center select-none py-2', className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1 w-full grow rounded-full bg-border-soft">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-primary" />
      </SliderPrimitive.Track>
      {Array.from({ length: count }, (_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          aria-label={thumbLabels[i]}
          className="block size-4 rounded-full border-2 border-ink bg-primary shadow transition-transform focus-visible:scale-110"
        />
      ))}
    </SliderPrimitive.Root>
  )
}
