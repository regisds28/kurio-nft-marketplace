import { Check, Plug, Unplug } from 'lucide-react'
import { useId } from 'react'
import {
  NETWORKS,
  NETWORK_LABEL,
  NETWORK_LONG_LABEL,
  WALLET_TYPES,
  WALLET_TYPE_LABEL,
  type Network,
  type Wallet,
  type WalletConnection,
  type WalletType,
} from '@/api/contracts'
import { toApiError } from '@/api/errors'
import { InlineNotice } from '@/components/states'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Spinner } from '@/components/ui/spinner'
import { announce } from '@/components/live-announcer'
import { useConnectWallet, useDisconnectWallet } from '@/features/wallets/hooks'
import { shortAddress } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Link } from '@tanstack/react-router'

interface Props {
  wallets: Wallet[]
  walletId: string | null
  network: Network
  provider: WalletType
  connection: WalletConnection | undefined
  onWallet: (id: string) => void
  onNetwork: (n: Network) => void
  onProvider: (p: WalletType) => void
  walletError?: string
}

const optionClass = (checked: boolean) =>
  cn(
    'flex cursor-pointer items-center gap-3 rounded-lg border bg-surface-card p-4 transition-colors',
    checked ? 'border-primary' : 'border-border hover:border-border-soft',
  )

export function WalletPanel({ wallets, walletId, network, provider, connection, onWallet, onNetwork, onProvider, walletError }: Props) {
  const uid = useId()
  const connect = useConnectWallet()
  const disconnect = useDisconnectWallet()
  const selected = wallets.find((w) => w.id === walletId)
  const isConnected = Boolean(connection?.connected && connection.walletId === walletId && connection.network === network)
  const connectedElsewhere = Boolean(connection?.connected) && !isConnected

  const doConnect = () => {
    if (!walletId) return
    connect.mutate(
      { provider, walletId, network },
      {
        onSuccess: () => announce('Carteira conectada.'),
        onError: (e) => announce(`Conexão recusada. ${toApiError(e).message}`, 'assertive'),
      },
    )
  }
  const connectError = connect.isError ? toApiError(connect.error) : null

  return (
    <div className="flex flex-col gap-8">
      <fieldset>
        <legend className="mb-3 text-base font-bold">Carteira cadastrada</legend>
        {wallets.length === 0 ? (
          <InlineNotice tone="warning">
            Você ainda não cadastrou uma carteira. <Link to="/carteiras" className="underline">Cadastrar carteira</Link>
          </InlineNotice>
        ) : (
          <RadioGroup value={walletId ?? ''} onValueChange={onWallet} aria-describedby={walletError ? `${uid}-wallet-error` : undefined} aria-label="Carteira cadastrada">
            {wallets.map((w) => (
              <label key={w.id} className={optionClass(w.id === walletId)} data-testid={`wallet-${w.role}`}>
                <RadioGroupItem value={w.id} />
                <span className="flex-1">
                  <span className="block font-bold">{w.alias}{w.alias.toLowerCase() !== (w.role === 'primary' ? 'principal' : 'reserva') && <span className="font-normal text-secondary"> ({w.role === 'primary' ? 'Principal' : 'Reserva'})</span>}</span>
                  <span className="block text-sm text-muted">{w.ensName}.eth · {shortAddress(w.address)} · {NETWORK_LONG_LABEL[w.network]}</span>
                </span>
              </label>
            ))}
          </RadioGroup>
        )}
        {walletError && <p id={`${uid}-wallet-error`} role="alert" className="mt-2 text-sm text-danger">{walletError}</p>}
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-base font-bold">Rede</legend>
        <RadioGroup value={network} onValueChange={(v) => onNetwork(v as Network)} className="grid-cols-1 sm:grid-cols-3" aria-label="Rede">
          {NETWORKS.map((n) => (
            <label key={n} className={optionClass(n === network)}>
              <RadioGroupItem value={n} />
              <span className="font-medium">{NETWORK_LABEL[n]}</span>
            </label>
          ))}
        </RadioGroup>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-base font-bold">Carteira e rede de pagamento</legend>
        <RadioGroup value={provider} onValueChange={(v) => onProvider(v as WalletType)} aria-label="Provedor da carteira">
          {WALLET_TYPES.map((p) => (
            <label key={p} className={optionClass(p === provider)}>
              <span aria-hidden="true" className="grid size-10 place-items-center rounded-full bg-primary text-lg font-bold text-ink">{WALLET_TYPE_LABEL[p][0]}</span>
              <span className="flex-1 font-medium">{WALLET_TYPE_LABEL[p]}</span>
              <RadioGroupItem value={p} />
            </label>
          ))}
        </RadioGroup>
      </fieldset>

      <div className="rounded-lg border border-border bg-surface-card p-4" data-testid="connection-panel">
        {isConnected && connection ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2" role="status">
              <Check className="size-5 text-success" aria-hidden="true" />
              <span>
                <strong>Carteira conectada</strong>
                <span className="block text-sm text-muted">
                  {WALLET_TYPE_LABEL[connection.provider ?? provider]} · {shortAddress(connection.address ?? '')} · {NETWORK_LABEL[connection.network ?? network]}
                </span>
              </span>
            </p>
            <Button variant="outline" size="sm" onClick={() => disconnect.mutate(undefined, { onSuccess: () => announce('Carteira desconectada.') })} disabled={disconnect.isPending} data-testid="disconnect-wallet">
              <Unplug className="size-4" aria-hidden="true" /> Desconectar
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted">
              {connectedElsewhere ? 'Você mudou a carteira ou a rede. Reconecte para continuar.' : selected ? `Conecte ${selected.alias} para autorizar o pagamento.` : 'Selecione uma carteira cadastrada.'}
            </p>
            {connectError && (
              <InlineNotice tone="error" role="alert">
                {connectError.code === 'wallet_rejected' ? 'A conexão foi recusada pela carteira. Você pode tentar novamente.' : connectError.message}
              </InlineNotice>
            )}
            <div className="flex flex-wrap gap-3">
              <Button onClick={doConnect} disabled={!walletId || connect.isPending} data-testid="connect-wallet">
                {connect.isPending ? <><Spinner /> Conectando…</> : <><Plug className="size-4" aria-hidden="true" /> {connectError ? 'Tentar novamente' : 'Conectar carteira'}</>}
              </Button>
              {connectedElsewhere && (
                <Button variant="outline" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>Desconectar a anterior</Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
