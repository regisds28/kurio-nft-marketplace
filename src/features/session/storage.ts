import { safeJsonParse, safeStorage, uuid } from '@/lib/utils'

export interface StoredAuth {
  token: string
  expiresAt: string
  userId: string
}

const AUTH_KEY = 'kurio.auth'
const GUEST_KEY = 'kurio.guest-cart'

export const authStorage = {
  read(): StoredAuth | null {
    return safeJsonParse<StoredAuth>(safeStorage.get(AUTH_KEY))
  },
  write(auth: StoredAuth): void {
    safeStorage.set(AUTH_KEY, JSON.stringify(auth))
  },
  clear(): void {
    safeStorage.remove(AUTH_KEY)
  },
}

export const guestCart = {
  id(): string {
    let id = safeStorage.get(GUEST_KEY)
    if (!id) {
      id = uuid()
      safeStorage.set(GUEST_KEY, id)
    }
    return id
  },
  peek(): string | null {
    return safeStorage.get(GUEST_KEY)
  },
  clear(): void {
    safeStorage.remove(GUEST_KEY)
  },
}
