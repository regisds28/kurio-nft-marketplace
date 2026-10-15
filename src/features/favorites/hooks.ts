import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { FavoritesResponse } from '@/api/contracts'
import { describeError } from '@/api/errors'
import { api } from '@/api/endpoints'
import { keys } from '@/api/keys'
import { announce } from '@/components/live-announcer'
import { useSession } from '@/features/session/SessionProvider'

export function useFavorites() {
  const { userKey, isAuthenticated } = useSession()
  return useQuery({
    queryKey: keys.favorites(userKey),
    queryFn: ({ signal }) => api.favorites.list({ signal }),
    enabled: isAuthenticated,
  })
}

export function useIsFavorite(nftId: string): boolean {
  const { data } = useFavorites()
  return data?.nftIds.includes(nftId) ?? false
}

export function useToggleFavorite() {
  const qc = useQueryClient()
  const { userKey } = useSession()
  const key = keys.favorites(userKey)

  return useMutation({
    mutationFn: ({ nftId, favorite }: { nftId: string; favorite: boolean }) =>
      favorite ? api.favorites.add(nftId) : api.favorites.remove(nftId),
    onMutate: async ({ nftId, favorite }) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<FavoritesResponse>(key)
      const base = previous?.nftIds ?? []
      const next = favorite ? [...new Set([...base, nftId])] : base.filter((id) => id !== nftId)
      qc.setQueryData<FavoritesResponse>(key, { nftIds: next })
      announce(favorite ? 'Adicionado aos favoritos.' : 'Removido dos favoritos.')
      return { previous }
    },
    onError: (error, { favorite }, context) => {
      qc.setQueryData(key, context?.previous)
      const message = `Não foi possível ${favorite ? 'favoritar' : 'remover o favorito'}. ${describeError(error)}`
      toast.error(message)
      announce(message, 'assertive')
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: key }),
  })
}
