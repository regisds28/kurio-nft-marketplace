import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { isApiError } from '@/api/errors'

export const RETRY_LIMIT = 2

export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= RETRY_LIMIT) return false
  if (!isApiError(error)) return false
  if (error.kind === 'canceled') return false
  return error.retryable
}

export const retryDelay = (attempt: number) => Math.min(400 * 2 ** attempt, 4000)

export function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache(),
    mutationCache: new MutationCache(),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: shouldRetry,
        retryDelay,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: { retry: false },
    },
  })
}

export const queryClient = createQueryClient()
