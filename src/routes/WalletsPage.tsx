import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import {
  NETWORKS,
  NETWORK_LONG_LABEL,
  WALLET_TYPES,
  WALLET_TYPE_LABEL,
  walletInputSchema,
  type Wallet,
  type WalletInput,
  type WalletRole,
} from '@/api/contracts'
import { Field } from '@/components/form-field'
import { ErrorState, InlineNotice } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { AccountLayout } from '@/features/account/AccountLayout'
import { RequireAuth } from '@/features/session/RequireAuth'
import { useSession } from '@/features/session/SessionProvider'
import { useSaveWallet, useWallets } from '@/features/wallets/hooks'
import { announce } from '@/components/live-announcer'
import { applyServerErrors } from '@/lib/form-errors'
import { useDocumentTitle } from '@/lib/use-document-title'

export function WalletsPage() {
  useDocumentTitle('Carteiras')
  return (
    <RequireAuth>
      <AccountLayout title="Carteiras" active="wallets">
        <WalletsContent />
      </AccountLayout>
    </RequireAuth>
  )
}

function WalletsContent() {
  const wallets = useWallets()
  const [template, setTemplate] = useState<Wallet | null>(null)
  if (wallets.isPending) return <Skeleton className="h-[520px]" aria-busy="true" aria-label="Carregando carteiras" />
  if (wallets.isError && !wallets.data) {
    return <ErrorState error={wallets.error} onRetry={() => void wallets.refetch()} title="Não foi possível carregar suas carteiras" />
  }
  const list = wallets.data ?? []
  const primary = list.find((w) => w.role === 'primary')
  const secondary = list.find((w) => w.role === 'secondary')
  return (
    <div className="flex flex-col gap-12">
      <p className="text-sm text-muted">Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.</p>
      <WalletForm key={primary?.id ?? 'new-primary'} walletRole="primary" wallet={primary} title="Carteira principal" />
      <WalletForm
        key={`${secondary?.id ?? 'new-secondary'}-${template?.updatedAt ?? ''}`}
        walletRole="secondary"
        wallet={secondary}
        title="Carteira secundária"
        template={secondary ? undefined : template}
        onSameAsPrimary={primary && !secondary ? () => setTemplate(primary) : undefined}
      />
    </div>
  )
}

function emptyValues(role: WalletRole, email: string, displayName: string): WalletInput {
  return { role, displayName, alias: '', network: 'ethereum', profileName: '', address: '', secondaryRef: '', walletType: 'metamask', referralCode: '', email, ensName: '' }
}

function WalletForm({
  walletRole: role,
  wallet,
  title,
  template,
  onSameAsPrimary,
}: {
  walletRole: WalletRole
  wallet: Wallet | undefined
  title: string
  template?: Wallet | null
  onSameAsPrimary?: () => void
}) {
  const { user } = useSession()
  const save = useSaveWallet()
  const [formError, setFormError] = useState<string | null>(null)
  const base = wallet ?? template
  const defaults: WalletInput = base
    ? {
        role,
        displayName: base.displayName,
        alias: wallet ? base.alias : `${base.alias} (2)`,
        network: base.network,
        profileName: base.profileName,
        address: wallet ? base.address : '',
        secondaryRef: base.secondaryRef,
        walletType: base.walletType,
        referralCode: base.referralCode,
        email: base.email,
        ensName: base.ensName,
      }
    : emptyValues(role, user!.email, user!.displayName)
  const form = useForm<WalletInput>({ resolver: zodResolver(walletInputSchema), defaultValues: defaults })
  const { errors, isDirty } = form.formState
  const idp = `wallet-${role}`

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null)
    save.mutate(
      { id: wallet?.id, input: values },
      {
        onSuccess: () => {
          toast.success(wallet ? 'Carteira atualizada.' : 'Carteira adicionada.')
          announce(wallet ? 'Carteira atualizada.' : 'Carteira adicionada.')
        },
        onError: (e) => setFormError(applyServerErrors(form, e)),
      },
    )
  })

  return (
    <section aria-labelledby={`${idp}-title`} data-testid={idp}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id={`${idp}-title`} className="text-xl font-bold">{title}</h2>
        {onSameAsPrimary && (
          <Button type="button" variant="outline" size="sm" onClick={onSameAsPrimary}>Igual à carteira principal</Button>
        )}
      </div>
      {!wallet && role === 'secondary' && !template && (
        <p className="mb-4 text-sm text-muted">Você ainda não adicionou uma carteira secundária.</p>
      )}
      <form onSubmit={(e) => void onSubmit(e)} noValidate className="grid gap-4 sm:grid-cols-2" aria-labelledby={`${idp}-title`}>
        <Field label="Nome de exibição" required error={errors.displayName?.message}>
          {(p) => <Input {...p} {...form.register('displayName')} />}
        </Field>
        <Field label="Apelido da carteira" required error={errors.alias?.message}>
          {(p) => <Input {...p} {...form.register('alias')} />}
        </Field>
        <Field label="Rede" required error={errors.network?.message}>
          {(p) => (
            <Controller
              control={form.control}
              name="network"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger {...p} onBlur={field.onBlur}><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {NETWORKS.map((n) => <SelectItem key={n} value={n}>{NETWORK_LONG_LABEL[n]}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          )}
        </Field>
        <Field label="Nome do perfil" required error={errors.profileName?.message}>
          {(p) => <Input {...p} {...form.register('profileName')} />}
        </Field>
        <Field label="Endereço da carteira" required error={errors.address?.message} className="sm:col-span-2">
          {(p) => <Input {...p} spellCheck={false} autoComplete="off" placeholder="0x…" {...form.register('address')} />}
        </Field>
        <Field label="ENS ou carteira secundária (opcional)" error={errors.secondaryRef?.message}>
          {(p) => <Input {...p} spellCheck={false} {...form.register('secondaryRef')} />}
        </Field>
        <Field label="Tipo de carteira" required error={errors.walletType?.message}>
          {(p) => (
            <Controller
              control={form.control}
              name="walletType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger {...p} onBlur={field.onBlur}><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {WALLET_TYPES.map((t) => <SelectItem key={t} value={t}>{WALLET_TYPE_LABEL[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          )}
        </Field>
        <Field label="Código de indicação" required error={errors.referralCode?.message}>
          {(p) => <Input {...p} autoComplete="off" {...form.register('referralCode')} />}
        </Field>
        <Field label="E-mail" required error={errors.email?.message}>
          {(p) => <Input {...p} type="email" {...form.register('email')} />}
        </Field>
        <Field label="Nome ENS" required error={errors.ensName?.message}>
          {(p) => <Input {...p} spellCheck={false} {...form.register('ensName')} />}
        </Field>
        {formError && <InlineNotice tone="error" role="alert" className="sm:col-span-2">{formError}</InlineNotice>}
        <div className="sm:col-span-2">
          <Button type="submit" className="h-[52px] w-full sm:h-10 sm:w-auto sm:px-10" disabled={save.isPending || (Boolean(wallet) && !isDirty)} data-testid={`${idp}-save`}>
            {save.isPending ? <><Spinner /> Salvando…</> : wallet ? 'Salvar carteira' : 'Adicionar'}
          </Button>
        </div>
      </form>
    </section>
  )
}
