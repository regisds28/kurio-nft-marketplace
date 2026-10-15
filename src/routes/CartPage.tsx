import { Link, useNavigate } from '@tanstack/react-router'
import { Trash2 } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import type { Cart, CartItem, Quote } from '@/api/contracts'
import { toApiError } from '@/api/errors'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { NftArt } from '@/components/nft-art'
import { QuantityStepper } from '@/components/quantity-stepper'
import { EmptyState, ErrorState, InlineNotice } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAddToCart, useApplyCoupon, useCart, useRemoveCartItem, useRemoveCoupon, useUpdateCartItem } from '@/features/cart/hooks'
import { useCartChanges } from '@/features/cart/useCartChanges'
import { useQuote } from '@/features/checkout/hooks'
import { NftCard } from '@/features/catalog/NftCard'
import { useNftList } from '@/features/catalog/hooks'
import { useSession } from '@/features/session/SessionProvider'
import { formatDiscount, formatEth } from '@/lib/money'
import { useDocumentTitle } from '@/lib/use-document-title'
import { cn } from '@/lib/utils'

const SHELL = 'mx-auto w-full max-w-[1200px] px-4 sm:px-6 xl:px-0'

export function CartPage() {
  useDocumentTitle('Carrinho')
  const cart = useCart()
  const changes = useCartChanges(cart.data)

  return (
    <div className={`${SHELL} py-4 lg:py-6`}>
      <ScreenHeader title="Carrinho de NFTs" />
      <nav aria-label="Você está em" className="mb-3 hidden text-[15px] font-bold lg:block">
        <Link to="/" className="hover:text-accent">Início</Link> / <Link to="/" hash="catalogo" className="hover:text-accent">Mercado</Link> / Carrinho
      </nav>

      {changes.notes.length > 0 && (
        <InlineNotice tone="warning" className="mb-4" role="status">
          <ul className="list-disc pl-5">
            {changes.notes.map((n) => <li key={n}>{n}</li>)}
          </ul>
          <button type="button" className="mt-1 underline" onClick={changes.dismiss}>Dispensar avisos</button>
        </InlineNotice>
      )}

      {cart.isPending ? (
        <CartSkeleton />
      ) : cart.isError && !cart.data ? (
        <ErrorState error={cart.error} onRetry={() => void cart.refetch()} retrying={cart.isFetching} title="Não foi possível carregar o carrinho" />
      ) : cart.data!.items.length === 0 ? (
        <EmptyState
          title="Seu carrinho está vazio"
          description="Explore o catálogo e adicione NFTs para continuar."
          action={<Button asChild><Link to="/" hash="catalogo">Explorar NFTs</Link></Button>}
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,782px)_332px] lg:justify-between lg:gap-[86px]">
          <CartTable cart={cart.data!} />
          <Summary cart={cart.data!} />
        </div>
      )}

      <AlsoViewed />
    </div>
  )
}

function CartSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_332px]" aria-busy="true" aria-label="Carregando carrinho">
      <div className="space-y-3">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[100px] lg:h-[70px]" />)}
      </div>
      <Skeleton className="h-[388px]" />
    </div>
  )
}

function CartTable({ cart }: { cart: Cart }) {
  return (
    <section aria-label="Itens do carrinho">
      <div className="hidden grid-cols-[250px_77px_120px_87px_24px] justify-between gap-4 border-b border-border-soft pb-3 text-[15px] font-bold lg:grid">
        <span>NFTs</span><span>Preço</span><span>Edições</span><span>Total</span><span className="sr-only">Remover</span>
      </div>
      <ul className="lg:mt-3" data-testid="cart-items">
        {cart.items.map((item) => <CartRow key={item.id} item={item} />)}
      </ul>
    </section>
  )
}

function CartRow({ item }: { item: CartItem }) {
  const update = useUpdateCartItem()
  const remove = useRemoveCartItem()
  const add = useAddToCart()
  const blocked = item.status !== 'ok'
  const max = Math.max(1, item.maxQuantity)

  const onRemove = () =>
    remove.mutate(item.id, {
      onSuccess: () =>
        toast(`${item.name} removido do carrinho.`, {
          action: { label: 'Desfazer', onClick: () => add.mutate({ nftId: item.nftId, editionId: item.editionId, quantity: item.quantity }) },
        }),
    })

  return (
    <li
      data-testid="cart-item"
      data-item-id={item.id}
      className="relative mb-3 grid grid-cols-[100px_1fr] gap-x-3 rounded-lg bg-surface-card p-0 lg:mb-0 lg:grid-cols-[250px_77px_120px_87px_24px] lg:items-center lg:justify-between lg:gap-4 lg:rounded-none lg:bg-transparent lg:py-3"
    >
      <div className="contents lg:flex lg:items-center lg:gap-4">
        <NftArt artwork={item.artwork} alt={item.name} className="size-[100px] rounded-lg lg:size-[70px]" sizes="100px" />
        <div className="py-3 pr-12 lg:py-0 lg:pr-0">
          <Link to="/nft/$nftId" params={{ nftId: item.nftId }} className="block text-base font-normal hover:text-accent">{item.name}</Link>
          <p className="mt-1.5 text-[15px] text-secondary lg:hidden">Edição: {item.editionLabel}</p>
          <p className="hidden text-[15px] text-secondary lg:mt-1.5 lg:block">ID do token: #{item.tokenId.replace(/^#/, '')}</p>
        </div>
      </div>

      <p className="col-start-2 -mt-3 pb-3 text-base font-bold text-accent lg:col-auto lg:m-0 lg:p-0 lg:font-normal lg:text-foreground" data-testid="cart-unit-price">
        {formatEth(item.unitPriceEth)}
      </p>

      <div className="col-start-2 flex flex-col gap-1 pb-3 lg:col-auto lg:p-0">
        <div className="flex items-center gap-2">
          <span className="hidden text-[15px] lg:inline lg:sr-only">Edição {item.editionLabel}</span>
          <QuantityStepper
            value={item.quantity}
            max={max}
            label={`${item.name} (${item.editionLabel})`}
            disabled={item.status === 'unavailable'}
            onChange={(q) => update.mutate({ itemId: item.id, quantity: q })}
          />
        </div>
        <span className="hidden text-xs text-secondary lg:block">Edição {item.editionLabel}</span>
      </div>

      <p className="hidden text-base lg:block" data-testid="cart-line-total">{formatEth(item.lineTotalEth)}</p>

      <button
        type="button"
        aria-label={`Remover ${item.name} do carrinho`}
        onClick={onRemove}
        disabled={remove.isPending}
        className="absolute top-3 right-3 grid size-6 place-items-center text-secondary hover:text-danger lg:static"
      >
        <Trash2 className="size-5" aria-hidden="true" />
      </button>

      {blocked && (
        <div className="col-span-full px-3 pb-3 lg:px-0 lg:pb-0">
          <InlineNotice tone="error" role="alert">
            {item.status === 'unavailable'
              ? `${item.name} (${item.editionLabel}) está esgotado. Remova o item para continuar.`
              : `Só restam ${item.available} unidades de ${item.name} (${item.editionLabel}).`}
            {item.status === 'insufficient' && (
              <button type="button" className="ml-2 underline" onClick={() => update.mutate({ itemId: item.id, quantity: max })}>
                Ajustar para {max}
              </button>
            )}
          </InlineNotice>
        </div>
      )}
    </li>
  )
}

function Row({ label, value, strong, id }: { label: string; value: string; strong?: boolean; id?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className={cn('text-sm leading-5', strong && 'text-base font-bold')}>{label}</dt>
      <dd data-testid={id} className={cn('text-base', strong && 'font-bold')}>{value}</dd>
    </div>
  )
}

function Summary({ cart }: { cart: Cart }) {
  const quote = useQuote('ethereum')
  const navigate = useNavigate()
  const { isAuthenticated } = useSession()
  const hasBlockingItems = cart.items.some((i) => i.status !== 'ok')
  const issues = quote.data?.issues ?? []
  const canCheckout = !hasBlockingItems && issues.length === 0 && !!quote.data && cart.items.length > 0

  const goCheckout = () => {
    if (!isAuthenticated) {
      toast.info('Entre na sua conta para finalizar a compra. Seu carrinho será mantido.')
      void navigate({ to: '/entrar', search: { redirect: '/pagamento' } })
      return
    }
    void navigate({ to: '/pagamento' })
  }

  return (
    <aside aria-labelledby="summary-title" className="max-lg:rounded-lg max-lg:bg-surface-card max-lg:p-4">
      <div className="border-b border-border-soft pb-3">
        <h2 id="summary-title" className="text-base font-bold leading-4">Resumo da carteira</h2>
      </div>
      <CouponForm cart={cart} quote={quote.data} />
      {quote.isPending ? (
        <div className="mt-6 space-y-4" aria-busy="true" aria-label="Calculando resumo">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-5 w-full" />)}
        </div>
      ) : quote.isError && !quote.data ? (
        <ErrorState className="mt-6" error={quote.error} onRetry={() => void quote.refetch()} title="Não foi possível calcular o resumo" />
      ) : (
        <SummaryNumbers quote={quote.data!} stale={quote.isFetching} />
      )}
      {issues.length > 0 && (
        <InlineNotice tone="error" role="alert" className="mt-4">
          <ul className="list-disc pl-5">{issues.map((i) => <li key={`${i.type}-${i.itemId ?? ''}`}>{i.message}</li>)}</ul>
        </InlineNotice>
      )}
      <div className="mt-6 flex flex-col gap-3">
        <Button className="h-10 w-full lg:h-10" disabled={!canCheckout} onClick={goCheckout} data-testid="checkout-cta">
          Conectar e finalizar
        </Button>
        <Link to="/" hash="catalogo" className="text-center text-sm hover:text-accent">Continuar explorando</Link>
      </div>
    </aside>
  )
}

function SummaryNumbers({ quote, stale }: { quote: Quote; stale: boolean }) {
  return (
    <dl className={cn('mt-6 flex flex-col gap-3 transition-opacity', stale && 'opacity-70')} aria-live="polite" aria-busy={stale} data-testid="summary">
      <Row label="Subtotal" value={formatEth(quote.subtotalEth)} id="subtotal" />
      <Row label={quote.discountLabel ?? 'Desconto do lançamento'} value={formatDiscount(quote.discountEth)} id="discount" />
      <div>
        <Row label="Taxa de rede" value={formatEth(quote.networkFeeEth, { minDecimals: 3 })} id="network-fee" />
        <p className="mt-1 text-right text-xs text-secondary">Taxa estimada</p>
      </div>
      <div className="mt-3">
        <Row label="Total" value={formatEth(quote.totalEth, { minDecimals: 3 })} strong id="total" />
      </div>
    </dl>
  )
}

function CouponForm({ cart, quote }: { cart: Cart; quote: Quote | undefined }) {
  const id = useId()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const apply = useApplyCoupon()
  const remove = useRemoveCoupon()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const value = code.trim()
    if (!value) return setError('Informe o código promocional.')
    setError(null)
    apply.mutate(value, {
      onSuccess: () => { setCode(''); toast.success('Código promocional aplicado.') },
      onError: (err) => setError(toApiError(err).fields.code ?? toApiError(err).message),
    })
  }

  const quoteCouponIssue = quote?.issues.find((i) => i.type === 'coupon_invalid' || i.type === 'coupon_expired')

  return (
    <div className="mt-6">
      <label htmlFor={id} className="text-base font-bold leading-4">Código promocional</label>
      {cart.couponCode ? (
        <div className="mt-2 flex items-center justify-between rounded-md bg-surface-dark px-3 py-2.5 text-sm" data-testid="coupon-applied">
          <span>
            <span className="font-bold text-accent">{cart.couponCode}</span>
            {quote?.discountLabel ? ` · ${quote.discountLabel}` : ''}
            {quoteCouponIssue && <span className="block text-danger">{quoteCouponIssue.message}</span>}
          </span>
          <Button variant="link" size="sm" onClick={() => remove.mutate()} disabled={remove.isPending} aria-label={`Remover cupom ${cart.couponCode}`}>Remover</Button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="mt-2">
          <div className="flex h-10 overflow-hidden rounded-md bg-surface-dark shadow-[0_0_10px_rgba(10,6,4,0.45)] max-lg:h-[50px]">
            <input
              id={id}
              value={code}
              onChange={(e) => { setCode(e.target.value); setError(null) }}
              placeholder="Digite o código promocional..."
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-err` : undefined}
              autoComplete="off"
              maxLength={32}
              className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-secondary focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
            />
            <button type="submit" disabled={apply.isPending} className="w-[102px] bg-primary text-base font-bold text-ink hover:bg-accent disabled:opacity-60 max-lg:w-[97px]">
              {apply.isPending ? '…' : 'Aplicar'}
            </button>
          </div>
          {error && <p id={`${id}-err`} role="alert" className="mt-1.5 text-sm text-danger">{error}</p>}
        </form>
      )}
    </div>
  )
}

function AlsoViewed() {
  const { data, isPending } = useNftList({ sort: 'popular', pageSize: 5 })
  return (
    <section aria-labelledby="also-title" className="mt-16 lg:mt-24">
      <h2 id="also-title" className="border-b border-border-soft pb-3 text-[17px] leading-4 font-bold text-accent">Colecionadores também viram</h2>
      <ul className="mt-8 flex snap-x gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-5 lg:gap-6 lg:overflow-visible">
        {isPending
          ? Array.from({ length: 5 }, (_, i) => <li key={i} className="w-[170px] shrink-0 lg:w-auto"><Skeleton className="h-[255px]" /></li>)
          : data?.items.slice(0, 5).map((n) => (
              <li key={n.id} className="w-[170px] shrink-0 snap-start lg:w-auto"><NftCard nft={n} /></li>
            ))}
      </ul>
    </section>
  )
}
