import * as React from 'react'
import { Slot } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-bold transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 [&_svg]:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-primary text-ink hover:bg-accent',
        outline: 'border border-primary text-accent font-medium hover:bg-primary/15',
        secondary: 'bg-surface-dark text-foreground border border-border-soft hover:bg-border',
        ghost: 'text-foreground hover:bg-surface-card',
        danger: 'border border-danger text-danger font-medium hover:bg-danger-bg',
        link: 'text-accent underline-offset-4 hover:underline font-medium p-0 h-auto',
      },
      size: {
        default: 'h-10 px-4',
        sm: 'h-[35px] px-3 text-[15px]',
        lg: 'h-11 px-6',
        icon: 'size-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps extends React.ComponentProps<'button'>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export function Button({ className, variant, size, asChild = false, type, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...(asChild ? {} : { type: type ?? 'button' })}
      {...props}
    />
  )
}

export { buttonVariants }
