import { useQuery } from '@tanstack/react-query'
import { TERMINAL_ORDER_STATUS } from '@/api/contracts'
import { api } from '@/api/endpoints'
import { keys } from '@/api/keys'
import { useSession } from '@/features/session/SessionProvider'

export function useOrder(id: string) {
  const { userKey, isAuthenticated } = useSession()
  return useQuery({
    queryKey: keys.order(userKey, id),
    queryFn: ({ signal }) => api.orders.get(id, { signal }),
    enabled: isAuthenticated,
    staleTime: 0,
    refetchInterval: (q) => (q.state.data && TERMINAL_ORDER_STATUS.has(q.state.data.status) ? false : 3000),
  })
}

export function usePendingOrders(enabled = true) {
  const { userKey, isAuthenticated } = useSession()
  return useQuery({
    queryKey: keys.pendingOrders(userKey),
    queryFn: ({ signal }) => api.orders.list('pending', { signal }),
    enabled: enabled && isAuthenticated,
    staleTime: 0,
  })
}
