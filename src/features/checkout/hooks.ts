import { useQuery } from '@tanstack/react-query'
import type { Network } from '@/api/contracts'
import { api } from '@/api/endpoints'
import { keys } from '@/api/keys'
import { useSession } from '@/features/session/SessionProvider'

export function useQuote(network: Network, enabled = true) {
  const { userKey, status } = useSession()
  return useQuery({
    queryKey: keys.quote(userKey, network),
    queryFn: ({ signal }) => api.quotes.create(network, { signal }),
    enabled: enabled && (status === 'guest' || status === 'authenticated'),
    staleTime: 0,
    gcTime: 60_000,
  })
}
