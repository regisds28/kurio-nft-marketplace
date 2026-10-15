import { toast } from 'sonner'
import { announce } from '@/components/live-announcer'

export function notAvailable(label: string): void {
  const message = `${label} não faz parte desta versão da demonstração.`
  toast.info(message, { id: `oos-${label}` })
  announce(message)
}
