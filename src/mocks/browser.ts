import { setupWorker } from 'msw/browser'
import { env } from '@/config/env'
import { installControl } from './control'
import { initDb } from './db'
import { resumePendingOrders } from './domain/orders'
import { handlers } from './handlers'
import { createRealtimeHandlers } from './socket'

export async function startMocks(): Promise<void> {
  const fromUrl = new URLSearchParams(window.location.search).get('scenario')
  initDb({ scenario: fromUrl, fallbackScenario: env.mockScenario })
  resumePendingOrders()

  const worker = setupWorker(...handlers, ...createRealtimeHandlers())
  await worker.start({
    quiet: true,
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  })
  installControl()
}
