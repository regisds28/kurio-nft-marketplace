import { useSyncExternalStore } from 'react'

export type RealtimeStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline'

let status: RealtimeStatus = 'idle'
const listeners = new Set<() => void>()

export function setRealtimeStatus(next: RealtimeStatus): void {
  if (status === next) return
  status = next
  if (typeof document !== 'undefined') document.documentElement.dataset.realtime = next
  for (const l of listeners) l()
}

export function useRealtimeStatus(): RealtimeStatus {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => status,
  )
}
