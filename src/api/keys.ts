import type { NftListParams, Network } from './contracts'

export const keys = {
  nfts: {
    all: ['nfts'] as const,
    lists: ['nfts', 'list'] as const,
    list: (params: NftListParams) => ['nfts', 'list', params] as const,
    featured: ['nfts', 'featured'] as const,
    detail: (id: string) => ['nfts', 'detail', id] as const,
    related: (id: string) => ['nfts', 'related', id] as const,
  },
  editorial: ['editorial'] as const,
  private: ['user'] as const,
  user: (userKey: string) => ['user', userKey] as const,
  session: (userKey: string) => ['user', userKey, 'session'] as const,
  favorites: (userKey: string) => ['user', userKey, 'favorites'] as const,
  cart: (userKey: string) => ['user', userKey, 'cart'] as const,
  quote: (userKey: string, network: Network) => ['user', userKey, 'quote', network] as const,
  orders: (userKey: string) => ['user', userKey, 'orders'] as const,
  pendingOrders: (userKey: string) => ['user', userKey, 'orders', 'pending'] as const,
  order: (userKey: string, id: string) => ['user', userKey, 'orders', 'detail', id] as const,
  profile: (userKey: string) => ['user', userKey, 'profile'] as const,
  wallets: (userKey: string) => ['user', userKey, 'wallets'] as const,
  connection: (userKey: string) => ['user', userKey, 'wallet-connection'] as const,
}
