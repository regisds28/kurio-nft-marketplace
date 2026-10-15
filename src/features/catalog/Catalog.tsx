import { useNavigate, useSearch } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CATALOG_TABS, CATALOG_TAB_LABEL, SORT_LABEL, SORT_OPTIONS, type SortOption } from '@/api/contracts'
import { EmptyState, ErrorState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { hasActiveFilters, toListParams, toggleCsv, type HomeSearch } from '@/routes/home-search'
import { announce } from '@/components/live-announcer'
import { Filters } from './Filters'
import { useNftList } from './hooks'
import { NftCard, NftCardSkeleton } from './NftCard'

function useCatalogSearch() {
  const search = useSearch({ from: '/' }) as HomeSearch
  const navigate = useNavigate()
  const update = useCallback(
    (patch: Partial<HomeSearch>, opts: { keepPage?: boolean; replace?: boolean } = {}) => {
      void navigate({
        to: '/',
        search: (prev: HomeSearch) => {
          const next: HomeSearch = { ...prev, ...patch }
          if (!opts.keepPage && !('page' in patch)) delete next.page
          for (const k of Object.keys(next) as Array<keyof HomeSearch>) if (next[k] === undefined) delete next[k]
          return next
        },
        replace: opts.replace ?? false,
        resetScroll: false,
        hash: undefined,
      })
    },
    [navigate],
  )
  return { search, update }
}

function SearchField({ search, update, className, id }: { search: HomeSearch; update: ReturnType<typeof useCatalogSearch>['update']; className?: string; id: string }) {
  const [text, setText] = useState(search.q ?? '')
  const lastPushed = useRef(search.q ?? '')

  useEffect(() => {
    if ((search.q ?? '') !== lastPushed.current) {
      lastPushed.current = search.q ?? ''
      setText(search.q ?? '')
    }
  }, [search.q])

  useEffect(() => {
    const trimmed = text.trim()
    if (trimmed === (search.q ?? '')) return
    const t = setTimeout(() => {
      lastPushed.current = trimmed
      update({ q: trimmed || undefined }, { replace: true })
    }, 300)
    return () => clearTimeout(t)
  }, [text, search.q, update])

  return (
    <div className={cn('relative', className)}>
      <label htmlFor={id} className="sr-only">Buscar NFTs por nome ou coleção</label>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-secondary" aria-hidden="true" />
      <input
        id={id}
        data-catalog-search
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Explorar coleções"
        autoComplete="off"
        className="h-[45px] w-full rounded-[10px] bg-surface-card pr-9 pl-10 text-sm font-bold text-foreground outline-none placeholder:text-secondary focus-visible:ring-2 focus-visible:ring-accent lg:h-10 lg:rounded-md lg:bg-surface-dark lg:font-normal"
      />
      {text && (
        <button
          type="button"
          aria-label="Limpar busca"
          onClick={() => setText('')}
          className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

function pageWindow(current: number, total: number): Array<number | 'gap'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = new Set([1, total, current, current - 1, current + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  const out: Array<number | 'gap'> = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1]! > 1) out.push('gap')
    out.push(p)
  })
  return out
}

export function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null
  const btn = 'grid size-[35px] place-items-center rounded-[4px] bg-surface-card text-base hover:bg-surface-dark disabled:opacity-40'
  return (
    <nav aria-label="Paginação" className="mt-10 flex flex-wrap items-center justify-end gap-2" data-testid="pagination">
      <button type="button" className={btn} onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Página anterior">
        <ChevronLeft className="size-4" aria-hidden="true" />
      </button>
      {pageWindow(page, totalPages).map((p, i) =>
        p === 'gap' ? (
          <span key={`gap-${i}`} aria-hidden="true" className="px-1 text-muted">…</span>
        ) : (
          <button
            key={p}
            type="button"
            aria-label={`Página ${p}`}
            aria-current={p === page ? 'page' : undefined}
            onClick={() => onPage(p)}
            className={cn(btn, p === page && 'bg-primary font-bold text-ink hover:bg-primary')}
          >
            {p}
          </button>
        ),
      )}
      <button type="button" className={btn} onClick={() => onPage(page + 1)} disabled={page >= totalPages} aria-label="Próxima página">
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </nav>
  )
}

export function Catalog() {
  const { search, update } = useCatalogSearch()
  const params = toListParams(search)
  const query = useNftList(params)
  const { data } = query
  const [sheetOpen, setSheetOpen] = useState(false)
  const gridTop = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (data && !query.isPlaceholderData && data.page !== (search.page ?? 1)) {
      update({ page: data.page > 1 ? data.page : undefined }, { keepPage: true, replace: true })
    }
  }, [data, query.isPlaceholderData, search.page, update])

  const onToggle = (key: 'collections' | 'networks', id: string) => update({ [key]: toggleCsv(search[key], id) })
  const goToPage = (p: number) => {
    update({ page: p > 1 ? p : undefined }, { keepPage: true })
    gridTop.current?.scrollIntoView({ block: 'start' })
  }

  const total = data?.total
  useEffect(() => {
    if (data && !query.isPlaceholderData) announce(`${data.total} ${data.total === 1 ? 'NFT encontrado' : 'NFTs encontrados'}.`)
  }, [data, query.isPlaceholderData])

  const clear = () => update({ q: undefined, collections: undefined, networks: undefined, minPrice: undefined, maxPrice: undefined })

  const filters = (
    <Filters data={data} search={search} onChange={(p) => update(p)} onToggle={onToggle} showSpotlight />
  )

  return (
    <section id="catalogo" aria-labelledby="catalogo-titulo" className="scroll-mt-4">
      <h2 id="catalogo-titulo" className="sr-only">Catálogo de NFTs</h2>

      <div className="mb-4 flex items-center gap-2 lg:hidden">
        <SearchField id="catalog-search-mobile" search={search} update={update} className="flex-1" />
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Abrir filtros"
              className="grid size-[45px] shrink-0 place-items-center rounded-[14px] bg-gradient-to-br from-primary/45 from-25% to-primary text-ink"
            >
              <SlidersHorizontal className="size-5" aria-hidden="true" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[min(360px,calc(100vw-24px))] p-0">
            <SheetTitle className="px-5 pt-5 text-lg font-bold">Filtros</SheetTitle>
            <SheetDescription className="sr-only">Filtre por coleção, faixa de preço e rede.</SheetDescription>
            <div className="px-5 pt-4">
              <span id="sort-label-mobile" className="mb-1 block text-sm font-bold">Ordenar por</span>
              <Select value={search.sort ?? 'recent'} onValueChange={(v) => update({ sort: v === 'recent' ? undefined : (v as SortOption) })}>
                <SelectTrigger aria-labelledby="sort-label-mobile" data-testid="sort-mobile">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{SORT_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="px-0 pb-5">
              <Filters data={data} search={search} onChange={(p) => update(p)} onToggle={onToggle} className="[&>div]:w-full" />
              <div className="px-5">
                <Button className="w-full" onClick={() => setSheetOpen(false)}>
                  Ver {total ?? ''} resultados
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="hidden lg:block lg:shrink-0">
          <SearchField id="catalog-search" search={search} update={update} className="mb-4 w-[310px]" />
          {filters}
        </div>

        <div className="min-w-0 flex-1" ref={gridTop}>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <div role="group" aria-label="Seção do catálogo" className="flex items-center gap-4">
              {CATALOG_TABS.map((t) => {
                const active = (search.tab ?? 'all') === t
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={active}
                    onClick={() => update({ tab: t === 'all' ? undefined : t })}
                    className={cn(
                      'border-b-2 pb-1 text-sm',
                      active ? 'border-primary font-bold text-accent' : 'border-transparent text-foreground hover:text-accent',
                    )}
                  >
                    {CATALOG_TAB_LABEL[t]}
                  </button>
                )
              })}
            </div>
            <div className="hidden items-center gap-2 text-sm lg:flex">
              <span id="sort-label">Ordenar por:</span>
              <Select value={search.sort ?? 'recent'} onValueChange={(v) => update({ sort: v === 'recent' ? undefined : (v as SortOption) })}>
                <SelectTrigger aria-labelledby="sort-label" className="h-8 w-[230px] border-0 bg-transparent px-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{SORT_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="mb-3 flex items-center gap-3 text-sm text-muted" data-testid="result-count">
            {data ? `${data.total} ${data.total === 1 ? 'resultado' : 'resultados'}` : ' '}
            {query.isFetching && data && <span className="text-xs text-secondary">Atualizando…</span>}
            {hasActiveFilters(search) && (
              <button type="button" onClick={clear} className="text-accent underline underline-offset-4">Limpar filtros</button>
            )}
          </p>

          {query.isError && !data ? (
            <ErrorState error={query.error} onRetry={() => void query.refetch()} retrying={query.isFetching} title="Não foi possível carregar o catálogo" />
          ) : query.isPending ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:gap-x-6 lg:gap-y-10" aria-busy="true" aria-label="Carregando NFTs">
              {Array.from({ length: 9 }, (_, i) => <NftCardSkeleton key={i} />)}
            </div>
          ) : data && data.items.length === 0 ? (
            <EmptyState
              title="Nenhum NFT encontrado"
              description={hasActiveFilters(search) ? 'Tente remover alguns filtros ou buscar por outro termo.' : 'O catálogo está vazio no momento. Volte em instantes.'}
              action={hasActiveFilters(search) ? <Button variant="outline" size="sm" onClick={clear}>Limpar filtros</Button> : undefined}
            />
          ) : (
            <>
              {query.isError && (
                <div role="alert" className="mb-4 rounded-md border border-danger/60 bg-danger-bg px-3 py-2 text-sm text-danger">
                  Não foi possível atualizar a lista.{' '}
                  <button type="button" className="underline" onClick={() => void query.refetch()}>Tentar novamente</button>
                </div>
              )}
              <div
                aria-busy={query.isPlaceholderData}
                data-testid="nft-grid"
                className={cn(
                  'grid grid-cols-2 gap-x-4 gap-y-6 transition-opacity sm:grid-cols-3 lg:gap-x-6 lg:gap-y-10',
                  'max-sm:[&>*:nth-child(even)]:mt-8',
                  query.isPlaceholderData && 'opacity-60',
                )}
              >
                {data?.items.map((nft, i) => <NftCard key={nft.id} nft={nft} priority={i < 3} />)}
              </div>
              {data && <Pagination page={data.page} totalPages={data.totalPages} onPage={goToPage} />}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
