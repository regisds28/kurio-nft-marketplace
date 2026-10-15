import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { NftListParams } from '@/api/contracts'
import { api } from '@/api/endpoints'
import { keys } from '@/api/keys'

export function useNftList(params: NftListParams) {
  return useQuery({
    queryKey: keys.nfts.list(params),
    queryFn: ({ signal }) => api.nfts.list(params, { signal }),
    placeholderData: keepPreviousData,
  })
}

export function useFeatured() {
  return useQuery({ queryKey: keys.nfts.featured, queryFn: ({ signal }) => api.nfts.featured({ signal }), staleTime: 60_000 })
}

export function useNftDetail(id: string) {
  return useQuery({
    queryKey: keys.nfts.detail(id),
    queryFn: ({ signal }) => api.nfts.detail(id, { signal }),
  })
}

export function useRelatedNfts(id: string) {
  return useQuery({ queryKey: keys.nfts.related(id), queryFn: ({ signal }) => api.nfts.related(id, { signal }) })
}

export function useEditorialPosts() {
  return useQuery({
    queryKey: keys.editorial,
    queryFn: ({ signal }) => api.editorial.posts({ signal }),
    staleTime: 5 * 60_000,
  })
}
