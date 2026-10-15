import * as React from 'react'
import { DropdownMenu as MenuPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'

export const DropdownMenu = MenuPrimitive.Root
export const DropdownMenuTrigger = MenuPrimitive.Trigger

export function DropdownMenuContent({ className, sideOffset = 8, ...props }: React.ComponentProps<typeof MenuPrimitive.Content>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Content
        sideOffset={sideOffset}
        align="end"
        className={cn(
          'z-[60] min-w-[200px] rounded-md border border-border-soft bg-surface-card p-1 shadow-lg',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0',
          className,
        )}
        {...props}
      />
    </MenuPrimitive.Portal>
  )
}

export function DropdownMenuItem({ className, ...props }: React.ComponentProps<typeof MenuPrimitive.Item>) {
  return (
    <MenuPrimitive.Item
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none',
        'data-[highlighted]:bg-surface-dark data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export const DropdownMenuLabel = ({ className, ...props }: React.ComponentProps<typeof MenuPrimitive.Label>) => (
  <MenuPrimitive.Label className={cn('px-3 py-2 text-xs text-muted', className)} {...props} />
)
export const DropdownMenuSeparator = ({ className, ...props }: React.ComponentProps<typeof MenuPrimitive.Separator>) => (
  <MenuPrimitive.Separator className={cn('my-1 h-px bg-border', className)} {...props} />
)
