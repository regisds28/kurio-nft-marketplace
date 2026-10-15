import { Link } from '@tanstack/react-router'
import { Activity, Download, Heart, LifeBuoy, LogOut, MapPin, ShoppingBag, UserRound, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { useSession } from '@/features/session/SessionProvider'
import { notAvailable } from '@/lib/out-of-scope'
import { cn } from '@/lib/utils'

const ITEM =
  'flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-[15px] hover:bg-surface-dark hover:text-accent'

const OUT_OF_SCOPE = [
  { label: 'Endereços', Icon: MapPin },
  { label: 'Pedidos', Icon: ShoppingBag },
  { label: 'Favoritos', Icon: Heart },
  { label: 'Atividade', Icon: Activity },
  { label: 'Downloads', Icon: Download },
  { label: 'Suporte', Icon: LifeBuoy },
]

export function AccountLayout({ title, active, children }: { title: string; active: 'profile' | 'wallets'; children: ReactNode }) {
  const { logout } = useSession()
  const current = (on: boolean) => cn(ITEM, on && 'bg-surface-dark text-accent font-bold')
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-4 sm:px-6 lg:py-8 xl:px-0">
      <ScreenHeader title={title} fallback="/" />
      <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-16">
        <nav aria-label="Minha conta" className="rounded-lg bg-surface-card p-3 lg:self-start">
          <ul className="flex flex-col">
            <li>
              <Link to="/perfil" className={current(active === 'profile')} aria-current={active === 'profile' ? 'page' : undefined}>
                <UserRound className="size-5" aria-hidden="true" /> Meu perfil
              </Link>
            </li>
            <li>
              <Link to="/carteiras" className={current(active === 'wallets')} aria-current={active === 'wallets' ? 'page' : undefined}>
                <Wallet className="size-5" aria-hidden="true" /> Carteiras
              </Link>
            </li>
            {OUT_OF_SCOPE.map(({ label, Icon }) => (
              <li key={label}>
                <button type="button" className={ITEM} onClick={() => notAvailable(label)}>
                  <Icon className="size-5" aria-hidden="true" /> {label}
                </button>
              </li>
            ))}
            <li>
              <button type="button" className={ITEM} onClick={() => void logout()} data-testid="account-logout">
                <LogOut className="size-5" aria-hidden="true" /> Sair
              </button>
            </li>
          </ul>
        </nav>
        <div className="min-w-0">
          <h1 className="mb-6 hidden text-[28px] font-bold lg:block">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  )
}
