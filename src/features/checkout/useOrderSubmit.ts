import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Network, Order, Quote } from '@/api/contracts'
import { toApiError } from '@/api/errors'
import { api } from '@/api/endpoints'
import { keys } from '@/api/keys'
import { announce } from '@/components/live-announcer'
import { useSession } from '@/features/session/SessionProvider'
import { sleep } from '@/lib/utils'
import { attemptStore, type OrderAttempt } from './attempt'
import { clearDraft } from './draft'

export type SubmitState =
  | { phase: 'idle' }
  | { phase: 'revalidating' }
  | { phase: 'changes'; previous: Quote; current: Quote }
  | { phase: 'creating' }
  | { phase: 'recovering'; attempt: number }
  | { phase: 'error'; message: string; canRetrySameAttempt: boolean }

const RECOVERY_DELAYS = [800, 1600, 3200]
const CREATE_TIMEOUT_MS = 10_000

export function useOrderSubmit() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { user } = useSession()
  const userId = user?.id ?? ''
  const [state, setState] = useState<SubmitState>({ phase: 'idle' })
  const locked = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const set = useCallback((s: SubmitState) => mounted.current && setState(s), [])

  const finish = useCallback(
    (order: Order) => {
      attemptStore.clear(userId)
      qc.setQueryData(keys.order(userId, order.id), order)
      void qc.invalidateQueries({ queryKey: keys.pendingOrders(userId) })
      clearDraft(userId)
      announce('Pedido criado. Aguardando confirmação da rede.')
      void navigate({ to: '/pedido/$orderId', params: { orderId: order.id }, replace: true })
    },
    [navigate, qc, userId],
  )

  const send = useCallback(
    async (attempt: OrderAttempt): Promise<void> => {
      set({ phase: 'creating' })
      for (let i = 0; i <= RECOVERY_DELAYS.length; i++) {
        try {
          const order = await api.orders.create(attempt.body, attempt.key, { timeoutMs: CREATE_TIMEOUT_MS })
          finish(order)
          return
        } catch (e) {
          const err = toApiError(e)
          const ambiguous = err.kind === 'timeout' || err.kind === 'network' || (err.status !== null && err.status >= 500)
          if (!ambiguous) {
            attemptStore.clear(userId)
            if (err.code === 'quote_stale') {
              const current = (err.details as { currentQuote?: Quote } | undefined)?.currentQuote
              if (current) {
                const previous = qc.getQueryData<Quote>(keys.quote(userId, attempt.body.network))
                void qc.invalidateQueries({ queryKey: ['user', userId, 'quote'] })
                set({ phase: 'changes', previous: previous ?? current, current })
                return
              }
            }
            if (err.code === 'availability_conflict' || err.code === 'validation_failed') {
              void qc.invalidateQueries({ queryKey: keys.cart(userId) })
              void qc.invalidateQueries({ queryKey: ['user', userId, 'quote'] })
            }
            if (err.isAuthError) {
              set({ phase: 'idle' })
              return
            }
            set({ phase: 'error', message: err.fields._form ?? err.message, canRetrySameAttempt: false })
            return
          }
          if (i === RECOVERY_DELAYS.length) {
            set({
              phase: 'error',
              canRetrySameAttempt: true,
              message: 'Não recebemos a resposta do servidor. Seu pedido pode já ter sido criado: reenviar é seguro e não duplica a compra.',
            })
            return
          }
          set({ phase: 'recovering', attempt: i + 1 })
          await sleep(RECOVERY_DELAYS[i]!)
        }
      }
    },
    [finish, qc, set, userId],
  )

  const submit = useCallback(
    async (accepted: Quote, walletId: string, network: Network): Promise<void> => {
      if (locked.current) return
      locked.current = true
      try {
        const pending = attemptStore.read(userId)
        if (pending) {
          await send(pending)
          return
        }
        set({ phase: 'revalidating' })
        let fresh: Quote
        try {
          fresh = await api.quotes.create(network)
        } catch (e) {
          const err = toApiError(e)
          if (!err.isAuthError) set({ phase: 'error', message: err.message, canRetrySameAttempt: false })
          else set({ phase: 'idle' })
          return
        }
        qc.setQueryData(keys.quote(userId, network), fresh)
        if (fresh.revision !== accepted.revision || fresh.issues.length > 0) {
          set({ phase: 'changes', previous: accepted, current: fresh })
          return
        }
        const attempt = attemptStore.start(userId, { quoteId: fresh.id, walletId, network, expectedTotalEth: fresh.totalEth })
        await send(attempt)
      } finally {
        locked.current = false
      }
    },
    [qc, send, set, userId],
  )

  const resume = useCallback(async (): Promise<boolean> => {
    const pending = attemptStore.read(userId)
    if (!pending || locked.current) return false
    locked.current = true
    try {
      await send(pending)
    } finally {
      locked.current = false
    }
    return true
  }, [send, userId])

  return { state, submit, resume, reset: () => set({ phase: 'idle' }), busy: state.phase === 'revalidating' || state.phase === 'creating' || state.phase === 'recovering' }
}
