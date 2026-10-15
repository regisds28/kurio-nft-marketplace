import type {
  Artwork,
  CollectionId,
  EditionId,
  EthString,
  Network,
  Order,
  Quote,
  Review,
  Wallet,
  WalletConnection,
} from '@/api/contracts'

export interface UserRecord {
  id: string
  email: string
  username: string
  displayName: string
  ensName: string
  walletNickname: string
  avatarUrl: string | null
  salt: string
  passwordHash: string
  createdAt: string
}

export interface SessionRecord {
  token: string
  userId: string
  createdAt: string
  expiresAt: string
}

export interface EditionRecord {
  id: EditionId
  supply: number | null
  available: number
}

export interface NftRecord {
  id: string
  name: string
  tokenId: string
  series: string
  priceEth: EthString
  previousPriceEth: EthString | null
  artwork: Artwork
  collectionId: CollectionId
  network: Network
  rarity: 'raro' | null
  createdAt: string
  popularity: number
  version: number
  description: string
  longDescription: string
  attributes: string[]
  creator: string
  royaltyBps: number
  contract: string
  editions: EditionRecord[]
  ratingAverage: string
  ratingCount: number
  reviews: Review[]
  featured: boolean
  maxPerOrder: number
}

export interface CartItemRecord {
  id: string
  nftId: string
  editionId: EditionId
  quantity: number
}

export interface CartRecord {
  id: string
  ownerKey: string
  items: CartItemRecord[]
  couponCode: string | null
  version: number
  updatedAt: string
}

export interface QuoteRecord extends Quote {
  ownerKey: string
}

export interface OrderRecord extends Order {
  ownerId: string
  idempotencyKey: string
  resolveAt: string | null
  outcome: 'confirmed' | 'declined'
}

export interface IdempotencyRecord {
  fingerprint: string
  orderId: string
}

export interface DbState {
  schema: number
  users: UserRecord[]
  sessions: SessionRecord[]
  nfts: NftRecord[]
  favorites: Record<string, string[]>
  carts: Record<string, CartRecord>
  quotes: Record<string, QuoteRecord>
  orders: OrderRecord[]
  idempotency: Record<string, IdempotencyRecord>
  wallets: Record<string, Wallet[]>
  connections: Record<string, WalletConnection>
  faultCounters: Record<string, number>
  seq: number
  eventSeq: number
}
