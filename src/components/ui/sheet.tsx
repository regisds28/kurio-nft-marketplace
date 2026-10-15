import * as React from 'react'
import { Dialog as SheetPrimitive } from 'radix-ui'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DialogOverlay } from './dialog'

export const Sheet = SheetPrimitive.Root
export const SheetTrigger = SheetPrimitive.Trigger
export const SheetClose = SheetPrimitive.Close
export const SheetTitle = SheetPrimitive.Title
export const SheetDescription = SheetPrimitive.Description

export function SheetContent({
  className,
  children,
  side = 'left',
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & { side?: 'left' | 'right' | 'bottom' }) {
  return (
    <SheetPrimitive.Portal>
      <DialogOverlay />
      <SheetPrimitive.Content
        className={cn(
          'fixed z-50 flex flex-col gap-4 overflow-y-auto bg-surface-card p-5 shadow-[0_0_40px_rgba(10,6,4,0.6)]',
          'data-[state=open]:animate-in data-[state=closed]:animate-out duration-200',
          side === 'left' &&
            'inset-y-0 left-0 h-dvh w-[min(340px,calc(100vw-24px))] border-r border-border-soft data-[state=open]:slide-in-from-left',
          side === 'right' &&
            'inset-y-0 right-0 h-dvh w-[min(340px,calc(100vw-24px))] border-l border-border-soft data-[state=open]:slide-in-from-right',
          side === 'bottom' &&
            'inset-x-0 bottom-0 max-h-[85dvh] rounded-t-lg border-t border-border-soft data-[state=open]:slide-in-from-bottom',
          className,
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close
          aria-label="Fechar"
          className="absolute top-3 right-3 rounded-sm p-1.5 text-muted hover:text-foreground"
        >
          <X className="size-5" aria-hidden="true" />
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  )
}
