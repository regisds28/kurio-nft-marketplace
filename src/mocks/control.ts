import { commit, getDb, getScenarioIds, resetDb, setScenario } from './db'
import { mutateNft } from './domain/events'
import { findNft } from './domain/catalog'
import { resolveDueOrders, resolveOrder } from './domain/orders'
import { clearQueuedDelays, queueDelay } from './faults'
import { PRESETS, type HttpMethod } from './scenarios'
import { realtimeControl } from './socket'
import { authStorage, guestCart } from '@/features/session/storage'

export interface MockControl {
  scenarios: Array<{ id: string; label: string; description: string }>
  getScenario(): string[]
  setScenario(ids: string | string[]): string[]
  reset(ids?: string | string[]): void
  expireSession(userId?: string): number
  queueDelay(input: { method?: HttpMethod; path: string; ms: number; times?: number }): void
  clearDelays(): void
  nft: {
    update(input: {
      id: string
      priceEth?: string
      editions?: Partial<Record<string, number>>
      reason?: 'price_changed' | 'availability_changed' | 'sold_out' | 'restocked'
    }): { version: number } | null
    find(name: string): string | null
  }
  orders: {
    resolve(id: string): string | null
    list(): Array<{ id: string; status: string; version: number }>
  }
  realtime: typeof realtimeControl
  state(): unknown
}

declare global {
  interface Window {
    __KURIO_MOCK__?: MockControl
  }
}

export function installControl(): MockControl {
  const control: MockControl = {
    scenarios: PRESETS.map(({ id, label, description }) => ({ id, label, description })),
    getScenario: getScenarioIds,
    setScenario: (ids) => setScenario(ids),
    reset(ids) {
      resetDb(Array.isArray(ids) ? ids.join(',') : ids)
      clearQueuedDelays()
      authStorage.clear()
      guestCart.clear()
      realtimeControl.clearLog()
      realtimeControl.setOffline(false)
      realtimeControl.disconnect()
    },
    expireSession(userId) {
      const past = new Date(Date.now() - 1000).toISOString()
      let count = 0
      for (const s of getDb().sessions) {
        if (!userId || s.userId === userId) {
          s.expiresAt = past
          count++
        }
      }
      commit()
      return count
    },
    queueDelay,
    clearDelays: clearQueuedDelays,
    nft: {
      update({ id, priceEth, editions, reason }) {
        const nft = findNft(id)
        if (!nft) return null
        mutateNft(nft, { priceEth, editions }, reason ?? (priceEth ? 'price_changed' : 'availability_changed'))
        return { version: nft.version }
      },
      find: (name) => getDb().nfts.find((n) => n.name === name)?.id ?? null,
    },
    orders: {
      resolve(id) {
        return resolveOrder(id)?.status ?? null
      },
      list() {
        resolveDueOrders()
        return getDb().orders.map((o) => ({ id: o.id, status: o.status, version: o.version }))
      },
    },
    realtime: realtimeControl,
    state: () => structuredClone(getDb()),
  }
  window.__KURIO_MOCK__ = control
  return control
}
