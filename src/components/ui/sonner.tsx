import { Toaster as Sonner, type ToasterProps } from 'sonner'

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      closeButton
      visibleToasts={3}
      toastOptions={{
        classNames: {
          toast: '!bg-surface-card !text-foreground !border !border-border-soft !font-sans',
          description: '!text-muted',
          actionButton: '!bg-primary !text-ink',
        },
      }}
      {...props}
    />
  )
}
