import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws } from 'msw'
import {
  SOCKET_EVENTS,
  type AuthenticatePayload,
  type RealtimeEvent,
} from '@/api/contracts'
import { env } from '@/config/env'
import { mockBus } from './db'
import { authenticateToken } from './domain/auth'

export const SOCKET_PATH = '/socket.io/'

export function socketOrigin(): string {
  if (env.socketUrl) return env.socketUrl.replace(/\/$/, '')
  const { protocol, host } = window.location
  return `${protocol === 'https:' ? 'wss' : 'ws'}://${host}`
}

type SocketIo = ReturnType<typeof toSocketIo>

interface ClientConn {
  id: number
  io: SocketIo
  userId: string | null
  close: (code?: number, reason?: string) => void
}

const clients = new Set<ClientConn>()
let nextConnId = 1
let offline = false

export interface SentEvent {
  connId: number
  userId: string | null
  event: RealtimeEvent
}
const sentLog: SentEvent[] = []

function deliver(conn: ClientConn, event: RealtimeEvent): void {
  conn.io.client.emit(event.type, event)
  sentLog.push({ connId: conn.id, userId: conn.userId, event })
  if (sentLog.length > 500) sentLog.shift()
}

export function dispatch(event: RealtimeEvent): void {
  for (const conn of clients) {
    if (event.type === 'order.updated' && conn.userId !== event.payload.ownerId) continue
    deliver(conn, event)
  }
}

let busBound = false
function bindBus(): void {
  if (busBound) return
  busBound = true
  mockBus.on('nft.updated', dispatch)
  mockBus.on('order.updated', dispatch)
}

export function createRealtimeHandlers() {
  bindBus()
  const link = ws.link(socketOrigin())

  return [
    link.addEventListener('connection', (connection) => {
      if (offline) {
        toSocketIo(connection)
        setTimeout(() => connection.client.close(1011, 'mock-offline'), 30)
        return
      }
      const io = toSocketIo(connection)
      const conn: ClientConn = {
        id: nextConnId++,
        io,
        userId: null,
        close: (code = 1011, reason = 'mock-disconnect') => connection.client.close(code, reason),
      }
      clients.add(conn)

      const ping = setInterval(() => {
        try {
          connection.client.send('2')
        } catch {
        }
      }, 20_000)

      io.client.on(SOCKET_EVENTS.authenticate, (_event, payload: AuthenticatePayload | undefined) => {
        const auth = authenticateToken(payload?.token ?? null)
        conn.userId = auth.user?.id ?? null
        if (auth.user) io.client.emit(SOCKET_EVENTS.authenticated, { userId: auth.user.id })
        else io.client.emit(SOCKET_EVENTS.rejected, { reason: auth.problem ?? 'missing' })
      })

      connection.client.addEventListener('close', () => {
        clearInterval(ping)
        clients.delete(conn)
      })
    }),
  ]
}

export const realtimeControl = {
  connections: () => [...clients].map((c) => ({ id: c.id, userId: c.userId })),
  disconnect(code?: number): number {
    const all = [...clients]
    for (const c of all) c.close(code)
    return all.length
  },
  setOffline(value: boolean): void {
    offline = value
    if (value) realtimeControl.disconnect()
  },
  isOffline: () => offline,
  log: () => sentLog.map((s) => ({ ...s })),
  clearLog: () => {
    sentLog.length = 0
  },
  replay(eventId: string): boolean {
    const found = [...sentLog].reverse().find((s) => s.event.eventId === eventId)
    if (!found) return false
    dispatch(found.event)
    return true
  },
  emit: dispatch,
}
