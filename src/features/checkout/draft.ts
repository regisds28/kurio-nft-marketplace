import { safeJsonParse, safeStorage } from '@/lib/utils'
import type { Network } from '@/api/contracts'

export interface CheckoutDraft {
  fullName: string
  email: string
  document: string
  walletId: string | null
  network: Network
}

const PREFIX = 'kurio.checkout.'

export const EMPTY_DRAFT: CheckoutDraft = { fullName: '', email: '', document: '', walletId: null, network: 'ethereum' }

export function readDraft(userId: string): CheckoutDraft | null {
  return safeJsonParse<CheckoutDraft>(safeStorage.get(PREFIX + userId, 'session'))
}

export function writeDraft(userId: string, draft: CheckoutDraft): void {
  safeStorage.set(PREFIX + userId, JSON.stringify(draft), 'session')
}

export function clearDraft(userId: string): void {
  safeStorage.remove(PREFIX + userId, 'session')
}

export function clearAllCheckoutDrafts(): void {
  try {
    const store = window.sessionStorage
    for (let i = store.length - 1; i >= 0; i--) {
      const key = store.key(i)
      if (key?.startsWith(PREFIX)) store.removeItem(key)
    }
  } catch {
  }
}
