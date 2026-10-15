import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(id)
      reject(new DOMException('Aborted', 'AbortError'))
    })
  })
}

export function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export const safeStorage = {
  get(key: string, area: 'local' | 'session' = 'local'): string | null {
    try {
      return (area === 'local' ? localStorage : sessionStorage).getItem(key)
    } catch {
      return null
    }
  },
  set(key: string, value: string, area: 'local' | 'session' = 'local'): void {
    try {
      ;(area === 'local' ? localStorage : sessionStorage).setItem(key, value)
    } catch {
    }
  },
  remove(key: string, area: 'local' | 'session' = 'local'): void {
    try {
      ;(area === 'local' ? localStorage : sessionStorage).removeItem(key)
    } catch {
    }
  },
}
