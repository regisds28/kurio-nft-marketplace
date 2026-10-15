import {
  CATALOG_TABS,
  COLLECTION_IDS,
  NETWORKS,
  SORT_OPTIONS,
  type CatalogTab,
  type CollectionId,
  type Network,
  type NftListParams,
  type SortOption,
} from '@/api/contracts'
import { parseEthInput } from '@/lib/money'

export interface HomeSearch {
  q?: string
  collections?: string
  networks?: string
  minPrice?: string
  maxPrice?: string
  sort?: SortOption
  tab?: CatalogTab
  page?: number
}

const asString = (v: unknown): string | undefined => {
  if (typeof v === 'string') return v
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  return undefined
}

const csv = (v: unknown): string[] =>
  (asString(v) ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

export function parseHomeSearch(raw: Record<string, unknown>): HomeSearch {
  const out: HomeSearch = {}
  const q = asString(raw.q)?.trim().slice(0, 80)
  if (q) out.q = q

  const collections = [...new Set(csv(raw.collections).filter((c) => (COLLECTION_IDS as string[]).includes(c)))]
  if (collections.length) out.collections = collections.join(',')
  const networks = [...new Set(csv(raw.networks).filter((n) => (NETWORKS as readonly string[]).includes(n)))]
  if (networks.length) out.networks = networks.join(',')

  const min = asString(raw.minPrice)
  const max = asString(raw.maxPrice)
  const minP = min ? parseEthInput(min) : null
  const maxP = max ? parseEthInput(max) : null
  if (minP) out.minPrice = minP
  if (maxP) out.maxPrice = maxP

  const sort = asString(raw.sort)
  if (sort && (SORT_OPTIONS as readonly string[]).includes(sort) && sort !== 'recent') out.sort = sort as SortOption
  const tab = asString(raw.tab)
  if (tab && (CATALOG_TABS as readonly string[]).includes(tab) && tab !== 'all') out.tab = tab as CatalogTab

  const page = Number(asString(raw.page))
  if (Number.isInteger(page) && page > 1) out.page = page
  return out
}

export function toListParams(s: HomeSearch): NftListParams {
  return {
    q: s.q,
    collections: csv(s.collections) as CollectionId[],
    networks: csv(s.networks) as Network[],
    minPrice: s.minPrice,
    maxPrice: s.maxPrice,
    sort: s.sort ?? 'recent',
    tab: s.tab ?? 'all',
    page: s.page ?? 1,
  }
}

export const listOf = csv

export function toggleCsv(current: string | undefined, id: string): string | undefined {
  const list = csv(current)
  const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
  return next.length ? next.join(',') : undefined
}

export const hasActiveFilters = (s: HomeSearch) =>
  Boolean(s.q || s.collections || s.networks || s.minPrice || s.maxPrice)
