import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { loginSchema, registerSchema } from '@/api/contracts'
import { toApiError } from '@/api/errors'
import { Field, PasswordInput } from '@/components/form-field'
import { InlineNotice } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { env } from '@/config/env'
import { useSession } from '@/features/session/SessionProvider'
import { notAvailable } from '@/lib/out-of-scope'
import { useDocumentTitle } from '@/lib/use-document-title'
import { useIsDesktop } from '@/lib/use-media-query'
import { announce } from '@/components/live-announcer'
import type { z } from 'zod'

type LoginValues = z.infer<typeof loginSchema>
type RegisterValues = z.infer<typeof registerSchema>

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const isDesktop = useIsDesktop()
  const search = useSearch({ strict: false }) as { redirect?: string; motivo?: string }
  const navigate = useNavigate()
  const { isAuthenticated, status, notice } = useSession()
  useDocumentTitle(mode === 'login' ? 'Entrar' : 'Criar conta')

  const target = search.redirect ?? '/'
  const close = () => void navigate({ to: target })

  useEffect(() => {
    if (isAuthenticated) void navigate({ to: target, replace: true })
  }, [isAuthenticated, navigate, target])

  const expired = search.motivo === 'expirada' || notice === 'session_expired'
  const content = (
    <AuthContent mode={mode} redirect={search.redirect} expired={expired && status !== 'authenticated'} onDone={() => void navigate({ to: target, replace: true })} />
  )

  if (isDesktop) {
    return (
      <Dialog open onOpenChange={(open) => !open && close()}>
        <DialogContent className="max-w-[500px] p-0" aria-describedby="auth-desc">
          <DialogTitle className="sr-only">{mode === 'login' ? 'Entrar' : 'Criar conta'}</DialogTitle>
          <DialogDescription id="auth-desc" className="sr-only">
            {mode === 'login' ? 'Entre para gerenciar sua carteira, coleção e perfil.' : 'Crie seu perfil de colecionador.'}
          </DialogDescription>
          {content}
        </DialogContent>
      </Dialog>
    )
  }
  return <div className="mx-auto w-full max-w-[460px] px-7 pt-16 pb-12">{content}</div>
}

function AuthContent({ mode, redirect, expired, onDone }: { mode: 'login' | 'register'; redirect?: string; expired: boolean; onDone: () => void }) {
  const isLogin = mode === 'login'
  const rs = redirect ? { redirect } : {}
  const isDesktop = useIsDesktop()

  return (
    <div className="flex flex-col">
      <div className="mb-10 text-center lg:hidden">
        <p className="mb-16 text-[28px] font-bold tracking-[4px]">KURIO</p>
        <h1 className="text-base font-bold">{isLogin ? 'Entrar' : 'Criar perfil de colecionador'}</h1>
      </div>

      <div className="hidden pt-12 pb-6 lg:block" role="presentation">
        <div className="flex items-center justify-center gap-5 text-base">
          <Link to="/entrar" search={rs} replace className={isLogin ? 'font-bold text-accent' : 'text-foreground hover:text-accent'} aria-current={isLogin ? 'page' : undefined}>Entrar</Link>
          <span aria-hidden="true" className="h-5 w-px bg-border-soft" />
          <Link to="/cadastro" search={rs} replace className={!isLogin ? 'font-bold text-accent' : 'text-foreground hover:text-accent'} aria-current={!isLogin ? 'page' : undefined}>Criar conta</Link>
        </div>
        <p className="mx-auto mt-5 max-w-[404px] text-center text-sm leading-4 text-muted">
          {isLogin ? 'Entre para gerenciar sua carteira, coleção e perfil de criador.' : 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.'}
        </p>
      </div>

      <div className="lg:px-[80px]">
        {expired && (
          <InlineNotice tone="warning" role="alert" className="mb-4">
            Sua sessão expirou. Entre novamente para continuar de onde parou.
          </InlineNotice>
        )}
        {isLogin ? <LoginForm onDone={onDone} /> : <RegisterForm onDone={onDone} />}
      </div>

      <div className="mt-6 lg:px-[80px]">
        <div className="flex items-center gap-3 text-sm text-muted" role="separator" aria-label="Ou continue com">
          <span className="h-px flex-1 bg-border-soft" />
          Ou continue com
          <span className="h-px flex-1 bg-border-soft" />
        </div>
        <div className="mt-5 flex flex-col gap-3">
          {['Google', 'Apple'].map((p) => (
            <Button key={p} variant="secondary" className="h-10 w-full font-medium" onClick={() => notAvailable(`O login com ${p}`)}>
              {p}
            </Button>
          ))}
        </div>
      </div>

      {!isDesktop && (
        <p className="mt-10 text-center text-sm">
          {isLogin ? (
            <>Novo na Kurio? <Link to="/cadastro" search={rs} className="font-bold text-accent underline">Crie uma conta</Link></>
          ) : (
            <>Já tem uma conta? <Link to="/entrar" search={rs} className="font-bold text-accent underline">Entre</Link></>
          )}
        </p>
      )}
      <div className="h-6 lg:h-10" />
    </div>
  )
}

function DemoHint({ onFill }: { onFill: () => void }) {
  if (!env.enableMocks) return null
  return (
    <p className="mt-3 text-xs text-secondary" data-testid="demo-hint">
      Conta de demonstração: nova@kurio.test · Kurio#2026{' '}
      <button type="button" className="text-accent underline" onClick={onFill}>Preencher</button>
    </p>
  )
}

function LoginForm({ onDone }: { onDone: () => void }) {
  const { login } = useSession()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' }, mode: 'onSubmit' })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      await login(values)
      announce('Login realizado com sucesso.')
      onDone()
    } catch (e) {
      const err = toApiError(e)
      if (err.fields.email || err.fields.password) {
        for (const [k, v] of Object.entries(err.fields)) if (k === 'email' || k === 'password') form.setError(k, { message: v })
      } else {
        setFormError(err.fields._form ?? err.message)
      }
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3" aria-label="Entrar">
      <Field label="E-mail" error={errors.email?.message} className="gap-1.5">
        {(p) => <Input {...p} type="email" autoComplete="email" placeholder="contato@email.com" {...form.register('email')} />}
      </Field>
      <Field label="Senha" error={errors.password?.message} className="gap-1.5">
        {(p) => <PasswordInput {...p} autoComplete="current-password" placeholder="***********" {...form.register('password')} />}
      </Field>
      <button type="button" onClick={() => notAvailable('A recuperação de senha')} className="self-end text-sm text-accent hover:underline">
        Esqueceu a senha?
      </button>
      {formError && <InlineNotice tone="error" role="alert">{formError}</InlineNotice>}
      <Button type="submit" className="mt-2 h-[45px] w-full text-base max-lg:h-[60px]" disabled={isSubmitting} data-testid="submit-login">
        {isSubmitting ? <><Spinner /> Entrando…</> : 'Entrar'}
      </Button>
      <DemoHint onFill={() => { form.setValue('email', 'nova@kurio.test'); form.setValue('password', 'Kurio#2026') }} />
    </form>
  )
}

function RegisterForm({ onDone }: { onDone: () => void }) {
  const { register: signUp } = useSession()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
  })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      await signUp(values)
      announce('Conta criada com sucesso.')
      onDone()
    } catch (e) {
      const err = toApiError(e)
      const fieldNames = ['username', 'email', 'password', 'confirmPassword'] as const
      let any = false
      for (const [k, v] of Object.entries(err.fields)) {
        if ((fieldNames as readonly string[]).includes(k)) {
          form.setError(k as (typeof fieldNames)[number], { message: v })
          any = true
        }
      }
      if (!any) setFormError(err.message)
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3" aria-label="Criar conta">
      <Field label="Nome de usuário" error={errors.username?.message} className="gap-1.5">
        {(p) => <Input {...p} autoComplete="username" placeholder="Nome de usuário" {...form.register('username')} />}
      </Field>
      <Field label="E-mail" error={errors.email?.message} className="gap-1.5">
        {(p) => <Input {...p} type="email" autoComplete="email" placeholder="Digite seu e-mail" {...form.register('email')} />}
      </Field>
      <Field label="Senha" error={errors.password?.message} hint="Mínimo de 8 caracteres, com maiúscula, minúscula e número." className="gap-1.5">
        {(p) => <PasswordInput {...p} autoComplete="new-password" placeholder="Senha" {...form.register('password')} />}
      </Field>
      <Field label="Confirmar senha" error={errors.confirmPassword?.message} className="gap-1.5">
        {(p) => <PasswordInput {...p} autoComplete="new-password" placeholder="Confirmar senha" {...form.register('confirmPassword')} />}
      </Field>
      {formError && <InlineNotice tone="error" role="alert">{formError}</InlineNotice>}
      <Button type="submit" className="mt-2 h-[45px] w-full text-base max-lg:h-[60px]" disabled={isSubmitting} data-testid="submit-register">
        {isSubmitting ? <><Spinner /> Criando…</> : 'Criar conta'}
      </Button>
    </form>
  )
}
