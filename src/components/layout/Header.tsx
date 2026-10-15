import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { LogIn, LogOut, Menu, Search, ShoppingCart, User as UserIcon, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useCartCount } from '@/features/cart/hooks'
import { useSession } from '@/features/session/SessionProvider'
import { notAvailable } from '@/lib/out-of-scope'
import { cn } from '@/lib/utils'

type NavKey = 'home' | 'market' | 'creators' | 'learn'

function activeNav(pathname: string): NavKey | null {
  if (pathname === '/') return 'home'
  if (/^\/(nft|carrinho|pagamento|pedido)/.test(pathname)) return 'market'
  if (/^\/(perfil|carteiras|entrar|cadastro)/.test(pathname)) return 'home'
  return null
}

const navClass = (active: boolean) =>
  cn(
    'relative whitespace-nowrap pb-1 text-base transition-colors hover:text-accent',
    active ? 'font-bold text-accent after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:bg-primary' : 'text-foreground',
  )

export function focusCatalogSearch(): void {
  window.setTimeout(() => {
    const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('[data-catalog-search]'))
    const el = inputs.find((i) => i.offsetParent !== null) ?? inputs[0]
    el?.scrollIntoView({ block: 'center' })
    el?.focus()
  }, 60)
}

export function CartLink({ className }: { className?: string }) {
  const count = useCartCount()
  return (
    <Link
      to="/carrinho"
      aria-label={count > 0 ? `Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}` : 'Carrinho vazio'}
      className={cn('relative inline-grid size-9 place-items-center rounded-md text-foreground hover:text-accent', className)}
      data-testid="cart-link"
    >
      <ShoppingCart className="size-6" aria-hidden="true" />
      {count > 0 && (
        <span
          data-testid="cart-badge"
          className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-medium leading-none text-ink"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}

export function AccountMenu() {
  const { user, logout, status } = useSession()
  const navigate = useNavigate()
  if (status === 'loading') return <div className="skeleton h-[35px] w-[100px] rounded-md" aria-hidden="true" />
  if (!user) {
    return (
      <Button asChild size="sm" className="w-[100px] gap-1 font-medium text-base">
        <Link to="/entrar" search={{}}>
          <LogIn className="size-5" aria-hidden="true" />
          Entrar
        </Link>
      </Button>
    )
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="max-w-[160px] gap-2 font-medium text-base" data-testid="account-menu">
          <UserIcon className="size-5" aria-hidden="true" />
          <span className="truncate">{user.username}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => void navigate({ to: '/perfil' })}>
          <UserIcon className="size-4" aria-hidden="true" /> Meu perfil
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void navigate({ to: '/carteiras' })}>
          <Wallet className="size-4" aria-hidden="true" /> Carteiras
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          data-testid="logout"
          onSelect={() => {
            void logout().then(() => navigate({ to: '/' }))
          }}
        >
          <LogOut className="size-4" aria-hidden="true" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function MobileMenu() {
  const { user, logout } = useSession()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Abrir menu">
          <Menu className="size-6" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetTitle className="text-sm font-bold tracking-[1.4px]">KURIO</SheetTitle>
        <SheetDescription className="sr-only">Navegação principal</SheetDescription>
        <nav aria-label="Principal" className="flex flex-col gap-1">
          <SheetClose asChild>
            <Link to="/" className="rounded-md px-2 py-3 hover:bg-surface-dark">Início</Link>
          </SheetClose>
          <SheetClose asChild>
            <Link to="/" hash="catalogo" className="rounded-md px-2 py-3 hover:bg-surface-dark">Mercado</Link>
          </SheetClose>
          <button className="rounded-md px-2 py-3 text-left hover:bg-surface-dark" onClick={() => { close(); notAvailable('Criadores') }}>Criadores</button>
          <button className="rounded-md px-2 py-3 text-left hover:bg-surface-dark" onClick={() => { close(); notAvailable('Aprenda') }}>Aprenda</button>
        </nav>
        <div className="mt-auto flex flex-col gap-2 border-t border-border pt-4">
          {user ? (
            <>
              <p className="truncate text-sm text-muted">{user.email}</p>
              <Button variant="outline" onClick={() => { close(); void navigate({ to: '/perfil' }) }}>Meu perfil</Button>
              <Button variant="outline" onClick={() => { close(); void navigate({ to: '/carteiras' }) }}>Carteiras</Button>
              <Button onClick={() => { close(); void logout().then(() => navigate({ to: '/' })) }}>Sair</Button>
            </>
          ) : (
            <Button onClick={() => { close(); void navigate({ to: '/entrar', search: {} }) }}>Entrar</Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function Header() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const navigate = useNavigate()
  const active = activeNav(pathname)

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-4 sm:px-6 xl:px-0 lg:h-[82px]">
        <Link to="/" className="w-40 text-sm font-bold tracking-[1.4px]" aria-label="Kurio — página inicial">
          KURIO
        </Link>

        <nav aria-label="Principal" className="hidden items-start gap-10 lg:flex">
          <Link to="/" className={navClass(active === 'home')} aria-current={active === 'home' ? 'page' : undefined}>
            Início
          </Link>
          <Link to="/" hash="catalogo" className={navClass(active === 'market')} aria-current={active === 'market' ? 'page' : undefined}>
            Mercado
          </Link>
          <button type="button" className={navClass(false)} onClick={() => notAvailable('Criadores')}>
            Criadores
          </button>
          <button type="button" className={navClass(false)} onClick={() => notAvailable('Aprenda')}>
            Aprenda
          </button>
        </nav>

        <div className="flex items-center gap-2 lg:gap-7">
          <button
            type="button"
            aria-label="Buscar NFTs"
            className="grid size-9 place-items-center rounded-md hover:text-accent"
            onClick={() => {
              void navigate({ to: '/', hash: 'catalogo' }).then(focusCatalogSearch)
            }}
          >
            <Search className="size-5" aria-hidden="true" />
          </button>
          <CartLink />
          <div className="hidden lg:block">
            <AccountMenu />
          </div>
          <div className="lg:hidden">
            <MobileMenu />
          </div>
        </div>
      </div>
    </header>
  )
}
