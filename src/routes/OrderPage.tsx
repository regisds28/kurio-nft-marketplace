import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { NETWORK_LABEL, type Order } from '@/api/contracts'
import { toApiError } from '@/api/errors'
import { announce } from '@/components/live-announcer'
import { EmptyState, ErrorState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { useOrder } from '@/features/orders/hooks'
import { RequireAuth } from '@/features/session/RequireAuth'
import { shortAddress, formatDateTime } from '@/lib/format'
import { formatEth } from '@/lib/money'
import { useDocumentTitle } from '@/lib/use-document-title'
import { useSession } from '@/features/session/SessionProvider'

const SHELL = 'mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 xl:px-0'

export function OrderPage() {
  useDocumentTitle('Pedido')
  return (
    <RequireAuth>
      <OrderInner />
    </RequireAuth>
  )
}

function OrderInner() {
  const { orderId } = useParams({ from: '/pedido/$orderId' })
  const order = useOrder(orderId)
  const qc = useQueryClient()
  const { userKey } = useSession()
  const status = order.data?.status
  const synced = useRef<string | null>(null)

  useEffect(() => {
    if (!status || status === 'pending' || synced.current === `${orderId}:${status}`) return
    synced.current = `${orderId}:${status}`
    void qc.invalidateQueries({ queryKey: ['user', userKey, 'cart'] })
    void qc.invalidateQueries({ queryKey: ['user', userKey, 'orders'] })
    void qc.invalidateQueries({ queryKey: ['nfts'] })
    announce(status === 'confirmed' ? 'Compra confirmada.' : 'Pagamento recusado.', 'assertive')
  }, [status, orderId, qc, userKey])

  if (order.isPending) {
    return (
      <div className={SHELL} aria-busy="true" aria-label="Carregando pedido">
        <Skeleton className="mx-auto h-64 max-w-[578px]" />
      </div>
    )
  }
  if (order.isError && !order.data) {
    const err = toApiError(order.error)
    if (err.code === 'not_found') {
      return (
        <div className={SHELL}>
          <EmptyState title="Pedido não encontrado" description="Este pedido não existe ou não pertence à sua conta." action={<Button asChild><Link to="/">Voltar ao início</Link></Button>} />
        </div>
      )
    }
    return <div className={SHELL}><ErrorState error={order.error} onRetry={() => void order.refetch()} title="Não foi possível carregar o pedido" /></div>
  }
  const o = order.data!
  if (o.status === 'pending') return <Pending order={o} />
  if (o.status === 'declined') return <Declined order={o} />
  return <Confirmed order={o} />
}

function Pending({ order }: { order: Order }) {
  return (
    <div className={SHELL}>
      <div role="status" aria-live="polite" data-testid="order-pending" className="mx-auto flex max-w-[578px] flex-col items-center gap-4 rounded-lg border border-border bg-surface-card p-10 text-center">
        <Spinner className="size-8" />
        <h1 className="text-xl font-bold">Aguardando confirmação da rede</h1>
        <p className="text-sm text-muted">
          Estamos processando o pedido no {NETWORK_LABEL[order.network]}. Não feche esta página nem pague de novo: ela atualiza sozinha.
        </p>
        <p className="text-sm text-secondary">Total: {formatEth(order.snapshot.totalEth, { minDecimals: 3 })}</p>
      </div>
    </div>
  )
}

function Declined({ order }: { order: Order }) {
  return (
    <div className={SHELL}>
      <div role="alert" data-testid="order-declined" className="mx-auto flex max-w-[578px] flex-col items-center gap-4 rounded-lg border border-danger/50 bg-surface-card p-10 text-center">
        <h1 className="text-xl font-bold">Pagamento recusado</h1>
        <p className="text-sm text-muted">{order.declineReason ?? 'A transação foi recusada pela rede.'}</p>
        <p className="text-sm text-secondary">Nada foi cobrado e seu carrinho foi mantido.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild><Link to="/pagamento">Tentar novamente</Link></Button>
          <Button asChild variant="outline"><Link to="/carrinho">Voltar ao carrinho</Link></Button>
        </div>
      </div>
    </div>
  )
}

function Confirmed({ order }: { order: Order }) {
  const navigate = useNavigate()
  const s = order.snapshot
  const count = s.lines.reduce((n, l) => n + l.quantity, 0)
  const close = () => void navigate({ to: '/' })
  return (
    <div className={SHELL}>
      <Dialog open onOpenChange={(open) => !open && close()}>
        <DialogContent className="max-w-[578px] p-6 sm:p-8" data-testid="order-confirmed" aria-describedby="order-desc">
          <div className="flex flex-col items-center gap-3 text-center">
            <img src="/images/ui/thank-you.png" alt="" width={96} height={96} className="size-24" />
            <DialogTitle>Seus NFTs agora estão na sua carteira</DialogTitle>
            <DialogDescription id="order-desc">Compra confirmada na rede {NETWORK_LABEL[order.network]}.</DialogDescription>
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div><dt className="text-secondary">ID da transação</dt><dd className="break-all" data-testid="tx-ref">{order.txRef ? shortAddress(order.txRef, 10, 8) : '—'}</dd></div>
            <div><dt className="text-secondary">Data</dt><dd>{formatDateTime(order.updatedAt)}</dd></div>
            <div><dt className="text-secondary">Total</dt><dd>{formatEth(s.totalEth, { minDecimals: 3 })}</dd></div>
            <div><dt className="text-secondary">Carteira</dt><dd>{order.wallet.label} · {shortAddress(order.wallet.address)}</dd></div>
          </dl>
          <h3 className="mt-6 border-b border-border-soft pb-2 font-bold">Detalhes da transação</h3>
          <dl className="mt-3 flex flex-col gap-2 text-sm" data-testid="receipt">
            <div className="flex justify-between"><dt>NFTs</dt><dd>{s.lines.length}</dd></div>
            <div className="flex justify-between"><dt>Edições (x {count})</dt><dd>{formatEth(s.subtotalEth)}</dd></div>
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatEth(s.subtotalEth)}</dd></div>
            {s.couponCode && <div className="flex justify-between"><dt>Desconto ({s.couponCode})</dt><dd>-{formatEth(s.discountEth)}</dd></div>}
            <div className="flex justify-between"><dt>Taxa de rede</dt><dd>{formatEth(s.networkFeeEth, { minDecimals: 3 })}</dd></div>
            <div className="flex justify-between font-bold"><dt>Total</dt><dd>{formatEth(s.totalEth, { minDecimals: 3 })}</dd></div>
          </dl>
          <ul className="mt-4 flex flex-col gap-1 text-xs text-muted" aria-label="Itens comprados">
            {s.lines.map((l) => <li key={l.nftId + l.editionId}>{l.name} ({l.editionLabel}) ×{l.quantity}</li>)}
          </ul>
          <p className="mt-5 text-xs text-muted">Transação confirmada na rede {NETWORK_LABEL[order.network]} (simulada).</p>
          <Button asChild className="mt-4 w-full">
            <a href={order.explorerUrl ?? '#'} target="_blank" rel="noreferrer" onClick={(e) => { e.preventDefault(); void import('@/lib/out-of-scope').then((m) => m.notAvailable('O explorador de blocos')) }}>
              Ver no Etherscan <ExternalLink className="size-4" aria-hidden="true" />
            </a>
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
