import type {
  AddCartItemRequest,
  AuthResponse,
  Cart,
  ConnectWalletRequest,
  CreateOrderRequest,
  EditorialPost,
  FavoritesResponse,
  FeaturedResponse,
  LoginRequest,
  NftDetail,
  NftListParams,
  NftListResponse,
  NftSummary,
  Order,
  OrderStatus,
  OrdersListResponse,
  PasswordChangeInput,
  ProfileInput,
  Quote,
  RegisterRequest,
  SessionResponse,
  User,
  Wallet,
  WalletConnection,
  WalletInput,
  WalletsResponse,
  Network,
} from './contracts'
import { IDEMPOTENCY_HEADER } from './contracts'
import { http, type RequestOptions } from './http'

type Opts = RequestOptions & { signal?: AbortSignal }

function listQuery(p: NftListParams): Record<string, string> {
  const q: Record<string, string> = {}
  if (p.q) q.q = p.q
  if (p.collections?.length) q.collections = p.collections.join(',')
  if (p.networks?.length) q.networks = p.networks.join(',')
  if (p.minPrice) q.minPrice = p.minPrice
  if (p.maxPrice) q.maxPrice = p.maxPrice
  if (p.sort) q.sort = p.sort
  if (p.tab && p.tab !== 'all') q.tab = p.tab
  if (p.page && p.page > 1) q.page = String(p.page)
  if (p.pageSize) q.pageSize = String(p.pageSize)
  return q
}

export const api = {
  auth: {
    login: (body: LoginRequest) =>
      http.post<AuthResponse>('/auth/login', body, { skipAuthHandling: true }).then((r) => r.data),
    register: (body: RegisterRequest) =>
      http.post<AuthResponse>('/auth/register', body, { skipAuthHandling: true }).then((r) => r.data),
    logout: () => http.post('/auth/logout', null, { skipAuthHandling: true }).then(() => undefined),
    session: (opts: Opts = {}) => http.get<SessionResponse>('/session', opts).then((r) => r.data),
  },

  nfts: {
    list: (params: NftListParams, opts: Opts = {}) =>
      http.get<NftListResponse>('/nfts', { ...opts, params: listQuery(params) }).then((r) => r.data),
    featured: (opts: Opts = {}) => http.get<FeaturedResponse>('/nfts/featured', opts).then((r) => r.data),
    detail: (id: string, opts: Opts = {}) =>
      http.get<NftDetail>(`/nfts/${encodeURIComponent(id)}`, opts).then((r) => r.data),
    related: (id: string, opts: Opts = {}) =>
      http
        .get<{ items: NftSummary[] }>(`/nfts/${encodeURIComponent(id)}/related`, opts)
        .then((r) => r.data.items),
  },

  editorial: {
    posts: (opts: Opts = {}) =>
      http.get<{ items: EditorialPost[] }>('/editorial/posts', opts).then((r) => r.data.items),
  },

  favorites: {
    list: (opts: Opts = {}) => http.get<FavoritesResponse>('/favorites', opts).then((r) => r.data),
    add: (nftId: string) => http.put<FavoritesResponse>(`/favorites/${encodeURIComponent(nftId)}`).then((r) => r.data),
    remove: (nftId: string) =>
      http.delete<FavoritesResponse>(`/favorites/${encodeURIComponent(nftId)}`).then((r) => r.data),
  },

  cart: {
    get: (opts: Opts = {}) => http.get<Cart>('/cart', opts).then((r) => r.data),
    add: (body: AddCartItemRequest) => http.post<Cart>('/cart/items', body).then((r) => r.data),
    update: (itemId: string, quantity: number) =>
      http.patch<Cart>(`/cart/items/${encodeURIComponent(itemId)}`, { quantity }).then((r) => r.data),
    remove: (itemId: string) => http.delete<Cart>(`/cart/items/${encodeURIComponent(itemId)}`).then((r) => r.data),
    applyCoupon: (code: string) => http.put<Cart>('/cart/coupon', { code }).then((r) => r.data),
    removeCoupon: () => http.delete<Cart>('/cart/coupon').then((r) => r.data),
  },

  quotes: {
    create: (network: Network, opts: Opts = {}) =>
      http.post<Quote>('/quotes', { network }, opts).then((r) => r.data),
  },

  orders: {
    create: (body: CreateOrderRequest, idempotencyKey: string, opts: RequestOptions = {}) =>
      http
        .post<Order>('/orders', body, { ...opts, headers: { [IDEMPOTENCY_HEADER]: idempotencyKey } })
        .then((r) => r.data),
    get: (id: string, opts: Opts = {}) => http.get<Order>(`/orders/${encodeURIComponent(id)}`, opts).then((r) => r.data),
    list: (status?: OrderStatus, opts: Opts = {}) =>
      http
        .get<OrdersListResponse>('/orders', { ...opts, params: status ? { status } : undefined })
        .then((r) => r.data.orders),
  },

  profile: {
    get: (opts: Opts = {}) => http.get<User>('/profile', opts).then((r) => r.data),
    update: (body: ProfileInput) => http.patch<User>('/profile', body).then((r) => r.data),
    changePassword: (body: PasswordChangeInput) => http.put('/profile/password', body).then(() => undefined),
    uploadAvatar: (file: File) => {
      const form = new FormData()
      form.set('avatar', file)
      return http.post<User>('/profile/avatar', form).then((r) => r.data)
    },
    removeAvatar: () => http.delete<User>('/profile/avatar').then((r) => r.data),
  },

  wallets: {
    list: (opts: Opts = {}) => http.get<WalletsResponse>('/wallets', opts).then((r) => r.data.wallets),
    create: (body: WalletInput) => http.post<Wallet>('/wallets', body).then((r) => r.data),
    update: (id: string, body: WalletInput) => http.put<Wallet>(`/wallets/${encodeURIComponent(id)}`, body).then((r) => r.data),
    connection: (opts: Opts = {}) => http.get<WalletConnection>('/wallet-connection', opts).then((r) => r.data),
    connect: (body: ConnectWalletRequest) => http.post<WalletConnection>('/wallet-connection', body).then((r) => r.data),
    disconnect: () => http.delete('/wallet-connection').then(() => undefined),
  },
}
