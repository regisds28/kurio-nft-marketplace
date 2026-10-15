import {
  CATALOG_TABS,
  COLLECTION_IDS,
  NETWORKS,
  SORT_OPTIONS,
  type CollectionId,
  type FeaturedResponse,
  type Network,
  type NftListParams,
} from '@/api/contracts'
import { parseEthInput } from '@/lib/money'
import { getDb } from '../db'
import { findNft, listNfts, relatedTo, toDetail, toSummary } from '../domain/catalog'
import { fail } from '../http-fail'
import { route, HttpResponse } from '../route'
import { csv } from './helpers'

function readParams(url: URL): NftListParams {
  const sp = url.searchParams
  const num = (key: string) => {
    const n = Number(sp.get(key))
    return Number.isInteger(n) && n > 0 ? n : undefined
  }
  const sort = sp.get('sort') as NftListParams['sort']
  const tab = sp.get('tab') as NftListParams['tab']
  const minPrice = sp.get('minPrice')
  const maxPrice = sp.get('maxPrice')
  return {
    q: sp.get('q') ?? undefined,
    collections: csv(sp.get('collections')).filter((c): c is CollectionId => (COLLECTION_IDS as string[]).includes(c)),
    networks: csv(sp.get('networks')).filter((n): n is Network => (NETWORKS as readonly string[]).includes(n)),
    minPrice: minPrice ? (parseEthInput(minPrice) ?? undefined) : undefined,
    maxPrice: maxPrice ? (parseEthInput(maxPrice) ?? undefined) : undefined,
    sort: sort && (SORT_OPTIONS as readonly string[]).includes(sort) ? sort : undefined,
    tab: tab && (CATALOG_TABS as readonly string[]).includes(tab) ? tab : undefined,
    page: num('page'),
    pageSize: num('pageSize'),
  }
}

export const nftHandlers = [
  route('GET', '/api/nfts', ({ url }) => HttpResponse.json(listNfts(readParams(url)))),

  route('GET', '/api/nfts/featured', () => {
    const nfts = getDb().nfts
    const payload: FeaturedResponse = {
      hero: [nfts[0]!, nfts[2]!, nfts[6]!].map(toSummary),
      spotlight: toSummary(nfts[1]!),
    }
    return HttpResponse.json(payload)
  }),

  route('GET', '/api/nfts/:id', ({ params }) => {
    const nft = findNft(params.id!)
    if (!nft) fail('not_found', 'NFT não encontrado.')
    return HttpResponse.json(toDetail(nft))
  }),

  route('GET', '/api/nfts/:id/related', ({ params }) => {
    const nft = findNft(params.id!)
    if (!nft) fail('not_found', 'NFT não encontrado.')
    return HttpResponse.json({ items: relatedTo(nft).map(toSummary) })
  }),
]
