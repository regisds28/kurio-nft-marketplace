import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect, useRef, type ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from './SessionProvider'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, isAuthenticated } = useSession()
  const href = useRouterState({ select: (s) => s.location.href })
  const navigate = useNavigate()
  const entryHref = useRef(href)
  const redirected = useRef(false)
  const mustLogin = status !== 'loading' && !isAuthenticated

  useEffect(() => {
    if (!mustLogin || redirected.current) return
    redirected.current = true
    void navigate({ to: '/entrar', search: { redirect: entryHref.current }, replace: true })
  }, [mustLogin, navigate])

  if (status === 'loading') {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 xl:px-0" aria-busy="true" aria-label="Verificando sessão">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="mt-6 h-[320px] w-full" />
      </div>
    )
  }
  if (!isAuthenticated) return null
  return <>{children}</>
}
