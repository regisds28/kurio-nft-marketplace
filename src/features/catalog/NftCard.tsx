import { Link } from '@tanstack/react-router'
import { Heart } from 'lucide-react'
import type { NftSummary } from '@/api/contracts'
import { NftArt } from '@/components/nft-art'
import { Skeleton } from '@/components/ui/skeleton'
import { useIsFavorite, useToggleFavorite } from '@/features/favorites/hooks'
import { useSession } from '@/features/session/SessionProvider'
import { formatEth } from '@/lib/money'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useNavigate } from '@tanstack/react-router'

export function NftCard({ nft, priority = false }: { nft: NftSummary; priority?: boolean }) {
  const soldOut = nft.availability === 'sold_out'
  return (
    <article className="group relative" data-testid="nft-card" data-nft-id={nft.id}>
      <Link
        to="/nft/$nftId"
        params={{ nftId: nft.id }}
        className="block rounded-[20px] outline-offset-4 lg:rounded-none"
        aria-label={`${nft.name}, ${formatEth(nft.priceEth)}${soldOut ? ', esgotado' : ''}`}
      >
        <div
          className={cn(
            'relative grid aspect-[175/200] place-items-center overflow-hidden rounded-[20px] bg-gradient-to-br from-surface-card from-[12%] to-[#2f1d15]',
            'lg:aspect-auto lg:h-[300px] lg:rounded-none lg:bg-none lg:bg-surface-card',
          )}
        >
          <NftArt
            artwork={nft.artwork}
            alt=""
            priority={priority}
            sizes="(min-width: 1024px) 250px, 168px"
            className="size-[calc(100%-8px)] rounded-2xl lg:size-[250px] lg:rounded-[15px]"
          />
          {nft.rarity === 'raro' && (
            <span className="absolute top-4 left-0 bg-primary px-2 py-1.5 text-[13px] font-medium leading-4 text-ink">RARO</span>
          )}
          {soldOut && (
            <span className="absolute inset-x-0 bottom-3 mx-auto w-fit rounded-sm bg-ink/85 px-2 py-1 text-xs font-bold text-danger">
              ESGOTADO
            </span>
          )}
        </div>
        <div className="px-2 pt-2 lg:px-0 lg:pt-3">
          <h3 className="text-[15px] font-normal leading-normal lg:text-base" data-testid="nft-name">{nft.name}</h3>
          <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-base font-bold leading-4 text-accent lg:text-lg">
            <span data-testid="nft-price">{formatEth(nft.priceEth)}</span>
            {nft.previousPriceEth && (
              <span className="text-sm font-normal text-secondary line-through">
                <span className="sr-only">Preço anterior </span>
                {formatEth(nft.previousPriceEth)}
              </span>
            )}
          </p>
        </div>
      </Link>
      <FavoriteOverlay nft={nft} />
    </article>
  )
}

function FavoriteOverlay({ nft }: { nft: NftSummary }) {
  const { isAuthenticated } = useSession()
  const navigate = useNavigate()
  const favorite = useIsFavorite(nft.id)
  const toggle = useToggleFavorite()
  return (
    <button
      type="button"
      aria-pressed={favorite}
      aria-label={favorite ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`}
      onClick={() => {
        if (!isAuthenticated) {
          toast.info('Entre na sua conta para favoritar NFTs.')
          void navigate({ to: '/entrar', search: { redirect: window.location.pathname + window.location.search } })
          return
        }
        toggle.mutate({ nftId: nft.id, favorite: !favorite })
      }}
      className="absolute top-3.5 right-3.5 grid size-7 place-items-center rounded-full bg-ink/60 text-accent lg:hidden"
    >
      <Heart className="size-4" fill={favorite ? 'currentColor' : 'none'} aria-hidden="true" />
    </button>
  )
}

export function NftCardSkeleton() {
  return (
    <div aria-hidden="true">
      <Skeleton className="aspect-[175/200] rounded-[20px] lg:aspect-auto lg:h-[300px] lg:rounded-none" />
      <Skeleton className="mt-3 h-[18px] w-3/4" />
      <Skeleton className="mt-2 h-[18px] w-1/3" />
    </div>
  )
}
