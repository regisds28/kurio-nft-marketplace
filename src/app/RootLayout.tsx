import { Suspense, lazy } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { LiveAnnouncer } from '@/components/live-announcer'
import { Toaster } from '@/components/ui/sonner'
import { env } from '@/config/env'
import { SessionProvider, useSession } from '@/features/session/SessionProvider'
import { RealtimeProvider } from '@/realtime/RealtimeProvider'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/states'

const MockPanel = lazy(() => import('@/mocks/panel/MockPanel').then((m) => ({ default: m.MockPanel })))

function Gate() {
  const { status, retry } = useSession()
  if (status === 'error') {
    return (
      <div className="mx-auto max-w-xl px-4 py-24">
        <ErrorState
          title="Não foi possível recuperar sua sessão"
          error={new Error('Falha de conexão ao validar a sessão.')}
          onRetry={retry}
        />
        <p className="mt-4 text-center text-sm text-muted">
          <Button variant="link" onClick={() => { localStorage.removeItem('kurio.auth'); location.reload() }}>
            Continuar como visitante
          </Button>
        </p>
      </div>
    )
  }
  return <AppShell />
}

export function RootLayout() {
  return (
    <SessionProvider>
      <RealtimeProvider>
        <Gate />
        <Toaster />
        <LiveAnnouncer />
        {env.enableMocks && env.mockPanel && (
          <Suspense fallback={null}>
            <MockPanel />
          </Suspense>
        )}
      </RealtimeProvider>
    </SessionProvider>
  )
}
