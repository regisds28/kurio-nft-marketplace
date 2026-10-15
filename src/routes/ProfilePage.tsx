import { zodResolver } from '@hookform/resolvers/zod'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { AVATAR_MAX_BYTES, AVATAR_TYPES, passwordChangeSchema, profileSchema, type PasswordChangeInput, type ProfileInput } from '@/api/contracts'
import { toApiError } from '@/api/errors'
import { announce } from '@/components/live-announcer'
import { Field, PasswordInput } from '@/components/form-field'
import { InlineNotice } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { AccountLayout } from '@/features/account/AccountLayout'
import { useChangePassword, useRemoveAvatar, useUpdateProfile, useUploadAvatar } from '@/features/account/hooks'
import { RequireAuth } from '@/features/session/RequireAuth'
import { useSession } from '@/features/session/SessionProvider'
import { applyServerErrors } from '@/lib/form-errors'
import { useDocumentTitle } from '@/lib/use-document-title'

export function ProfilePage() {
  useDocumentTitle('Meu perfil')
  return (
    <RequireAuth>
      <AccountLayout title="Perfil do colecionador" active="profile">
        <div className="flex flex-col gap-12">
          <ProfileForm />
          <PasswordForm />
        </div>
      </AccountLayout>
    </RequireAuth>
  )
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  const upload = useUploadAvatar()
  const remove = useRemoveAvatar()
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const onFile = (file: File | undefined) => {
    setError(null)
    if (!file) return
    if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) return setError('Use uma imagem PNG, JPG ou WebP.')
    if (file.size > AVATAR_MAX_BYTES) return setError('A imagem deve ter no máximo 2 MB.')
    upload.mutate(file, {
      onSuccess: () => announce('Avatar atualizado.'),
      onError: (e) => setError(toApiError(e).message),
    })
  }
  return (
    <div className="flex items-center gap-4">
      <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-primary text-2xl font-bold text-ink">
        {url ? <img src={url} alt="Seu avatar" className="size-full object-cover" /> : <span aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>}
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-[15px] font-bold">Avatar</span>
        <div className="flex flex-wrap gap-2">
          <input ref={input} type="file" accept={AVATAR_TYPES.join(',')} className="sr-only" aria-label="Escolher imagem do avatar" data-testid="avatar-input" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = '' }} />
          <Button type="button" size="sm" variant="outline" disabled={upload.isPending} onClick={() => input.current?.click()}>
            {upload.isPending ? <><Spinner /> Enviando…</> : 'Alterar'}
          </Button>
          <Button type="button" size="sm" variant="ghost" disabled={!url || remove.isPending} onClick={() => remove.mutate(undefined, { onSuccess: () => announce('Avatar removido.'), onError: (e) => setError(toApiError(e).message) })}>
            Remover
          </Button>
        </div>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      </div>
    </div>
  )
}

function ProfileForm() {
  const { user } = useSession()
  const update = useUpdateProfile()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user!.displayName,
      username: user!.username,
      email: user!.email,
      ensName: user!.ensName,
      walletNickname: user!.walletNickname,
    },
  })
  const { errors, isDirty } = form.formState

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null)
    update.mutate(values, {
      onSuccess: (u) => {
        form.reset({ displayName: u.displayName, username: u.username, email: u.email, ensName: u.ensName, walletNickname: u.walletNickname })
        toast.success('Perfil atualizado.')
      },
      onError: (e) => setFormError(applyServerErrors(form, e)),
    })
  })

  return (
    <section aria-labelledby="profile-title" className="flex flex-col gap-6">
      <h2 id="profile-title" className="sr-only">Dados do perfil</h2>
      <Avatar name={user!.displayName} url={user!.avatarUrl} />
      <form onSubmit={(e) => void onSubmit(e)} noValidate className="grid gap-4 sm:grid-cols-2" aria-label="Perfil do colecionador">
        <Field label="Nome de exibição" required error={errors.displayName?.message}>
          {(p) => <Input {...p} autoComplete="name" {...form.register('displayName')} />}
        </Field>
        <Field label="Nome de usuário" required error={errors.username?.message}>
          {(p) => <Input {...p} autoComplete="username" {...form.register('username')} />}
        </Field>
        <Field label="E-mail" required error={errors.email?.message}>
          {(p) => <Input {...p} type="email" autoComplete="email" {...form.register('email')} />}
        </Field>
        <Field label="Nome ENS" required error={errors.ensName?.message}>
          {(p) => (
            <div className="flex">
              <span aria-hidden="true" className="grid place-items-center rounded-l-md border border-r-0 border-input bg-surface-card px-3 text-sm text-secondary">.eth</span>
              <Input {...p} className="rounded-l-none" {...form.register('ensName')} />
            </div>
          )}
        </Field>
        <Field label="Apelido da carteira" required error={errors.walletNickname?.message} className="sm:col-span-2">
          {(p) => <Input {...p} {...form.register('walletNickname')} />}
        </Field>
        {formError && <InlineNotice tone="error" role="alert" className="sm:col-span-2">{formError}</InlineNotice>}
        <div className="sm:col-span-2">
          <Button type="submit" className="h-[52px] w-full sm:h-10 sm:w-auto sm:px-10" disabled={update.isPending || !isDirty} data-testid="save-profile">
            {update.isPending ? <><Spinner /> Salvando…</> : 'Salvar'}
          </Button>
        </div>
      </form>
    </section>
  )
}

function PasswordForm() {
  const change = useChangePassword()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<PasswordChangeInput>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })
  const { errors } = form.formState
  const onSubmit = form.handleSubmit((values) => {
    setFormError(null)
    change.mutate(values, {
      onSuccess: () => {
        form.reset()
        toast.success('Senha alterada.')
      },
      onError: (e) => setFormError(applyServerErrors(form, e)),
    })
  })
  return (
    <section aria-labelledby="password-title" className="flex flex-col gap-4">
      <h2 id="password-title" className="text-xl font-bold">Alterar senha</h2>
      <form onSubmit={(e) => void onSubmit(e)} noValidate className="grid gap-4 sm:grid-cols-2" aria-labelledby="password-title">
        <Field label="Senha atual" required error={errors.currentPassword?.message} className="sm:col-span-2">
          {(p) => <PasswordInput {...p} autoComplete="current-password" {...form.register('currentPassword')} />}
        </Field>
        <Field label="Nova senha" required error={errors.newPassword?.message} hint="Mínimo de 8 caracteres, com maiúscula, minúscula e número.">
          {(p) => <PasswordInput {...p} autoComplete="new-password" {...form.register('newPassword')} />}
        </Field>
        <Field label="Confirmar nova senha" required error={errors.confirmPassword?.message}>
          {(p) => <PasswordInput {...p} autoComplete="new-password" {...form.register('confirmPassword')} />}
        </Field>
        {formError && <InlineNotice tone="error" role="alert" className="sm:col-span-2">{formError}</InlineNotice>}
        <div className="sm:col-span-2">
          <Button type="submit" variant="outline" className="h-[52px] w-full sm:h-10 sm:w-auto sm:px-10" disabled={change.isPending} data-testid="save-password">
            {change.isPending ? <><Spinner /> Alterando…</> : 'Alterar senha'}
          </Button>
        </div>
      </form>
    </section>
  )
}
