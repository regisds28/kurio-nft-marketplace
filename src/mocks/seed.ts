import {
  COLLECTIONS,
  EDITION_IDS,
  type Artwork,
  type CollectionId,
  type EditionId,
  type EditorialPost,
  type Network,
  type Review,
  type Wallet,
} from '@/api/contracts'
import { mulberry32, shortHash } from './prng'
import { sha256Hex } from './sha256'
import type { DbState, EditionRecord, NftRecord, UserRecord } from './types'

export const SCHEMA_VERSION = 3

export const SEED_NOW = '2026-07-29T12:00:00.000Z'
const SEED_NOW_MS = Date.parse(SEED_NOW)

export const DEMO_PASSWORD = 'Kurio#2026'

export function hashPassword(salt: string, password: string): string {
  return sha256Hex(`${salt}:${password}`)
}

function user(partial: Omit<UserRecord, 'salt' | 'passwordHash'> & { salt: string }): UserRecord {
  return { ...partial, passwordHash: hashPassword(partial.salt, DEMO_PASSWORD) }
}

export const SEED_USERS: UserRecord[] = [
  user({
    id: 'u_nova',
    email: 'nova@kurio.test',
    username: 'novasato',
    displayName: 'Nova Sato',
    ensName: 'nova.kurio',
    walletNickname: 'Principal',
    avatarUrl: null,
    salt: 'a1f9c2',
    createdAt: '2026-03-02T10:00:00.000Z',
  }),
  user({
    id: 'u_rafael',
    email: 'rafael@kurio.test',
    username: 'rafaelm',
    displayName: 'Rafael Moura',
    ensName: 'rafael.kurio',
    walletNickname: 'Cofre',
    avatarUrl: null,
    salt: 'b7d310',
    createdAt: '2026-04-18T15:30:00.000Z',
  }),
]

const ADJECTIVES = ['Emerald', 'Sage', 'Neon', 'Cosmic', 'Violet', 'Ivory', 'Golden', 'Crimson', 'Azure', 'Amber', 'Onyx', 'Coral']
const NOUNS: Array<{ noun: string; artwork: Artwork; series: string; traits: string[] }> = [
  { noun: 'Ape', artwork: 'ape', series: 'Kurio Apes', traits: ['Óculos', 'Jaqueta', 'Raro'] },
  { noun: 'Nomad', artwork: 'sage', series: 'Kurio Nomads', traits: ['Chapéu', 'Capuz', 'Sereno'] },
  { noun: 'Vessel', artwork: 'noir', series: 'Kurio Vessels', traits: ['Gola alta', 'Blazer', 'Noturno'] },
  { noun: 'Bloom', artwork: 'sage', series: 'Kurio Blooms', traits: ['Chapéu', 'Pétalas', 'Luminoso'] },
  { noun: 'Baron', artwork: 'noir', series: 'Kurio Barons', traits: ['Brinco', 'Marfim', 'Elegante'] },
  { noun: 'Beat', artwork: 'amber', series: 'Kurio Beats', traits: ['Fones', 'Ritmo', 'Dourado'] },
  { noun: 'Signal', artwork: 'amber', series: 'Kurio Signals', traits: ['Fones', 'Sinal', 'Dourado'] },
  { noun: 'Relic', artwork: 'ape', series: 'Kurio Relics', traits: ['Óculos', 'Colar', 'Antigo'] },
  { noun: 'Oracle', artwork: 'noir', series: 'Kurio Oracles', traits: ['Olhar', 'Gola alta', 'Místico'] },
  { noun: 'Drift', artwork: 'amber', series: 'Kurio Drifts', traits: ['Fones', 'Jaqueta', 'Livre'] },
]

const NETWORK_CYCLE: Network[] = ['ethereum', 'ethereum', 'polygon', 'solana', 'ethereum', 'polygon', 'solana', 'ethereum']

interface Handmade {
  name: string
  tokenId: string
  price: string
  prev?: string
  noun: string
  collectionId: CollectionId
  network: Network
  rarity?: boolean
  popularity: number
  attributes?: string[]
}

const HANDMADE: Handmade[] = [
  { name: 'Emerald Ape #042', tokenId: '0042', price: '1.19', noun: 'Ape', collectionId: 'arte-digital', network: 'ethereum', rarity: true, popularity: 940, attributes: ['Óculos', 'Esmeralda', 'Raro'] },
  { name: 'Sage Nomad #009', tokenId: '0009', price: '1.69', noun: 'Nomad', collectionId: 'fotografia', network: 'polygon', popularity: 610 },
  { name: 'Neon Vessel #552', tokenId: '0552', price: '1.99', prev: '2.29', noun: 'Vessel', collectionId: 'generativa', network: 'ethereum', popularity: 880 },
  { name: 'Cosmic Bloom #118', tokenId: '0118', price: '1.29', noun: 'Bloom', collectionId: 'arte-3d', network: 'solana', rarity: true, popularity: 450 },
  { name: 'Violet Nomad #314', tokenId: '0314', price: '1.39', noun: 'Nomad', collectionId: 'arte-digital', network: 'ethereum', popularity: 720 },
  { name: 'Ivory Baron #088', tokenId: '0088', price: '1.79', noun: 'Baron', collectionId: 'colecionaveis', network: 'polygon', popularity: 530 },
  { name: 'Golden Beat #207', tokenId: '0207', price: '0.99', noun: 'Beat', collectionId: 'musica', network: 'ethereum', popularity: 990 },
  { name: 'Amber Beat #073', tokenId: '0073', price: '0.69', noun: 'Beat', collectionId: 'musica', network: 'solana', popularity: 300 },
  { name: 'Golden Signal #160', tokenId: '0160', price: '0.39', noun: 'Signal', collectionId: 'utilidade', network: 'polygon', popularity: 410 },
]

const LONG_DESCRIPTION =
  '{name} é uma obra digital finalizada à mão da coleção Kurio Editions. Cada atributo fica armazenado nos metadados do token e verificado na rede. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras. A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. Nova Sato recebe 5% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.'

const SHORT_DESCRIPTION =
  'Um colecionável digital finalizado à mão da coleção Kurio Editions, verificado na {network}, com arte desbloqueável e acesso para colecionadores.'

const NETWORK_NAME: Record<Network, string> = { ethereum: 'Ethereum', polygon: 'Polygon', solana: 'Solana' }

const REVIEWERS = ['Marina K.', 'Diego A.', 'Helena V.', 'Tomás R.', 'Aiko S.', 'Bruno L.']
const REVIEW_TEXT = [
  'Arte impecável e metadados bem organizados. Entrega rápida na carteira.',
  'Procedência clara e royalties transparentes. Recomendo a coleção.',
  'Os detalhes da pelagem ao vivo são ainda melhores do que na prévia.',
  'Processo de compra tranquilo, a confirmação chegou em segundos.',
  'Edição limitada que valoriza o acervo. Vale cada ETH.',
  'Boa curadoria da Kurio; já estou de olho no próximo lançamento.',
]

function buildReviews(id: string, count: number): Review[] {
  const rng = mulberry32(parseInt(shortHash(id, 6), 16))
  return Array.from({ length: Math.min(5, count) }, (_, i) => ({
    id: `rev_${id}_${i + 1}`,
    author: REVIEWERS[Math.floor(rng() * REVIEWERS.length)]!,
    rating: rng() > 0.25 ? 5 : 4,
    comment: REVIEW_TEXT[Math.floor(rng() * REVIEW_TEXT.length)]!,
    createdAt: new Date(SEED_NOW_MS - (i + 2) * 86_400_000 * 3).toISOString(),
  }))
}

function buildEditions(rng: () => number, forceFirst: boolean): EditionRecord[] {
  const base: Record<EditionId, EditionRecord> = {
    'ed-1-1': { id: 'ed-1-1', supply: 1, available: rng() > 0.55 ? 1 : 0 },
    'ed-1-10': { id: 'ed-1-10', supply: 10, available: Math.floor(rng() * 9) + 1 },
    'ed-1-50': { id: 'ed-1-50', supply: 50, available: Math.floor(rng() * 40) + 6 },
    open: { id: 'open', supply: null, available: 40 + Math.floor(rng() * 400) },
  }
  if (forceFirst) {
    base['ed-1-1'].available = 1
    base['ed-1-10'].available = 8
    base['ed-1-50'].available = 24
    base.open.available = 120
  }
  return EDITION_IDS.map((id) => base[id])
}

function priceString(rng: () => number): string {
  const cents = 20 + Math.floor(rng() * 300)
  return (cents / 100).toFixed(2)
}

function buildNfts(): NftRecord[] {
  const rng = mulberry32(2026)
  const nouns = new Map(NOUNS.map((n) => [n.noun, n]))
  const used = new Set<string>(HANDMADE.map((h) => h.name))
  const records: NftRecord[] = []

  const total = 36
  for (let i = 0; i < total; i++) {
    let name: string
    let tokenId: string
    let price: string
    let prev: string | null = null
    let nounInfo: (typeof NOUNS)[number]
    let collectionId: CollectionId
    let network: Network
    let rarity = false
    let popularity: number
    let attributes: string[]

    const hand = HANDMADE[i]
    if (hand) {
      nounInfo = nouns.get(hand.noun)!
      name = hand.name
      tokenId = hand.tokenId
      price = hand.price
      prev = hand.prev ?? null
      collectionId = hand.collectionId
      network = hand.network
      rarity = hand.rarity ?? false
      popularity = hand.popularity
      attributes = hand.attributes ?? nounInfo.traits
    } else {
      nounInfo = NOUNS[Math.floor(rng() * NOUNS.length)]!
      const adj = ADJECTIVES[Math.floor(rng() * ADJECTIVES.length)]!
      let n = 0
      do {
        n = 1 + Math.floor(rng() * 899)
        name = `${adj} ${nounInfo.noun} #${String(n).padStart(3, '0')}`
      } while (used.has(name))
      used.add(name)
      tokenId = String(n).padStart(4, '0')
      price = priceString(rng)
      if (rng() > 0.82) prev = (Number(price) + 0.3).toFixed(2)
      collectionId = COLLECTIONS[Math.floor(rng() * COLLECTIONS.length)]!.id
      network = NETWORK_CYCLE[Math.floor(rng() * NETWORK_CYCLE.length)]!
      rarity = rng() > 0.8
      popularity = 50 + Math.floor(rng() * 940)
      attributes = nounInfo.traits
    }

    const id = `nft-${String(i + 1).padStart(3, '0')}`
    const editions = buildEditions(rng, i === 0)
    const createdAt = new Date(SEED_NOW_MS - i * 31 * 3_600_000).toISOString()
    const ratingCount = i === 0 ? 19 : 4 + Math.floor(rng() * 40)
    const ratingAverage = i === 0 ? '4.8' : (4 + rng() * 0.9).toFixed(1)

    records.push({
      id,
      name,
      tokenId,
      series: nounInfo.series,
      priceEth: price,
      previousPriceEth: prev,
      artwork: nounInfo.artwork,
      collectionId,
      network,
      rarity: rarity ? 'raro' : null,
      createdAt,
      popularity,
      version: 1,
      description: SHORT_DESCRIPTION.replace('{network}', NETWORK_NAME[network]),
      longDescription: LONG_DESCRIPTION.replace('{name}', name),
      attributes,
      creator: 'Nova Sato',
      royaltyBps: 500,
      contract: `0x7A42${shortHash(id, 32)}19E8`.slice(0, 42),
      editions,
      ratingAverage,
      ratingCount,
      reviews: buildReviews(id, ratingCount),
      featured: i < 3 || i === 12,
      maxPerOrder: 10,
    })
  }
  return records
}

export const NOVA_PRIMARY_ADDRESS = '0xA91F3c5d7e9f1a2b4c6d8e0f1a2b3c4d5e6fE82C'
export const NOVA_SECONDARY_ADDRESS = '0x4B2c8d1e6f7a9b0c3d5e2f1a8b7c6d9e0f1a2b3C'
export const RAFAEL_PRIMARY_ADDRESS = '0x9D3e7a1b5c2f8e4d6a0b9c1d3e5f7a2b4c6d8E0F'

function wallets(): Record<string, Wallet[]> {
  const at = SEED_NOW
  return {
    u_nova: [
      {
        id: 'w_nova_primary',
        role: 'primary',
        displayName: 'Nova Sato',
        alias: 'Principal',
        network: 'ethereum',
        profileName: 'nova.sato',
        address: NOVA_PRIMARY_ADDRESS,
        secondaryRef: '',
        walletType: 'metamask',
        referralCode: 'NOVA-2026',
        email: 'nova@kurio.test',
        ensName: 'nova.kurio',
        updatedAt: at,
      },
      {
        id: 'w_nova_secondary',
        role: 'secondary',
        displayName: 'Nova Sato',
        alias: 'Reserva',
        network: 'polygon',
        profileName: 'nova.reserva',
        address: NOVA_SECONDARY_ADDRESS,
        secondaryRef: 'nova.kurio.eth',
        walletType: 'walletconnect',
        referralCode: 'NOVA-RSV',
        email: 'nova@kurio.test',
        ensName: 'nova.kurio',
        updatedAt: at,
      },
    ],
    u_rafael: [
      {
        id: 'w_rafael_primary',
        role: 'primary',
        displayName: 'Rafael Moura',
        alias: 'Cofre',
        network: 'ethereum',
        profileName: 'rafael.m',
        address: RAFAEL_PRIMARY_ADDRESS,
        secondaryRef: '',
        walletType: 'coinbase',
        referralCode: 'RAFA-2026',
        email: 'rafael@kurio.test',
        ensName: 'rafael.kurio',
        updatedAt: at,
      },
    ],
  }
}

export const EDITORIAL_POSTS: EditorialPost[] = [
  { id: 'post-1', dateLabel: '12 de setembro', readMinutes: 6, title: 'Como funciona a propriedade de NFTs', excerpt: 'Aprenda a colecionar, negociar e verificar ativos digitais.', artwork: 'noir' },
  { id: 'post-2', dateLabel: '13 de setembro', readMinutes: 2, title: '10 artistas digitais para acompanhar', excerpt: 'Conheça criadores que moldam a cultura digital.', artwork: 'ape' },
  { id: 'post-3', dateLabel: '15 de setembro', readMinutes: 3, title: 'Raridade, atributos e procedência', excerpt: 'Entenda raridade, procedência, direitos autorais e utilidade.', artwork: 'sage' },
  { id: 'post-4', dateLabel: '15 de setembro', readMinutes: 2, title: 'Como proteger sua carteira', excerpt: 'Proteja sua carteira, seus ativos e sua identidade.', artwork: 'amber' },
]

export function createSeedState(): DbState {
  const nfts = buildNfts()
  const byName = (name: string) => nfts.find((n) => n.name === name)!

  const emerald = byName('Emerald Ape #042')
  const violet = byName('Violet Nomad #314')
  const ivory = byName('Ivory Baron #088')
  const novaCart = {
    id: 'cart_u_nova',
    ownerKey: 'user:u_nova',
    items: [
      { id: 'ci_seed_1', nftId: emerald.id, editionId: 'ed-1-50' as EditionId, quantity: 2 },
      { id: 'ci_seed_2', nftId: violet.id, editionId: 'ed-1-50' as EditionId, quantity: 6 },
      { id: 'ci_seed_3', nftId: ivory.id, editionId: 'open' as EditionId, quantity: 9 },
    ],
    couponCode: null,
    version: 1,
    updatedAt: SEED_NOW,
  }
  for (const [nft, ed, min] of [
    [emerald, 'ed-1-50', 24],
    [violet, 'ed-1-50', 24],
    [ivory, 'open', 120],
  ] as const) {
    const e = nft.editions.find((x) => x.id === ed)!
    e.available = Math.max(e.available, min)
  }

  return {
    schema: SCHEMA_VERSION,
    users: SEED_USERS.map((u) => ({ ...u })),
    sessions: [],
    nfts,
    favorites: { u_nova: [emerald.id, byName('Golden Beat #207').id], u_rafael: [byName('Neon Vessel #552').id] },
    carts: { [novaCart.ownerKey]: novaCart },
    quotes: {},
    orders: [],
    idempotency: {},
    wallets: wallets(),
    connections: {},
    faultCounters: {},
    seq: 100,
    eventSeq: 0,
  }
}
