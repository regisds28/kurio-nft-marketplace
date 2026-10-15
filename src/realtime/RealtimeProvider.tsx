import { useEffect, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'
import { SOCKET_EVENTS, type RealtimeEvent } from '@/api/contracts'
import { env } from '@/config/env'
import { authStorage } from '@/features/session/storage'
import { useSession } from '@/features/session/SessionProvider'
import { EventApplier } from './apply'
import { setRealtimeStatus } from './status'

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const { status, user, userKey } = useSession()
  const ready = status === 'guest' || status === 'authenticated'
  const userId = user?.id ?? null

  useEffect(() => {
    if (!ready) return
    const applier = new EventApplier(qc, userKey, userId)
    const origin = env.socketUrl || window.location.origin
    let socket: Socket | null = null
    let disposed = false
    const timer = setTimeout(() => {
      void import('socket.io-client').then(({ io }) => {
        if (disposed) return
        const sock: Socket = io(origin, {
          path: '/socket.io/',
          transports: ['websocket'],
          reconnection: true,
          reconnectionDelay: 400,
          reconnectionDelayMax: 3000,
          randomizationFactor: 0.2,
        })
        socket = sock
        let hasConnectedBefore = false
        setRealtimeStatus('connecting')

        sock.on('connect', () => {
          setRealtimeStatus('connected')
          sock.emit(SOCKET_EVENTS.authenticate, {
            token: authStorage.read()?.token ?? null,
          })
          if (hasConnectedBefore) {
            applier.reset()
            void qc.invalidateQueries({ refetchType: 'active' })
          }
          hasConnectedBefore = true
        })
        sock.on('disconnect', () => setRealtimeStatus(sock.active ? 'reconnecting' : 'offline'))
        sock.on('connect_error', () => setRealtimeStatus('reconnecting'))
        const onEvent = (event: RealtimeEvent) => applier.handle(event)
        sock.on(SOCKET_EVENTS.nftUpdated, onEvent)
        sock.on(SOCKET_EVENTS.orderUpdated, onEvent)
      })
    }, 0)

    return () => {
      disposed = true
      clearTimeout(timer)
      if (socket) {
        socket.removeAllListeners()
        socket.disconnect()
      }
      setRealtimeStatus('idle')
    }
  }, [qc, ready, userKey, userId])

  return <>{children}</>
}
