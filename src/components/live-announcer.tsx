import { useSyncExternalStore } from 'react'

interface Announcement {
  id: number
  message: string
  politeness: 'polite' | 'assertive'
}

let current: Announcement = { id: 0, message: '', politeness: 'polite' }
const listeners = new Set<() => void>()

export function announce(message: string, politeness: 'polite' | 'assertive' = 'polite'): void {
  current = { id: current.id + 1, message, politeness }
  for (const l of listeners) l()
}

const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function LiveAnnouncer() {
  const a = useSyncExternalStore(subscribe, () => current)
  return (
    <>
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only" data-testid="live-polite">
        {a.politeness === 'polite' ? a.message : ''}
      </div>
      <div role="alert" aria-live="assertive" aria-atomic="true" className="sr-only" data-testid="live-assertive">
        {a.politeness === 'assertive' ? a.message : ''}
      </div>
    </>
  )
}
