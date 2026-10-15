type Listener = (reason: 'session_expired' | 'session_invalid') => void

const listeners = new Set<Listener>()

export const sessionBus = {
  onInvalid(listener: Listener): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  emitInvalid(reason: 'session_expired' | 'session_invalid'): void {
    for (const l of [...listeners]) l(reason)
  },
}
