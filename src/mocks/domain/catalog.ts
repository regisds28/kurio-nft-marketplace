import {
  COLLECTIONS,
  NETWORKS,
  NETWORK_LABEL,
  PAGE_SIZE,
  type AvailabilityStatus,
  type EditionOption,
  type FacetEntry,
  type NftDetail,
  type NftListParams,
  type NftListResponse,
  type NftSummary,
} from '@/api/contracts'
import { ARTWORK_ALT, ARTWORK_ORDER } from '@/lib/artwork'
import { compareEth, eth, normalizeEth } from '@/lib/money'
import { EDITION_LABEL } from '@/api/contracts'
import { getDb, getScenario } from '../db'
import type { NftRecord } from '../types'

export function availableUnits(nft: NftRecord): number {
  return nft.editions.reduce((sum, e) => sum + e.available, 0)
}

export function availabilityOf(units: number): AvailabilityStatus {
  if (units <= 0) return 'sold_out'
  if (units <= 3) return 'low'
  return 'available'
}

const collectionName = (id: string) => COLLECTIONS.find((c) => c.id === id)?.name ?? id

export function toSummary(nft: NftRecord): NftSummary {
  const units = availableUnits(nft)
  return {
    id: nft.id,
    name: nft.name,
    tokenId: nft.tokenId,
    priceEth: nft.priceEth,
    previousPriceEth: nft.previousPriceEth,
    artwork: nft.artwork,
    collectionId: nft.collectionId,
    collectionName: collectionName(nft.collectionId),
    series: nft.series,
    network: nft.network,
    rarity: nft.rarity,
    availableUnits: units,
    availability: availabilityOf(units),
    createdAt: nft.createdAt,
    popularity: nft.popularity,
    version: nft.version,
  }
}

export function toEditions(nft: NftRecord): EditionOption[] {
  return nft.editions.map((e) => ({ id: e.id, label: EDITION_LABEL[e.id], supply: e.supply, available: e.available }))
}

export function toDetail(nft: NftRecord): NftDetail {
  const others = ARTWORK_ORDER.filter((a) => a !== nft.artwork)
  const order = [nft.artwork, ...others]
  return {
    ...toSummary(nft),
    description: nft.description,
    longDescription: nft.longDescription,
    attributes: nft.attributes,
    creator: nft.creator,
    royaltyBps: nft.royaltyBps,
    contract: nft.contract,
    editions: toEditions(nft),
    gallery: order.map((artwork, i) => ({
      id: `${nft.id}-g${i + 1}`,
      artwork,
      alt: i === 0 ? `${nft.name}: ${ARTWORK_ALT[artwork]}` : `Outra arte da série: ${ARTWORK_ALT[artwork]}`,
    })),
    rating: { average: nft.ratingAverage, count: nft.ratingCount },
    reviews: nft.reviews,
    maxPerOrder: nft.maxPerOrder,
  }
}

export function findNft(id: string): NftRecord | undefined {
  return getDb().nfts.find((n) => n.id === id)
}

export function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

const DAY = 86_400_000

function tabSet(all: NftRecord[], tab: NftListParams['tab']): Set<string> | null {
  if (!tab || tab === 'all') return null
  if (tab === 'new') {
    const newest = Math.max(...all.map((n) => Date.parse(n.createdAt)))
    return new Set(all.filter((n) => newest - Date.parse(n.createdAt) <= 14 * DAY).map((n) => n.id))
  }
  const top = [...all].sort((a, b) => b.popularity - a.popularity).slice(0, 12)
  return new Set(top.map((n) => n.id))
}

export function listNfts(params: NftListParams): NftListResponse {
  const db = getDb()
  const all = db.nfts
  const empty = getScenario().catalogEmpty
  const pageSize = Math.min(Math.max(params.pageSize ?? PAGE_SIZE, 1), 48)
  const tab = tabSet(all, params.tab)
  const q = params.q ? fold(params.q) : ''

  const matches = (n: NftRecord, skip?: 'collections' | 'networks'): boolean => {
    if (empty) return false
    if (tab && !tab.has(n.id)) return false
    if (q) {
      const hay = fold(`${n.name} ${n.tokenId} ${n.series} ${collectionName(n.collectionId)}`)
      if (!q.split(/\s+/).every((term) => hay.includes(term))) return false
    }
    if (skip !== 'collections' && params.collections?.length && !params.collections.includes(n.collectionId)) return false
    if (skip !== 'networks' && params.networks?.length && !params.networks.includes(n.network)) return false
    if (params.minPrice && compareEth(n.priceEth, params.minPrice) < 0) return false
    if (params.maxPrice && compareEth(n.priceEth, params.maxPrice) > 0) return false
    return true
  }

  const filtered = all.filter((n) => matches(n))
  const sort = params.sort ?? 'recent'
  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case 'price_asc':
        return compareEth(a.priceEth, b.priceEth) || a.name.localeCompare(b.name)
      case 'price_desc':
        return compareEth(b.priceEth, a.priceEth) || a.name.localeCompare(b.name)
      case 'name':
        return a.name.localeCompare(b.name, 'pt-BR')
      case 'popular':
        return b.popularity - a.popularity
      default:
        return Date.parse(b.createdAt) - Date.parse(a.createdAt)
    }
  })

  const total = sorted.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(Math.max(params.page ?? 1, 1), totalPages)
  const items = sorted.slice((page - 1) * pageSize, page * pageSize).map(toSummary)

  const collections: FacetEntry<(typeof COLLECTIONS)[number]['id']>[] = COLLECTIONS.map((c) => ({
    id: c.id,
    name: c.name,
    count: all.filter((n) => n.collectionId === c.id && matches(n, 'collections')).length,
  }))
  const networks: FacetEntry<(typeof NETWORKS)[number]>[] = NETWORKS.map((id) => ({
    id,
    name: NETWORK_LABEL[id],
    count: all.filter((n) => n.network === id && matches(n, 'networks')).length,
  }))

  const prices = all.map((n) => eth(n.priceEth))
  const min = prices.reduce((a, b) => (a.lt(b) ? a : b))
  const max = prices.reduce((a, b) => (a.gt(b) ? a : b))

  return {
    items,
    page,
    pageSize,
    total,
    totalPages: empty ? 1 : totalPages,
    facets: { collections, networks },
    priceBounds: { min: normalizeEth(min.floor()), max: normalizeEth(max.ceil()) },
  }
}

export function relatedTo(nft: NftRecord, limit = 5): NftRecord[] {
  const all = getDb().nfts.filter((n) => n.id !== nft.id)
  const same = all.filter((n) => n.series === nft.series)
  const rest = all.filter((n) => n.series !== nft.series)
  return [...same, ...rest].slice(0, limit)
}
