import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { Heart, Home, ShoppingCart, User } from 'lucide-react'
import { ScanIcon } from '@/components/icons'
import { useCartCount } from '@/features/cart/hooks'
import { useSession } from '@/features/session/SessionProvider'
import { notAvailable } from '@/lib/out-of-scope'
import { cn } from '@/lib/utils'

export function TabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const navigate = useNavigate()
  const { isAuthenticated } = useSession()
  const count = useCartCount()
  const item = 'relative grid size-12 place-items-center rounded-full text-secondary'

  return (
    <nav
      aria-label="Navegação inferior"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface-card pb-[env(safe-area-inset-bottom)] lg:hidden"
      data-testid="tab-bar"
    >
      <ul className="mx-auto grid h-16 max-w-[560px] grid-cols-5 items-center px-3">
        <li className="grid place-items-center">
          <Link to="/" aria-label="Início" aria-current={pathname === '/' ? 'page' : undefined} className={cn(item, pathname === '/' && 'text-accent')}>
            <Home className="size-6" fill={pathname === '/' ? 'currentColor' : 'none'} aria-hidden="true" />
          </Link>
        </li>
        <li className="grid place-items-center">
          <button type="button" aria-label="Favoritos" className={item} onClick={() => notAvailable('A lista de favoritos')}>
            <Heart className="size-6" aria-hidden="true" />
          </button>
        </li>
        <li className="grid place-items-center">
          <button
            type="button"
            aria-label="Explorar"
            onClick={() => notAvailable('O leitor de código')}
            className="-mt-7 grid size-14 place-items-center rounded-full border-4 border-ink bg-gradient-to-br from-primary/70 to-primary text-ink"
          >
            <ScanIcon className="size-6" />
          </button>
        </li>
        <li className="grid place-items-center">
          <Link
            to="/carrinho"
            aria-label={count ? `Carrinho, ${count} itens` : 'Carrinho'}
            aria-current={pathname === '/carrinho' ? 'page' : undefined}
            className={cn(item, pathname === '/carrinho' && 'text-accent')}
          >
            <ShoppingCart className="size-6" aria-hidden="true" />
            {count > 0 && (
              <span className="absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-medium text-ink">{count}</span>
            )}
          </Link>
        </li>
        <li className="grid place-items-center">
          <button
            type="button"
            aria-label={isAuthenticated ? 'Meu perfil' : 'Entrar'}
            className={cn(item, /^\/(perfil|carteiras)/.test(pathname) && 'text-accent')}
            onClick={() => void navigate(isAuthenticated ? { to: '/perfil' } : { to: '/entrar', search: {} })}
          >
            <User className="size-6" aria-hidden="true" />
          </button>
        </li>
      </ul>
    </nav>
  )
}
