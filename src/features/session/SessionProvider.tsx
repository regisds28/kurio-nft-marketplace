import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { api } from '@/api/endpoints'
import type { LoginRequest, RegisterRequest, User } from '@/api/contracts'
import { isApiError } from '@/api/errors'
import { keys } from '@/api/keys'
import { sessionBus } from '@/api/session-bus'
import { announce } from '@/components/live-announcer'
import { authStorage, guestCart } from './storage'
import { clearAllCheckoutDrafts } from '@/features/checkout/draft'

export type SessionStatus = 'loading' | 'guest' | 'authenticated' | 'error'
export type SessionNotice = 'session_expired' | 'session_invalid' | null

interface SessionValue {
  status: SessionStatus
  user: User | null
  userKey: string
  isAuthenticated: boolean
  notice: SessionNotice
  dismissNotice: () => void
  login: (body: Omit<LoginRequest, 'guestCartId'>) => Promise<User>
  register: (body: Omit<RegisterRequest, 'guestCartId'>) => Promise<User>
  logout: () => Promise<void>
  retry: () => void
  setUser: (user: User) => void
}

const SessionContext = createContext<SessionValue | null>(null)

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession deve ser usado dentro de <SessionProvider>')
  return ctx
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const router = useRouter()
  const [status, setStatus] = useState<SessionStatus>(() => (authStorage.read() ? 'loading' : 'guest'))
  const [user, setUserState] = useState<User | null>(null)
  const [notice, setNotice] = useState<SessionNotice>(null)
  const [bootAttempt, setBootAttempt] = useState(0)
  const userRef = useRef<User | null>(null)
  userRef.current = user

  const userKey = user?.id ?? 'guest'

  const wipePrivateCache = useCallback(async () => {
    await qc.cancelQueries({ queryKey: keys.private })
    qc.removeQueries({ queryKey: keys.private })
  }, [qc])

  const endSession = useCallback(
    async (reason: 'session_expired' | 'session_invalid') => {
      if (!authStorage.read() && !userRef.current) return
      authStorage.clear()
      setUserState(null)
      setStatus('guest')
      setNotice(reason)
      await wipePrivateCache()
      const redirect = router.state.location.href
      const onAuthPage = /^\/(entrar|cadastro)/.test(router.state.location.pathname)
      announce(
        reason === 'session_expired' ? 'Sua sessão expirou. Entre novamente para continuar.' : 'Faça login para continuar.',
        'assertive',
      )
      if (!onAuthPage) {
        void router.navigate({ to: '/entrar', search: { redirect, motivo: 'expirada' } })
      }
    },
    [router, wipePrivateCache],
  )

  useEffect(() => {
    const stored = authStorage.read()
    if (!stored) {
      setStatus('guest')
      return
    }
    if (Date.parse(stored.expiresAt) <= Date.now()) {
      authStorage.clear()
      setStatus('guest')
      setNotice('session_expired')
      return
    }
    const controller = new AbortController()
    setStatus('loading')
    api.auth
      .session({ signal: controller.signal })
      .then((res) => {
        setUserState(res.user)
        setStatus('authenticated')
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        if (isApiError(error) && error.status === 401) {
          authStorage.clear()
          setStatus('guest')
          setNotice(error.isSessionExpired ? 'session_expired' : 'session_invalid')
          return
        }
        setStatus('error')
      })
    return () => controller.abort()
  }, [bootAttempt])

  useEffect(() => sessionBus.onInvalid((reason) => void endSession(reason)), [endSession])

  useEffect(() => {
    if (status !== 'authenticated') return
    const stored = authStorage.read()
    if (!stored) return
    const ms = Date.parse(stored.expiresAt) - Date.now()
    if (ms <= 0 || ms > 2 ** 31 - 1) return
    const timer = setTimeout(() => void endSession('session_expired'), ms)
    return () => clearTimeout(timer)
  }, [status, user?.id, endSession])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== 'kurio.auth') return
      const next = authStorage.read()
      if (!next && userRef.current) {
        setUserState(null)
        setStatus('guest')
        void wipePrivateCache()
      } else if (next && next.userId !== userRef.current?.id) {
        window.location.reload()
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [wipePrivateCache])

  const establish = useCallback(
    async (res: { user: User; token: string; expiresAt: string }) => {
      await wipePrivateCache()
      authStorage.write({ token: res.token, expiresAt: res.expiresAt, userId: res.user.id })
      guestCart.clear()
      setNotice(null)
      setUserState(res.user)
      setStatus('authenticated')
      return res.user
    },
    [wipePrivateCache],
  )

  const login = useCallback<SessionValue['login']>(
    async (body) => establish(await api.auth.login({ ...body, guestCartId: guestCart.peek() ?? undefined })),
    [establish],
  )

  const register = useCallback<SessionValue['register']>(
    async (body) => establish(await api.auth.register({ ...body, guestCartId: guestCart.peek() ?? undefined })),
    [establish],
  )

  const logout = useCallback(async () => {
    const hadSession = Boolean(authStorage.read())
    try {
      if (hadSession) await api.auth.logout()
    } catch {
    }
    authStorage.clear()
    clearAllCheckoutDrafts()
    setUserState(null)
    setStatus('guest')
    setNotice(null)
    await wipePrivateCache()
    announce('Você saiu da sua conta.')
  }, [wipePrivateCache])

  const value = useMemo<SessionValue>(
    () => ({
      status,
      user,
      userKey,
      isAuthenticated: status === 'authenticated' && user !== null,
      notice,
      dismissNotice: () => setNotice(null),
      login,
      register,
      logout,
      retry: () => setBootAttempt((n) => n + 1),
      setUser: (next) => setUserState(next),
    }),
    [status, user, userKey, notice, login, register, logout],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
