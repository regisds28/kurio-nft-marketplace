import { Outlet, createRootRoute, createRoute, createRouter, lazyRouteComponent } from '@tanstack/react-router'
import { RootLayout } from './RootLayout'
import { HomePage } from '@/routes/HomePage'
import { NotFoundPage } from '@/routes/NotFoundPage'
import { parseHomeSearch, type HomeSearch } from '@/routes/home-search'
import { Skeleton } from '@/components/ui/skeleton'

export function safeRedirect(value: unknown): string | undefined {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\') ? value : undefined
}

const authSearch = (raw: Record<string, unknown>): { redirect?: string; motivo?: string } => {
  const redirect = safeRedirect(raw.redirect)
  const motivo = raw.motivo === 'expirada' ? 'expirada' : undefined
  return { ...(redirect ? { redirect } : {}), ...(motivo ? { motivo } : {}) }
}

const rootRoute = createRootRoute({ component: RootLayout, notFoundComponent: NotFoundPage })

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: (raw: Record<string, unknown>): HomeSearch => parseHomeSearch(raw),
  component: HomePage,
})

const nftRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/nft/$nftId',
  component: lazyRouteComponent(() => import('@/routes/NftDetailPage'), 'NftDetailPage'),
})

const cartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/carrinho',
  component: lazyRouteComponent(() => import('@/routes/CartPage'), 'CartPage'),
})

const checkoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pagamento',
  component: lazyRouteComponent(() => import('@/routes/CheckoutPage'), 'CheckoutPage'),
})

const orderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pedido/$orderId',
  component: lazyRouteComponent(() => import('@/routes/OrderPage'), 'OrderPage'),
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/entrar',
  validateSearch: authSearch,
  component: lazyRouteComponent(() => import('@/routes/AuthPage').then((m) => ({ default: () => <m.AuthPage mode="login" /> })), 'default'),
})

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cadastro',
  validateSearch: authSearch,
  component: lazyRouteComponent(() => import('@/routes/AuthPage').then((m) => ({ default: () => <m.AuthPage mode="register" /> })), 'default'),
})

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/perfil',
  component: lazyRouteComponent(() => import('@/routes/ProfilePage'), 'ProfilePage'),
})

const walletsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/carteiras',
  component: lazyRouteComponent(() => import('@/routes/WalletsPage'), 'WalletsPage'),
})

const marketRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/mercado',
  beforeLoad: ({ search }) => {
    throw redirectToCatalog(search)
  },
  component: Outlet,
})

import { redirect } from '@tanstack/react-router'
function redirectToCatalog(search: unknown) {
  return redirect({ to: '/', search: parseHomeSearch((search ?? {}) as Record<string, unknown>), hash: 'catalogo', replace: true })
}

const routeTree = rootRoute.addChildren([
  indexRoute,
  marketRoute,
  nftRoute,
  cartRoute,
  checkoutRoute,
  orderRoute,
  loginRoute,
  registerRoute,
  profileRoute,
  walletsRoute,
])

function PendingPage() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 xl:px-0" aria-busy="true" aria-label="Carregando página">
      <Skeleton className="h-6 w-60" />
      <Skeleton className="mt-6 h-[360px] w-full" />
    </div>
  )
}

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultPendingComponent: PendingPage,
  defaultPendingMs: 150,
  scrollRestoration: true,
  defaultNotFoundComponent: NotFoundPage,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
