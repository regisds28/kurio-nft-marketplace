import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { NETWORK_LABEL, NETWORK_LONG_LABEL, WALLET_TYPE_LABEL, type Network, type Quote, type WalletType } from '@/api/contracts'
import { Field } from '@/components/form-field'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { NftArt } from '@/components/nft-art'
import { EmptyState, ErrorState, InlineNotice } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { useCart } from '@/features/cart/hooks'
import { attemptStore } from '@/features/checkout/attempt'
import { EMPTY_DRAFT, readDraft, writeDraft } from '@/features/checkout/draft'
import { useQuote } from '@/features/checkout/hooks'
import { QuoteChanges } from '@/features/checkout/QuoteDiff'
import { collectorSchema, formatCpf, type CollectorValues } from '@/features/checkout/schema'
import { useOrderSubmit } from '@/features/checkout/useOrderSubmit'
import { WalletPanel } from '@/features/checkout/WalletPanel'
import { usePendingOrders } from '@/features/orders/hooks'
import { RequireAuth } from '@/features/session/RequireAuth'
import { useSession } from '@/features/session/SessionProvider'
import { useWalletConnection, useWallets } from '@/features/wallets/hooks'
import { shortAddress } from '@/lib/format'
import { formatDiscount, formatEth } from '@/lib/money'
import { useDocumentTitle } from '@/lib/use-document-title'
import { cn } from '@/lib/utils'

const SHELL = 'mx-auto w-full max-w-[1200px] px-4 sm:px-6 xl:px-0'

export function CheckoutPage() {
  useDocumentTitle('Pagamento')
  return (
    <RequireAuth>
      <CheckoutInner />
    </RequireAuth>
  )
}

function Stepper({ step }: { step: 'form' | 'review' }) {
  const item = (n: number, label: string, active: boolean) => (
    <li aria-current={active ? 'step' : undefined} className={cn('flex items-center gap-2 text-sm', active ? 'font-bold text-accent' : 'text-muted')}>
      <span className={cn('grid size-6 place-items-center rounded-full text-xs', active ? 'bg-primary text-ink' : 'border border-border-soft')}>{n}</span>
      {label}
    </li>
  )
  return (
    <ol aria-label="Etapas do pagamento" className="mb-6 flex items-center gap-6">
      {item(1, 'Dados e carteira', step === 'form')}
      <li aria-hidden="true" className="h-px w-8 bg-border-soft" />
      {item(2, 'Revisão', step === 'review')}
    </ol>
  )
}

function CheckoutInner() {
  const { user } = useSession()
  const userId = user!.id
  const navigate = useNavigate()
  const cart = useCart()
  const pending = usePendingOrders()
  const wallets = useWallets()
  const connection = useWalletConnection()
  const submit = useOrderSubmit()

  const draft = useMemo(() => readDraft(userId) ?? EMPTY_DRAFT, [userId])
  const [step, setStep] = useState<'form' | 'review'>('form')
  const [network, setNetwork] = useState<Network>(draft.network)
  const [walletId, setWalletId] = useState<string | null>(draft.walletId)
  const [provider, setProvider] = useState<WalletType>('metamask')
  const [accepted, setAccepted] = useState<Quote | null>(null)
  const [walletError, setWalletError] = useState<string | undefined>()

  const quote = useQuote(network)
  const form = useForm<CollectorValues>({
    resolver: zodResolver(collectorSchema),
    defaultValues: {
      fullName: draft.fullName || user!.displayName,
      email: draft.email || user!.email,
      document: draft.document,
    },
  })
  const values = useWatch({ control: form.control })

  useEffect(() => {
    if (walletId || !wallets.data?.length) return
    const preferred = connection.data?.walletId ?? wallets.data.find((w) => w.role === 'primary')?.id ?? wallets.data[0]!.id
    setWalletId(preferred)
  }, [wallets.data, connection.data, walletId])

  useEffect(() => {
    writeDraft(userId, {
      fullName: values.fullName ?? '',
      email: values.email ?? '',
      document: values.document ?? '',
      walletId,
      network,
    })
  }, [userId, values.fullName, values.email, values.document, walletId, network])

  const checkedPending = useRef(false)
  useEffect(() => {
    if (checkedPending.current || !pending.data) return
    checkedPending.current = true
    const first = pending.data[0]
    if (first) {
      toast.info('Você tem um pedido em andamento. Acompanhe-o abaixo.')
      void navigate({ to: '/pedido/$orderId', params: { orderId: first.id }, replace: true })
    }
  }, [pending.data, navigate])

  useEffect(() => {
    if (attemptStore.read(userId)) void submit.resume()
  }, [userId])

  const cartEmpty = cart.data && cart.data.items.length === 0
  const q = quote.data
  const quoteBlocked = !q || q.issues.length > 0
  const isConnected = Boolean(connection.data?.connected && connection.data.walletId === walletId && connection.data.network === network)
  const selectedWallet = wallets.data?.find((w) => w.id === walletId)

  const staleSinceReview = step === 'review' && accepted && q && q.revision !== accepted.revision
  const submitChanges = submit.state.phase === 'changes' ? submit.state : null

  const goReview = form.handleSubmit(() => {
    let ok = true
    if (!walletId) {
      setWalletError('Selecione uma carteira cadastrada.')
      ok = false
    } else setWalletError(undefined)
    if (!isConnected) {
      toast.error('Conecte a carteira para revisar o pedido.')
      ok = false
    }
    if (!q || q.issues.length) ok = false
    if (!ok) return
    setAccepted(q!)
    setStep('review')
    window.scrollTo({ top: 0 })
  })

  const onConfirm = () => {
    if (!accepted || !walletId) return
    void submit.submit(accepted, walletId, network)
  }

  const acceptChanges = (next: Quote) => {
    setAccepted(next)
    submit.reset()
  }

  if (cart.isPending) {
    return (
      <div className={`${SHELL} py-6`} aria-busy="true" aria-label="Carregando pagamento">
        <Skeleton className="h-8 w-60" />
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_332px]">
          <Skeleton className="h-[480px]" />
          <Skeleton className="h-[388px]" />
        </div>
      </div>
    )
  }
  if (cart.isError && !cart.data) {
    return <div className={`${SHELL} py-8`}><ErrorState error={cart.error} onRetry={() => void cart.refetch()} title="Não foi possível carregar o pedido" /></div>
  }
  if (cartEmpty && submit.state.phase === 'idle' && !attemptStore.read(userId)) {
    return (
      <div className={`${SHELL} py-10`}>
        <ScreenHeader title="Pagamento com carteira" fallback="/carrinho" />
        <EmptyState title="Seu carrinho está vazio" description="Adicione NFTs ao carrinho para pagar com sua carteira." action={<Button asChild><Link to="/" hash="catalogo">Explorar NFTs</Link></Button>} />
      </div>
    )
  }

  const busy = submit.busy
  const phaseLabel =
    submit.state.phase === 'revalidating' ? 'Verificando valores…' : submit.state.phase === 'creating' ? 'Enviando pedido…' : submit.state.phase === 'recovering' ? `Sem resposta. Reenviando com segurança (${submit.state.attempt}/3)…` : null

  return (
    <div className={`${SHELL} py-4 lg:py-6`}>
      <ScreenHeader title="Pagamento com carteira" fallback="/carrinho" />
      <nav aria-label="Você está em" className="mb-3 hidden text-[15px] font-bold lg:block">
        <Link to="/" className="hover:text-accent">Início</Link> / <Link to="/" hash="catalogo" className="hover:text-accent">Mercado</Link> / <Link to="/carrinho" className="hover:text-accent">Carrinho</Link> / Pagamento
      </nav>
      <h1 className="mb-4 hidden text-[28px] font-bold lg:block">Pagamento com carteira</h1>
      <Stepper step={step} />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_332px] lg:gap-[86px]">
        <div className="min-w-0">
          {(staleSinceReview && accepted && q) && (
            <div className="mb-4">
              <QuoteChanges previous={accepted} current={q} onAccept={() => acceptChanges(q)} onBack={() => void navigate({ to: '/carrinho' })} />
            </div>
          )}
          {submitChanges && !staleSinceReview && (
            <div className="mb-4">
              <QuoteChanges previous={submitChanges.previous} current={submitChanges.current} onAccept={() => acceptChanges(submitChanges.current)} onBack={() => void navigate({ to: '/carrinho' })} />
            </div>
          )}
          {submit.state.phase === 'error' && (
            <InlineNotice tone="error" role="alert" className="mb-4">
              {submit.state.message}
              <div className="mt-2 flex gap-3">
                <Button size="sm" variant="outline" onClick={onConfirm} data-testid="retry-order">
                  {submit.state.canRetrySameAttempt ? 'Reenviar com segurança' : 'Tentar novamente'}
                </Button>
                {!submit.state.canRetrySameAttempt && <Button size="sm" variant="link" onClick={submit.reset}>Fechar aviso</Button>}
              </div>
            </InlineNotice>
          )}
          {phaseLabel && (
            <InlineNotice tone="info" role="status" className="mb-4">
              <Spinner className="mr-2 inline" /> {phaseLabel}
            </InlineNotice>
          )}

          {step === 'form' ? (
            <form onSubmit={(e) => void goReview(e)} noValidate className="flex flex-col gap-8" aria-label="Dados do pagamento">
              <section aria-labelledby="collector-title" className="flex flex-col gap-4">
                <h2 id="collector-title" className="text-base font-bold">Dados do colecionador</h2>
                <Field label="Nome completo" required error={form.formState.errors.fullName?.message}>
                  {(p) => <Input {...p} autoComplete="name" {...form.register('fullName')} />}
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="E-mail" required error={form.formState.errors.email?.message}>
                    {(p) => <Input {...p} type="email" autoComplete="email" {...form.register('email')} />}
                  </Field>
                  <Field label="CPF" required error={form.formState.errors.document?.message} hint="Dados fictícios: 529.982.247-25">
                    {(p) => (
                      <Input
                        {...p}
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="000.000.000-00"
                        {...form.register('document', { onChange: (e) => form.setValue('document', formatCpf(e.target.value)) })}
                      />
                    )}
                  </Field>
                </div>
              </section>

              <section aria-labelledby="wallet-title">
                <h2 id="wallet-title" className="sr-only">Carteira e rede</h2>
                {wallets.isPending || connection.isPending ? (
                  <Skeleton className="h-[320px]" aria-busy="true" />
                ) : wallets.isError ? (
                  <ErrorState error={wallets.error} onRetry={() => void wallets.refetch()} title="Não foi possível carregar suas carteiras" />
                ) : (
                  <WalletPanel
                    wallets={wallets.data ?? []}
                    walletId={walletId}
                    network={network}
                    provider={provider}
                    connection={connection.data}
                    onWallet={(id) => { setWalletId(id); setWalletError(undefined) }}
                    onNetwork={setNetwork}
                    onProvider={setProvider}
                    walletError={walletError}
                  />
                )}
              </section>

              <div className="flex flex-col gap-2 lg:hidden">
                <MobileTotal quote={q} loading={quote.isPending} />
              </div>
              <Button type="submit" className="h-[60px] w-full lg:h-10 lg:w-fit lg:px-8" data-testid="review-order" disabled={quoteBlocked || cartEmpty === true}>
                Revisar pedido
              </Button>
            </form>
          ) : (
            accepted && (
              <Review
                quote={accepted}
                collector={form.getValues()}
                wallet={selectedWallet ? `${selectedWallet.alias} · ${shortAddress(selectedWallet.address)}` : '—'}
                provider={WALLET_TYPE_LABEL[connection.data?.provider ?? provider]}
                network={network}
                connected={isConnected}
                onEdit={() => { setStep('form'); submit.reset() }}
              />
            )
          )}
        </div>

        <aside aria-labelledby="co-summary" className="max-lg:rounded-lg max-lg:bg-surface-card max-lg:p-4 lg:sticky lg:top-6 lg:self-start">
          <h2 id="co-summary" className="border-b border-border-soft pb-3 text-base leading-4 font-bold">Resumo da carteira</h2>
          {quote.isPending ? (
            <div className="mt-6 space-y-3" aria-busy="true"><Skeleton className="h-5" /><Skeleton className="h-5" /><Skeleton className="h-5" /></div>
          ) : quote.isError && !q ? (
            <ErrorState className="mt-4" error={quote.error} onRetry={() => void quote.refetch()} title="Não foi possível calcular o resumo" />
          ) : q ? (
            <SummaryBody quote={step === 'review' && accepted ? accepted : q} fetching={quote.isFetching} />
          ) : null}
          {q && q.issues.length > 0 && (
            <InlineNotice tone="error" role="alert" className="mt-4">
              <ul className="list-disc pl-5">{q.issues.map((i) => <li key={`${i.type}-${i.itemId ?? ''}`}>{i.message}</li>)}</ul>
              <Link to="/carrinho" className="mt-1 block underline">Ajustar carrinho</Link>
            </InlineNotice>
          )}
          {step === 'review' && (
            <Button
              className="mt-6 h-[60px] w-full lg:h-10"
              onClick={onConfirm}
              disabled={busy || !accepted || Boolean(staleSinceReview) || !isConnected || Boolean(submitChanges)}
              data-testid="confirm-order"
            >
              {busy ? <><Spinner /> {submit.state.phase === 'recovering' ? 'Reenviando…' : 'Processando…'}</> : 'Confirmar compra'}
            </Button>
          )}
          <Link to="/carrinho" className="mt-3 block text-center text-sm hover:text-accent">Voltar ao carrinho</Link>
        </aside>
      </div>
    </div>
  )
}

function SummaryBody({ quote, fetching }: { quote: Quote; fetching: boolean }) {
  return (
    <div className={cn('transition-opacity', fetching && 'opacity-70')} aria-busy={fetching}>
      <ul className="mt-4 flex flex-col gap-3" aria-label="Itens do pedido">
        {quote.lines.map((l) => (
          <li key={l.itemId} className="flex items-center gap-3 text-sm">
            <NftArt artwork={l.artwork} alt="" className="size-10 shrink-0 rounded-md" sizes="40px" />
            <span className="min-w-0 flex-1 truncate">{l.name} <span className="text-secondary">({l.editionLabel}) ×{l.quantity}</span></span>
            <span>{formatEth(l.lineTotalEth)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-5 flex flex-col gap-3 border-t border-border-soft pt-4" aria-live="polite" data-testid="checkout-summary">
        <div className="flex justify-between text-sm"><dt>Subtotal</dt><dd data-testid="co-subtotal">{formatEth(quote.subtotalEth)}</dd></div>
        <div className="flex justify-between text-sm"><dt>{quote.discountLabel ?? 'Desconto do lançamento'}</dt><dd data-testid="co-discount">{formatDiscount(quote.discountEth)}</dd></div>
        <div className="flex justify-between text-sm"><dt>Taxa de rede ({NETWORK_LABEL[quote.network]})</dt><dd data-testid="co-fee">{formatEth(quote.networkFeeEth, { minDecimals: 3 })}</dd></div>
        <div className="flex justify-between text-base font-bold"><dt>Total</dt><dd data-testid="co-total">{formatEth(quote.totalEth, { minDecimals: 3 })}</dd></div>
      </dl>
    </div>
  )
}

function MobileTotal({ quote, loading }: { quote: Quote | undefined; loading: boolean }) {
  if (loading || !quote) return <Skeleton className="h-5 w-40 self-end" />
  return <p className="text-right text-base">Total: <strong className="ml-2">{formatEth(quote.totalEth, { minDecimals: 3 })}</strong></p>
}

function Review({
  quote,
  collector,
  wallet,
  provider,
  network,
  connected,
  onEdit,
}: {
  quote: Quote
  collector: CollectorValues
  wallet: string
  provider: string
  network: Network
  connected: boolean
  onEdit: () => void
}) {
  return (
    <section aria-labelledby="review-title" className="flex flex-col gap-6" data-testid="review">
      <h2 id="review-title" className="text-base font-bold">Revise seu pedido</h2>
      <dl className="grid gap-4 rounded-lg bg-surface-card p-4 sm:grid-cols-2">
        <div><dt className="text-xs text-secondary">Colecionador</dt><dd>{collector.fullName}</dd></div>
        <div><dt className="text-xs text-secondary">E-mail</dt><dd>{collector.email}</dd></div>
        <div><dt className="text-xs text-secondary">CPF</dt><dd>{collector.document}</dd></div>
        <div><dt className="text-xs text-secondary">Rede</dt><dd>{NETWORK_LONG_LABEL[network]}</dd></div>
        <div><dt className="text-xs text-secondary">Carteira</dt><dd>{wallet}</dd></div>
        <div><dt className="text-xs text-secondary">Provedor</dt><dd>{provider} · {connected ? 'conectada' : <span className="text-danger">desconectada</span>}</dd></div>
      </dl>
      {!connected && <InlineNotice tone="error" role="alert">A carteira foi desconectada. Volte e conecte novamente para confirmar.</InlineNotice>}
      <ul className="flex flex-col gap-3" aria-label="NFTs do pedido">
        {quote.lines.map((l) => (
          <li key={l.itemId} className="flex items-center gap-4 rounded-lg bg-surface-card p-3">
            <NftArt artwork={l.artwork} alt={l.name} className="size-[70px] shrink-0 rounded-lg" sizes="70px" />
            <div className="min-w-0 flex-1">
              <p className="truncate">{l.name}</p>
              <p className="text-sm text-secondary">Edição {l.editionLabel} · ID do token: #{l.tokenId.replace(/^#/, '')}</p>
            </div>
            <p className="text-right text-sm">×{l.quantity}<br /><strong>{formatEth(l.lineTotalEth)}</strong></p>
          </li>
        ))}
      </ul>
      <Button variant="outline" className="w-fit" onClick={onEdit}>Voltar e editar</Button>
    </section>
  )
}
