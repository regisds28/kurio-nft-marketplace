import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { Heart, Minus, Plus, ShoppingCart, ZoomIn } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { EDITION_LABEL, NETWORK_LABEL, type EditionId, type NftDetail, type NftSummary } from '@/api/contracts'
import { isApiError } from '@/api/errors'
import { announce } from '@/components/live-announcer'
import { LinkedinIcon, MessageIcon, TwitterIcon } from '@/components/icons'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { NftArt } from '@/components/nft-art'
import { Stars } from '@/components/stars'
import { EmptyState, ErrorState, InlineNotice } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useNftDetail, useRelatedNfts } from '@/features/catalog/hooks'
import { NftCard } from '@/features/catalog/NftCard'
import { useAddToCart, useCart } from '@/features/cart/hooks'
import { useIsFavorite, useToggleFavorite } from '@/features/favorites/hooks'
import { useSession } from '@/features/session/SessionProvider'
import { formatDate } from '@/lib/format'
import { formatEth } from '@/lib/money'
import { notAvailable } from '@/lib/out-of-scope'
import { useDocumentTitle } from '@/lib/use-document-title'
import { cn } from '@/lib/utils'

const SHELL = 'mx-auto w-full max-w-[1200px] px-4 sm:px-6 xl:px-0'

export function NftDetailPage() {
  const { nftId } = useParams({ from: '/nft/$nftId' })
  const query = useNftDetail(nftId)
  useDocumentTitle(query.data?.name ?? 'NFT')

  if (query.isPending) return <DetailSkeleton />
  if (query.isError) {
    const notFound = isApiError(query.error) && query.error.status === 404
    return (
      <div className={`${SHELL} py-10`}>
        <ScreenHeader title="NFT" />
        {notFound ? (
          <EmptyState
            title="NFT não encontrado"
            description="Este NFT não existe ou foi removido do catálogo."
            action={
              <Button asChild>
                <Link to="/">Voltar ao catálogo</Link>
              </Button>
            }
          />
        ) : (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} retrying={query.isFetching} title="Não foi possível carregar este NFT" />
        )}
      </div>
    )
  }
  return <DetailView nft={query.data} />
}

function DetailSkeleton() {
  return (
    <div className={`${SHELL} py-6`} aria-busy="true" aria-label="Carregando NFT">
      <Skeleton className="h-4 w-40" />
      <div className="mt-3 flex flex-col gap-8 lg:flex-row">
        <div className="flex gap-7">
          <div className="hidden flex-col gap-4 lg:flex">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="size-[100px]" />)}
          </div>
          <Skeleton className="aspect-square w-full lg:size-[444px]" />
        </div>
        <div className="flex-1 space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-1/2" />
        </div>
      </div>
    </div>
  )
}

function DetailView({ nft }: { nft: NftDetail }) {
  const { isAuthenticated } = useSession()
  const navigate = useNavigate()
  const cart = useCart()
  const add = useAddToCart()
  const favorite = useIsFavorite(nft.id)
  const toggleFavorite = useToggleFavorite()

  const firstAvailable =
    nft.editions.find((e) => e.id === 'ed-1-50' && e.available > 0)?.id ??
    nft.editions.find((e) => e.available > 0)?.id ??
    nft.editions[0]!.id
  const [editionId, setEditionId] = useState<EditionId>(firstAvailable)
  const [quantity, setQuantity] = useState(1)
  const [galleryIndex, setGalleryIndex] = useState(0)
  const [zoom, setZoom] = useState(false)

  const edition = nft.editions.find((e) => e.id === editionId) ?? nft.editions[0]!
  const inCart = cart.data?.items.find((i) => i.nftId === nft.id && i.editionId === edition.id)?.quantity ?? 0
  const maxAddable = Math.max(0, Math.min(nft.maxPerOrder, edition.available) - inCart)
  const soldOut = nft.availability === 'sold_out' || nft.editions.every((e) => e.available === 0)
  const canBuy = maxAddable > 0

  useEffect(() => {
    if (maxAddable > 0 && quantity > maxAddable) setQuantity(maxAddable)
    if (maxAddable === 0 && quantity !== 1) setQuantity(1)
  }, [maxAddable, quantity])
  useEffect(() => {
    if (edition.available === 0) {
      const alt = nft.editions.find((e) => e.available > 0)
      if (alt) setEditionId(alt.id)
    }
  }, [edition.available, nft.editions])

  const last = useRef({ version: nft.version, price: nft.priceEth, units: nft.availableUnits })
  const [changeNote, setChangeNote] = useState<string | null>(null)
  useEffect(() => {
    const prev = last.current
    if (nft.version > prev.version) {
      const message =
        nft.priceEth !== prev.price
          ? `O preço mudou de ${formatEth(prev.price)} para ${formatEth(nft.priceEth)}.`
          : nft.availability === 'sold_out'
            ? 'Este NFT esgotou.'
            : 'A disponibilidade deste NFT foi atualizada.'
      setChangeNote(message)
      announce(message)
      last.current = { version: nft.version, price: nft.priceEth, units: nft.availableUnits }
    }
  }, [nft.version, nft.priceEth, nft.availability, nft.availableUnits])

  const gallery = nft.gallery
  const main = gallery[galleryIndex] ?? gallery[0]!
  const attributes = nft.attributes.join(', ')

  const requireLogin = () => {
    toast.info('Entre na sua conta para favoritar NFTs.')
    void navigate({ to: '/entrar', search: { redirect: window.location.pathname } })
  }
  const onFavorite = () => {
    if (!isAuthenticated) return requireLogin()
    toggleFavorite.mutate({ nftId: nft.id, favorite: !favorite })
  }
  const addToCart = (thenGo: boolean) => {
    if (!canBuy) return
    add.mutate(
      { nftId: nft.id, editionId: edition.id, quantity },
      { onSuccess: () => { setQuantity(1); if (thenGo) void navigate({ to: '/carrinho' }) } },
    )
  }

  const FavoriteButton = (props: { className?: string }) => (
    <button
      type="button"
      aria-pressed={favorite}
      onClick={onFavorite}
      className={props.className}
      data-testid="favorite-button"
    >
      <Heart className="size-5" fill={favorite ? 'currentColor' : 'none'} aria-hidden="true" />
      <span className="max-lg:sr-only">{favorite ? 'Favoritado' : 'Favoritar'}</span>
    </button>
  )

  const Quantity = (
    <div className="flex items-center gap-3" role="group" aria-label="Quantidade">
      <button
        type="button"
        aria-label="Diminuir quantidade"
        disabled={quantity <= 1}
        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
        className="grid h-[49px] w-[33px] place-items-center rounded-[33px] border border-ink bg-primary text-ink shadow-[0_6px_10px_rgba(20,13,10,0.15)] disabled:opacity-50 max-lg:h-[30px] max-lg:w-[20px]"
      >
        <Minus className="size-5 max-lg:size-3.5" aria-hidden="true" />
      </button>
      <output aria-live="polite" data-testid="quantity" className="min-w-6 text-center text-xl leading-7 max-lg:text-base">{quantity}</output>
      <button
        type="button"
        aria-label="Aumentar quantidade"
        disabled={quantity >= maxAddable}
        onClick={() => setQuantity((q) => Math.min(maxAddable, q + 1))}
        className="grid h-[49px] w-[33px] place-items-center rounded-[33px] border border-ink bg-primary text-ink shadow-[0_6px_10px_rgba(20,13,10,0.15)] disabled:opacity-50 max-lg:h-[30px] max-lg:w-[20px]"
      >
        <Plus className="size-5 max-lg:size-3.5" aria-hidden="true" />
      </button>
    </div>
  )

  const limitHint = soldOut
    ? 'Todas as edições estão esgotadas.'
    : !canBuy
      ? inCart > 0
        ? 'Você já tem o máximo disponível desta edição no carrinho.'
        : 'Esta edição está esgotada.'
      : quantity >= maxAddable
        ? `Limite atingido: ${maxAddable} ${maxAddable === 1 ? 'unidade' : 'unidades'} disponível${maxAddable === 1 ? '' : 'is'} para esta edição${inCart ? ` (você já tem ${inCart} no carrinho)` : ''}.`
        : `${edition.available} disponíveis nesta edição · máx. ${nft.maxPerOrder} por pedido`

  return (
    <div className={cn(SHELL, 'pb-32 lg:pb-0')}>
      <ScreenHeader
        title={nft.name}
        right={
          <button type="button" aria-pressed={favorite} aria-label={favorite ? 'Remover dos favoritos' : 'Favoritar'} onClick={onFavorite} className="grid size-[35px] place-items-center rounded-full bg-surface-card text-accent">
            <Heart className="size-5" fill={favorite ? 'currentColor' : 'none'} aria-hidden="true" />
          </button>
        }
      />
      <nav aria-label="Você está em" className="hidden pt-6 text-[15px] font-bold lg:block">
        <Link to="/" className="hover:text-accent">Início</Link> / <Link to="/" hash="catalogo" className="hover:text-accent">Mercado</Link>
      </nav>

      {changeNote && (
        <InlineNotice tone="warning" className="mt-3">
          {changeNote} <button type="button" className="underline" onClick={() => setChangeNote(null)}>Dispensar</button>
        </InlineNotice>
      )}

      <section aria-labelledby="nft-title" className="mt-3 flex flex-col gap-8 lg:flex-row lg:gap-8">
        <div className="flex shrink-0 flex-col gap-4 lg:w-[573px] lg:flex-row lg:gap-7">
          <ul className="order-2 flex gap-3 lg:order-1 lg:w-[100px] lg:flex-col lg:gap-4" aria-label="Galeria">
            {gallery.map((g, i) => (
              <li key={g.id}>
                <button
                  type="button"
                  aria-label={`Ver imagem ${i + 1} de ${gallery.length}`}
                  aria-current={i === galleryIndex}
                  onClick={() => setGalleryIndex(i)}
                  className={cn('block size-[72px] overflow-hidden rounded-lg bg-surface-card lg:size-[100px]', i === galleryIndex && 'ring-1 ring-primary')}
                >
                  <NftArt artwork={g.artwork} alt="" className="size-full rounded-lg" sizes="100px" />
                </button>
              </li>
            ))}
          </ul>
          <div className="relative order-1 grid aspect-square w-full place-items-center rounded-md bg-surface-card p-3 lg:order-2 lg:size-[444px] lg:p-4">
            <NftArt artwork={main.artwork} alt={main.alt} priority sizes="(min-width: 1024px) 404px, 100vw" className="size-full rounded-2xl lg:rounded-3xl" />
            <button
              type="button"
              aria-label="Ampliar imagem"
              onClick={() => setZoom(true)}
              className="absolute top-4 right-4 grid size-[30px] place-items-center rounded-full bg-ink/70 text-foreground hover:text-accent lg:top-[15px] lg:right-[15px]"
            >
              <ZoomIn className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-6 lg:justify-between lg:gap-5">
          <div className="flex flex-col gap-3">
            <h1 id="nft-title" className="text-[28px] leading-tight font-bold max-lg:hidden" data-testid="nft-title">{nft.name}</h1>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[22px] leading-4 font-bold text-accent max-lg:text-lg" data-testid="nft-price">
                {formatEth(nft.priceEth)}
                {nft.previousPriceEth && (
                  <span className="ml-3 text-sm font-normal text-secondary line-through">
                    <span className="sr-only">Preço anterior </span>{formatEth(nft.previousPriceEth)}
                  </span>
                )}
              </p>
              <div className="flex items-center gap-1 text-[15px]">
                <Stars value={Number(nft.rating.average)} />
                <span className="ml-1 max-lg:hidden">{nft.rating.count} avaliações de colecionadores</span>
                <span className="lg:hidden">{nft.rating.average.replace('.', ',')} ({nft.rating.count})</span>
              </div>
            </div>
            <hr className="border-border-soft" />
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-[15px] leading-4 font-bold">Sobre este NFT:</h2>
            <p className="text-sm leading-6 text-muted">{nft.description}</p>
          </div>

          <div className="flex flex-col gap-3">
            <h2 id="edition-label" className="text-[15px] leading-4 font-bold">Edição:</h2>
            <div role="radiogroup" aria-labelledby="edition-label" className="flex flex-wrap gap-1.5">
              {nft.editions.map((e) => {
                const selected = e.id === edition.id
                const out = e.available === 0
                return (
                  <button
                    key={e.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-disabled={out}
                    disabled={out}
                    title={out ? 'Edição esgotada' : `${e.available} disponíveis`}
                    onClick={() => setEditionId(e.id)}
                    data-testid={`edition-${e.id}`}
                    className={cn(
                      'h-7 rounded-full px-3 text-sm',
                      selected ? 'border border-primary font-medium text-accent' : 'text-muted hover:text-accent',
                      out && 'line-through opacity-50',
                    )}
                  >
                    {EDITION_LABEL[e.id]}
                    {out && <span className="sr-only"> (esgotada)</span>}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2 max-lg:hidden">
            <div className="flex items-center justify-between">
              {Quantity}
              <div className="flex items-center gap-2">
                <Button
                  className="h-10 w-[130px]"
                  disabled={!canBuy || add.isPending}
                  onClick={() => addToCart(true)}
                  data-testid="buy-button"
                >
                  COMPRAR
                </Button>
                <FavoriteButton className="inline-flex h-10 w-[130px] items-center justify-center gap-2 rounded-md border border-primary text-sm font-medium text-accent hover:bg-primary/15" />
              </div>
            </div>
            <p className={cn('text-xs', canBuy ? 'text-secondary' : 'text-danger')} role="status" data-testid="limit-hint">{limitHint}</p>
            <button
              type="button"
              disabled={!canBuy || add.isPending}
              onClick={() => addToCart(false)}
              className="w-fit text-sm text-accent underline underline-offset-4 disabled:opacity-50"
              data-testid="add-to-cart"
            >
              Adicionar ao carrinho
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 text-[15px] text-secondary">
              <p>ID do token: #{nft.tokenId.replace(/^#/, '')}</p>
              <p>Coleção: {nft.series}</p>
              <p>Atributos: {attributes}</p>
            </div>
            <div className="flex items-center gap-2 text-[15px]">
              <span className="font-bold">Compartilhar este NFT:</span>
              {[
                { label: 'LinkedIn', Icon: LinkedinIcon },
                { label: 'E-mail', Icon: MessageIcon },
                { label: 'Twitter', Icon: TwitterIcon },
              ].map(({ label, Icon }) => (
                <button key={label} type="button" aria-label={`Compartilhar por ${label}`} onClick={() => notAvailable('O compartilhamento')} className="grid size-6 place-items-center hover:text-accent">
                  <Icon className="size-4" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Tabs defaultValue="details" className="mt-14 lg:mt-24">
        <TabsList>
          <TabsTrigger value="details">Detalhes do NFT</TabsTrigger>
          <TabsTrigger value="reviews">Avaliações de colecionadores ({nft.rating.count})</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="flex flex-col gap-3 text-sm leading-6">
          <p className="text-muted">{nft.longDescription}</p>
          <h3 className="mt-3 font-bold">Rede:</h3>
          <p className="text-muted">Cunhado na {NETWORK_LABEL[nft.network]} com procedência imutável e metadados armazenados no IPFS.</p>
          <h3 className="font-bold">Contrato:</h3>
          <p className="text-muted">{nft.contract} • Contrato inteligente ERC-721 verificado.</p>
          <h3 className="font-bold">Direitos autorais:</h3>
          <p className="text-muted">
            Direitos autorais do criador: {nft.royaltyBps / 100}% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.
          </p>
        </TabsContent>
        <TabsContent value="reviews">
          <ul className="flex flex-col gap-5">
            {nft.reviews.map((r) => (
              <li key={r.id} className="rounded-lg bg-surface-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold">{r.author}</p>
                  <Stars value={r.rating} size={14} />
                </div>
                <p className="mt-2 text-sm text-muted">{r.comment}</p>
                <p className="mt-2 text-xs text-secondary">{formatDate(r.createdAt)}</p>
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>

      <Related id={nft.id} />

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface-card px-6 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] lg:hidden">
        <div className="mx-auto max-w-[560px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm">Qtd.</span>
              {Quantity}
            </div>
            <span className="text-base font-bold text-accent">{formatEth(nft.priceEth)}</span>
          </div>
          <p className={cn('mt-1 text-xs', canBuy ? 'text-secondary' : 'text-danger')} role="status">{limitHint}</p>
          <div className="mt-3 flex gap-3">
            <Button className="h-[52px] flex-1" disabled={!canBuy || add.isPending} onClick={() => addToCart(true)}>Comprar NFT</Button>
            <Button variant="secondary" className="size-[52px]" aria-label="Adicionar ao carrinho" disabled={!canBuy || add.isPending} onClick={() => addToCart(false)}>
              <ShoppingCart className="size-5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={zoom} onOpenChange={setZoom}>
        <DialogContent className="max-w-[min(90vw,720px)] p-3">
          <DialogTitle className="sr-only">{nft.name}</DialogTitle>
          <DialogDescription className="sr-only">Imagem ampliada</DialogDescription>
          <NftArt artwork={main.artwork} alt={main.alt} className="aspect-square w-full rounded-2xl" />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Related({ id }: { id: string }) {
  const { data, isPending, isError, refetch, error } = useRelatedNfts(id)
  return (
    <section aria-labelledby="related-title" className="mt-14 lg:mt-24">
      <h2 id="related-title" className="border-b border-border-soft pb-3 text-[17px] leading-4 font-bold text-accent">Mais desta coleção</h2>
      {isError ? (
        <ErrorState className="mt-6" error={error} onRetry={() => void refetch()} title="Não foi possível carregar os NFTs relacionados" />
      ) : (
        <ul className="mt-8 flex snap-x gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-5 lg:gap-6 lg:overflow-visible">
          {isPending
            ? Array.from({ length: 5 }, (_, i) => <li key={i} className="w-[170px] shrink-0 lg:w-auto"><Skeleton className="h-[255px]" /></li>)
            : (data as NftSummary[]).slice(0, 5).map((n) => (
                <li key={n.id} className="w-[170px] shrink-0 snap-start lg:w-auto">
                  <NftCard nft={n} />
                </li>
              ))}
        </ul>
      )}
    </section>
  )
}
