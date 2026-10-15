import type { CreateOrderRequest } from '@/api/contracts'
import { safeJsonParse, safeStorage, uuid } from '@/lib/utils'

export interface OrderAttempt {
  key: string
  body: CreateOrderRequest
  startedAt: string
}

const PREFIX = 'kurio.order-attempt.'

export const attemptStore = {
  read(userId: string): OrderAttempt | null {
    const a = safeJsonParse<OrderAttempt>(safeStorage.get(PREFIX + userId, 'session'))
    if (a && Date.now() - Date.parse(a.startedAt) > 3_600_000) {
      this.clear(userId)
      return null
    }
    return a
  },
  start(userId: string, body: CreateOrderRequest): OrderAttempt {
    const attempt: OrderAttempt = { key: `ord-${uuid()}`, body, startedAt: new Date().toISOString() }
    safeStorage.set(PREFIX + userId, JSON.stringify(attempt), 'session')
    return attempt
  },
  clear(userId: string): void {
    safeStorage.remove(PREFIX + userId, 'session')
  },
}
