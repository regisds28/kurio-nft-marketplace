import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import '@fontsource-variable/roboto-mono'
import './styles/index.css'
import { env } from '@/config/env'
import { queryClient } from '@/app/query-client'
import { router } from '@/app/router'

async function bootstrap(): Promise<void> {
  if (env.enableMocks) {
    const { startMocks } = await import('@/mocks/browser')
    await startMocks()
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
}

void bootstrap()
