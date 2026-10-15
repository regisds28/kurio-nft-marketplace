import { z } from 'zod'
import type { EthString } from '@/lib/money'

export type { EthString }

export const ERROR_CODES = {
  validation_failed: 422,
  session_invalid: 401,
  session_expired: 401,
  invalid_credentials: 401,
  forbidden: 403,
  not_found: 404,
  email_taken: 409,
  username_taken: 409,
  availability_conflict: 409,
  quote_stale: 409,
  idempotency_conflict: 409,
  wallet_not_connected: 409,
  coupon_invalid: 422,
  coupon_expired: 422,
  wallet_rejected: 403,
  payload_too_large: 413,
  service_unavailable: 503,
  internal_error: 500,
  bad_request: 400,
} as const

export type ErrorCode = keyof typeof ERROR_CODES

export interface ApiErrorBody {
  error: {
    code: ErrorCode
    message: string
    fields?: Record<string, string>
    details?: unknown
    retryable?: boolean
  }
}

export const NETWORKS = ['ethereum', 'polygon', 'solana'] as const
export type Network = (typeof NETWORKS)[number]
export const NETWORK_LABEL: Record<Network, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}
export const NETWORK_LONG_LABEL: Record<Network, string> = {
  ethereum: 'Ethereum Mainnet',
  polygon: 'Rede Polygon',
  solana: 'Solana Mainnet',
}

export const COLLECTIONS = [
  { id: 'arte-digital', name: 'Arte digital' },
  { id: 'fotografia', name: 'Fotografia' },
  { id: 'musica', name: 'Música' },
  { id: 'arte-3d', name: 'Arte 3D' },
  { id: 'colecionaveis', name: 'Colecionáveis' },
  { id: 'generativa', name: 'Generativa' },
  { id: 'jogos', name: 'Jogos' },
  { id: 'assinaturas', name: 'Assinaturas' },
  { id: 'utilidade', name: 'Utilidade' },
] as const
export type CollectionId = (typeof COLLECTIONS)[number]['id']
export const COLLECTION_IDS = COLLECTIONS.map((c) => c.id) as [CollectionId, ...CollectionId[]]

export const ARTWORKS = ['ape', 'sage', 'noir', 'amber'] as const
export type Artwork = (typeof ARTWORKS)[number]

export const EDITION_IDS = ['ed-1-1', 'ed-1-10', 'ed-1-50', 'open'] as const
export type EditionId = (typeof EDITION_IDS)[number]
export const EDITION_LABEL: Record<EditionId, string> = {
  'ed-1-1': '1/1',
  'ed-1-10': '1/10',
  'ed-1-50': '1/50',
  open: 'ABERTA',
}

export interface EditionOption {
  id: EditionId
  label: string
  supply: number | null
  available: number
}

export type AvailabilityStatus = 'available' | 'low' | 'sold_out'

export interface NftSummary {
  id: string
  name: string
  tokenId: string
  priceEth: EthString
  previousPriceEth: EthString | null
  artwork: Artwork
  collectionId: CollectionId
  collectionName: string
  series: string
  network: Network
  rarity: 'raro' | null
  availableUnits: number
  availability: AvailabilityStatus
  createdAt: string
  popularity: number
  version: number
}

export interface Review {
  id: string
  author: string
  rating: number
  comment: string
  createdAt: string
}

export interface GalleryImage {
  id: string
  artwork: Artwork
  alt: string
}

export interface NftDetail extends NftSummary {
  description: string
  longDescription: string
  attributes: string[]
  creator: string
  royaltyBps: number
  contract: string
  editions: EditionOption[]
  gallery: GalleryImage[]
  rating: { average: string; count: number }
  reviews: Review[]
  maxPerOrder: number
}

export const SORT_OPTIONS = ['recent', 'price_asc', 'price_desc', 'name', 'popular'] as const
export type SortOption = (typeof SORT_OPTIONS)[number]
export const SORT_LABEL: Record<SortOption, string> = {
  recent: 'Listados recentemente',
  price_asc: 'Menor preço',
  price_desc: 'Maior preço',
  name: 'Nome (A–Z)',
  popular: 'Mais populares',
}

export const CATALOG_TABS = ['all', 'new', 'trending'] as const
export type CatalogTab = (typeof CATALOG_TABS)[number]
export const CATALOG_TAB_LABEL: Record<CatalogTab, string> = {
  all: 'Todos os NFTs',
  new: 'Novos lançamentos',
  trending: 'Em alta',
}

export const PAGE_SIZE = 9

export interface NftListParams {
  q?: string
  collections?: CollectionId[]
  networks?: Network[]
  minPrice?: EthString
  maxPrice?: EthString
  sort?: SortOption
  tab?: CatalogTab
  page?: number
  pageSize?: number
}

export interface FacetEntry<T extends string = string> {
  id: T
  name: string
  count: number
}

export interface NftListResponse {
  items: NftSummary[]
  page: number
  pageSize: number
  total: number
  totalPages: number
  facets: { collections: FacetEntry<CollectionId>[]; networks: FacetEntry<Network>[] }
  priceBounds: { min: EthString; max: EthString }
}

export interface FeaturedResponse {
  hero: NftSummary[]
  spotlight: NftSummary
}

export interface EditorialPost {
  id: string
  dateLabel: string
  readMinutes: number
  title: string
  excerpt: string
  artwork: Artwork
}

export interface User {
  id: string
  email: string
  username: string
  displayName: string
  ensName: string
  walletNickname: string
  avatarUrl: string | null
  createdAt: string
}

export interface SessionResponse {
  user: User
  expiresAt: string
}

export interface AuthResponse extends SessionResponse {
  token: string
}

const PASSWORD_RULE = z
  .string()
  .min(8, 'Use pelo menos 8 caracteres')
  .regex(/[a-z]/, 'Inclua uma letra minúscula')
  .regex(/[A-Z]/, 'Inclua uma letra maiúscula')
  .regex(/\d/, 'Inclua um número')

const EMAIL_RULE = z.string().trim().min(1, 'Informe o e-mail').email('E-mail inválido')
const USERNAME_RULE = z
  .string()
  .trim()
  .min(3, 'Use pelo menos 3 caracteres')
  .max(24, 'Use no máximo 24 caracteres')
  .regex(/^[a-zA-Z0-9._-]+$/, 'Use apenas letras, números, ponto, hífen e sublinhado')

export const loginSchema = z.object({
  email: EMAIL_RULE,
  password: z.string().min(1, 'Informe a senha'),
})
export type LoginRequest = z.infer<typeof loginSchema> & { guestCartId?: string }

export const registerSchema = z
  .object({
    username: USERNAME_RULE,
    email: EMAIL_RULE,
    password: PASSWORD_RULE,
    confirmPassword: z.string().min(1, 'Confirme a senha'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem',
  })
export type RegisterRequest = z.infer<typeof registerSchema> & { guestCartId?: string }

export interface FavoritesResponse {
  nftIds: string[]
}

export type CartItemStatus = 'ok' | 'unavailable' | 'insufficient'

export interface CartItem {
  id: string
  nftId: string
  name: string
  tokenId: string
  artwork: Artwork
  editionId: EditionId
  editionLabel: string
  unitPriceEth: EthString
  quantity: number
  lineTotalEth: EthString
  available: number
  maxQuantity: number
  status: CartItemStatus
  nftVersion: number
}

export interface Cart {
  id: string
  items: CartItem[]
  itemCount: number
  couponCode: string | null
  version: number
  updatedAt: string
}

export const addCartItemSchema = z.object({
  nftId: z.string().min(1),
  editionId: z.enum(EDITION_IDS),
  quantity: z.number().int().min(1, 'Quantidade mínima: 1'),
})
export type AddCartItemRequest = z.infer<typeof addCartItemSchema>

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1, 'Quantidade mínima: 1'),
})
export type UpdateCartItemRequest = z.infer<typeof updateCartItemSchema>

export const couponSchema = z.object({
  code: z.string().trim().min(1, 'Informe o código promocional').max(32),
})
export type CouponRequest = z.infer<typeof couponSchema>

export type QuoteIssueType = 'unavailable' | 'insufficient' | 'coupon_invalid' | 'coupon_expired'

export interface QuoteIssue {
  type: QuoteIssueType
  itemId?: string
  message: string
}

export interface QuoteLine {
  itemId: string
  nftId: string
  name: string
  tokenId: string
  artwork: Artwork
  editionId: EditionId
  editionLabel: string
  unitPriceEth: EthString
  quantity: number
  lineTotalEth: EthString
}

export interface Quote {
  id: string
  revision: string
  cartId: string
  cartVersion: number
  couponCode: string | null
  discountLabel: string | null
  network: Network
  lines: QuoteLine[]
  subtotalEth: EthString
  discountEth: EthString
  networkFeeEth: EthString
  totalEth: EthString
  issues: QuoteIssue[]
  expiresAt: string
  createdAt: string
}

export const quoteRequestSchema = z.object({
  network: z.enum(NETWORKS).default('ethereum'),
})
export type QuoteRequest = { network?: Network }

export const WALLET_TYPES = ['metamask', 'walletconnect', 'coinbase'] as const
export type WalletType = (typeof WALLET_TYPES)[number]
export const WALLET_TYPE_LABEL: Record<WalletType, string> = {
  metamask: 'MetaMask',
  walletconnect: 'WalletConnect',
  coinbase: 'Coinbase Wallet',
}

export type WalletRole = 'primary' | 'secondary'

export interface Wallet {
  id: string
  role: WalletRole
  displayName: string
  alias: string
  network: Network
  profileName: string
  address: string
  secondaryRef: string
  walletType: WalletType
  referralCode: string
  email: string
  ensName: string
  updatedAt: string
}

export interface WalletsResponse {
  wallets: Wallet[]
}

const ADDRESS_RULE = z
  .string()
  .trim()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Endereço inválido: use 0x seguido de 40 caracteres hexadecimais')

export const walletInputSchema = z.object({
  role: z.enum(['primary', 'secondary']),
  displayName: z.string().trim().min(2, 'Informe o nome de exibição').max(40),
  alias: z.string().trim().min(2, 'Informe o apelido da carteira').max(40),
  network: z.enum(NETWORKS, { message: 'Selecione uma rede' }),
  profileName: z.string().trim().min(2, 'Informe o nome do perfil').max(40),
  address: ADDRESS_RULE,
  secondaryRef: z
    .string()
    .trim()
    .max(80)
    .refine((v) => v === '' || /^0x[a-fA-F0-9]{40}$/.test(v) || /^[a-z0-9-]+(\.[a-z0-9-]+)*\.eth$/i.test(v), {
      message: 'Use um endereço 0x válido ou um nome .eth',
    }),
  walletType: z.enum(WALLET_TYPES, { message: 'Selecione uma carteira' }),
  referralCode: z
    .string()
    .trim()
    .min(4, 'Código de indicação muito curto')
    .max(16)
    .regex(/^[A-Za-z0-9-]+$/, 'Use apenas letras, números e hífen'),
  email: EMAIL_RULE,
  ensName: z
    .string()
    .trim()
    .min(3, 'Informe o nome ENS')
    .max(40)
    .regex(/^[a-z0-9-]+(\.[a-z0-9-]+)*$/i, 'Nome ENS inválido'),
})
export type WalletInput = z.infer<typeof walletInputSchema>

export interface WalletConnection {
  connected: boolean
  walletId: string | null
  provider: WalletType | null
  address: string | null
  network: Network | null
  connectedAt: string | null
}

export const connectWalletSchema = z.object({
  provider: z.enum(WALLET_TYPES),
  walletId: z.string().min(1),
  network: z.enum(NETWORKS),
})
export type ConnectWalletRequest = z.infer<typeof connectWalletSchema>

export const profileSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe o nome de exibição').max(40, 'Use no máximo 40 caracteres'),
  username: USERNAME_RULE,
  email: EMAIL_RULE,
  ensName: z
    .string()
    .trim()
    .min(3, 'Informe o nome ENS')
    .max(40)
    .regex(/^[a-z0-9-]+(\.[a-z0-9-]+)*$/i, 'Nome ENS inválido'),
  walletNickname: z.string().trim().min(2, 'Informe o apelido da carteira').max(40),
})
export type ProfileInput = z.infer<typeof profileSchema>

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual'),
    newPassword: PASSWORD_RULE,
    confirmPassword: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem',
  })
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024
export const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const

export type OrderStatus = 'pending' | 'confirmed' | 'declined'
export const TERMINAL_ORDER_STATUS: ReadonlySet<OrderStatus> = new Set(['confirmed', 'declined'])

export interface OrderLine {
  nftId: string
  name: string
  tokenId: string
  artwork: Artwork
  editionId: EditionId
  editionLabel: string
  quantity: number
  unitPriceEth: EthString
  lineTotalEth: EthString
}

export interface OrderSnapshot {
  lines: OrderLine[]
  subtotalEth: EthString
  discountEth: EthString
  networkFeeEth: EthString
  totalEth: EthString
  couponCode: string | null
}

export interface Order {
  id: string
  status: OrderStatus
  version: number
  createdAt: string
  updatedAt: string
  network: Network
  wallet: { id: string; label: string; address: string; provider: WalletType }
  snapshot: OrderSnapshot
  txRef: string | null
  explorerUrl: string | null
  declineReason: string | null
}

export const createOrderSchema = z.object({
  quoteId: z.string().min(1),
  walletId: z.string().min(1),
  network: z.enum(NETWORKS),
  expectedTotalEth: z.string().regex(/^\d+(\.\d{1,18})?$/),
})
export type CreateOrderRequest = z.infer<typeof createOrderSchema>

export interface OrdersListResponse {
  orders: Order[]
}

export const IDEMPOTENCY_HEADER = 'Idempotency-Key'
export const GUEST_HEADER = 'X-Guest-Cart'

export const SOCKET_EVENTS = {
  nftUpdated: 'nft.updated',
  orderUpdated: 'order.updated',
  authenticate: 'session.authenticate',
  authenticated: 'session.authenticated',
  rejected: 'session.rejected',
} as const

interface BaseEvent<T extends string, R extends string, P> {
  eventId: string
  type: T
  resource: { type: R; id: string }
  version: number
  occurredAt: string
  payload: P
}

export interface NftUpdatedPayload {
  priceEth: EthString
  previousPriceEth: EthString | null
  availableUnits: number
  availability: AvailabilityStatus
  editions: Array<{ id: EditionId; available: number }>
  reason: 'price_changed' | 'availability_changed' | 'sold_out' | 'restocked'
}

export type NftUpdatedEvent = BaseEvent<'nft.updated', 'nft', NftUpdatedPayload>

export interface OrderUpdatedPayload {
  status: OrderStatus
  declineReason: string | null
  ownerId: string
}

export type OrderUpdatedEvent = BaseEvent<'order.updated', 'order', OrderUpdatedPayload>

export type RealtimeEvent = NftUpdatedEvent | OrderUpdatedEvent

export interface AuthenticatePayload {
  token: string | null
}
