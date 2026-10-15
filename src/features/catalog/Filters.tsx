import { Link } from '@tanstack/react-router'
import { useEffect, useId, useState } from 'react'
import { COLLECTIONS, NETWORKS, NETWORK_LABEL, type NftListResponse } from '@/api/contracts'
import { NftArt } from '@/components/nft-art'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import { useFeatured } from '@/features/catalog/hooks'
import { formatEth } from '@/lib/money'
import { cn } from '@/lib/utils'
import { listOf, type HomeSearch } from '@/routes/home-search'

const fmtRange = (n: number) => n.toFixed(2).replace('.', ',')

interface Props {
  data: NftListResponse | undefined
  search: HomeSearch
  onChange: (patch: Partial<HomeSearch>) => void
  onToggle: (key: 'collections' | 'networks', id: string) => void
  className?: string
  showSpotlight?: boolean
}

export function Filters({ data, search, onChange, onToggle, className, showSpotlight = false }: Props) {
  const uid = useId()
  const bounds = data?.priceBounds ?? { min: '0', max: '12.3' }
  const lo = Number(bounds.min)
  const hi = Number(bounds.max)
  const [range, setRange] = useState<[number, number]>([Number(search.minPrice ?? lo), Number(search.maxPrice ?? hi)])

  useEffect(() => {
    setRange([Number(search.minPrice ?? lo), Number(search.maxPrice ?? hi)])
  }, [search.minPrice, search.maxPrice, lo, hi])

  const selectedCollections = listOf(search.collections)
  const selectedNetworks = listOf(search.networks)
  const collectionCount = (id: string) => data?.facets.collections.find((c) => c.id === id)?.count
  const networkCount = (id: string) => data?.facets.networks.find((c) => c.id === id)?.count

  return (
    <aside aria-label="Filtros" className={cn('flex flex-col gap-6', className)}>
      <div className="bg-surface-card p-5 lg:w-[310px]">
        <section aria-labelledby={`${uid}-col`}>
          <h2 id={`${uid}-col`} className="text-lg font-bold leading-4">Coleções</h2>
          <ul className="mt-3">
            {COLLECTIONS.map((c) => {
              const active = selectedCollections.includes(c.id)
              const count = collectionCount(c.id)
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => onToggle('collections', c.id)}
                    className={cn(
                      'flex h-10 w-full items-center justify-between gap-2 rounded-sm px-2.5 text-[15px] hover:text-accent',
                      active ? 'text-accent' : 'text-muted',
                    )}
                  >
                    <span>{c.name}</span>
                    <span className="font-bold">{count === undefined ? '' : `(${count})`}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>

        <section aria-labelledby={`${uid}-price`} className="mt-6">
          <h2 id={`${uid}-price`} className="text-lg font-bold leading-4">Faixa de preço</h2>
          <div className="mt-3 px-1">
            <Slider
              min={lo}
              max={hi}
              step={0.01}
              value={range}
              thumbLabels={['Preço mínimo em ETH', 'Preço máximo em ETH']}
              onValueChange={(v) => setRange([v[0] ?? lo, v[1] ?? hi])}
              minStepsBetweenThumbs={1}
            />
          </div>
          <p className="mt-2 text-[15px]" aria-live="polite">
            Preço: {fmtRange(range[0])} - {fmtRange(range[1])} ETH
          </p>
          <Button
            size="sm"
            className="mt-3 h-auto px-3 py-2 text-base"
            onClick={() =>
              onChange({
                minPrice: range[0] > lo ? range[0].toFixed(2) : undefined,
                maxPrice: range[1] < hi ? range[1].toFixed(2) : undefined,
              })
            }
          >
            Aplicar
          </Button>
        </section>

        <section aria-labelledby={`${uid}-net`} className="mt-6">
          <h2 id={`${uid}-net`} className="text-lg font-bold leading-4">Rede</h2>
          <ul className="mt-3">
            {NETWORKS.map((n) => {
              const active = selectedNetworks.includes(n)
              const count = networkCount(n)
              return (
                <li key={n}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => onToggle('networks', n)}
                    className={cn(
                      'flex h-10 w-full items-center justify-between gap-2 rounded-sm px-2.5 text-[15px] hover:text-accent',
                      active ? 'text-accent' : 'text-muted',
                    )}
                  >
                    <span>{NETWORK_LABEL[n]}</span>
                    <span className="font-normal">{count === undefined ? '' : `(${count})`}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
      {showSpotlight && <Spotlight />}
    </aside>
  )
}

function Spotlight() {
  const { data, isPending } = useFeatured()
  return (
    <section aria-labelledby="spotlight-title" className="hidden w-[310px] overflow-hidden bg-gradient-to-b from-surface-dark/60 to-surface-card lg:block">
      <div className="px-5 pt-6 pb-4 text-center">
        <h2 id="spotlight-title" className="text-left text-2xl font-bold leading-7 text-accent">NFT EM DESTAQUE</h2>
        <p className="mt-4 text-xl font-bold">OFERTA LIMITADA</p>
      </div>
      {isPending || !data ? (
        <Skeleton className="h-[346px] w-full rounded-none" />
      ) : (
        <Link to="/nft/$nftId" params={{ nftId: data.spotlight.id }} className="block">
          <NftArt artwork={data.spotlight.artwork} alt={`${data.spotlight.name}, ${formatEth(data.spotlight.priceEth)}`} sizes="310px" className="h-[346px] w-full rounded-b-[16px]" />
        </Link>
      )}
    </section>
  )
}
