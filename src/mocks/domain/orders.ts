import {
  createOrderSchema,
  type CreateOrderRequest,
  type EditionId,
  type Order,
  type WalletType,
} from '@/api/contracts'
import { addEth, eqEth } from '@/lib/money'
import { commit, getDb, getScenario, nextId, nowIso } from '../db'
import { fail, fieldsFromZod, validationFail } from '../http-fail'
import { hex } from '../prng'
import type { OrderRecord, UserRecord } from '../types'
import { getCart, removePurchased } from './cart'
import { findNft } from './catalog'
import { mutateNft, publishNftUpdate, publishOrderUpdate } from './events'
import { computeQuote, publicQuote } from './quote'

export const DECLINE_REASON = 'Pagamento recusado pela carteira (simulação).'

export function publicOrder(order: OrderRecord): Order {
  const { ownerId: _o, idempotencyKey: _k, resolveAt: _r, outcome: _out, ...rest } = order
  return rest
}

export function orderFingerprint(body: CreateOrderRequest): string {
  return JSON.stringify([body.quoteId, body.walletId, body.network, body.expectedTotalEth])
}

export function once(key: string): boolean {
  const db = getDb()
  if (db.faultCounters[key]) return false
  db.faultCounters[key] = 1
  commit()
  return true
}

export interface CreateOrderResult {
  order: OrderRecord
  replayed: boolean
  hang: boolean
}

export function createOrder(user: UserRecord, idempotencyKey: string | null, rawBody: unknown): CreateOrderResult {
  if (!idempotencyKey || idempotencyKey.length < 8) {
    fail('bad_request', 'Cabeçalho Idempotency-Key obrigatório (mínimo de 8 caracteres).')
  }
  const parsed = createOrderSchema.safeParse(rawBody)
  if (!parsed.success) validationFail(fieldsFromZod(parsed.error.issues))
  const body = parsed.data
  const db = getDb()
  const scenario = getScenario()
  const storeKey = `${user.id}:${idempotencyKey}`

  const prior = db.idempotency[storeKey]
  if (prior) {
    if (prior.fingerprint !== orderFingerprint(body)) {
      fail('idempotency_conflict', 'Esta Idempotency-Key já foi usada com um conteúdo diferente.')
    }
    const existing = db.orders.find((o) => o.id === prior.orderId)
    if (existing) return { order: existing, replayed: true, hang: false }
  }

  const cart = getCart(`user:${user.id}`)
  if (cart.items.length === 0) fail('validation_failed', 'Seu carrinho está vazio.', { fields: { _form: 'Seu carrinho está vazio.' } })

  if (scenario.checkout.priceChangeOnCreate && once('checkout:price-change')) {
    const first = cart.items[0]
    const nft = first && findNft(first.nftId)
    if (nft) mutateNft(nft, { priceEth: addEth(nft.priceEth, '0.1') }, 'price_changed')
  }
  if (scenario.checkout.soldOutOnCreate && once('checkout:sold-out')) {
    const first = cart.items[0]
    const nft = first && findNft(first.nftId)
    if (nft && first) mutateNft(nft, { editions: { [first.editionId]: 0 } }, 'sold_out')
  }

  const quoted = db.quotes[body.quoteId]
  const current = computeQuote(cart, body.network)
  if (!quoted || quoted.ownerKey !== `user:${user.id}` || quoted.revision !== current.revision || !eqEth(body.expectedTotalEth, current.totalEth)) {
    fail('quote_stale', 'Os valores mudaram desde a sua revisão. Revise e confirme novamente.', {
      details: { currentQuote: publicQuote(current) },
    })
  }
  if (current.issues.length > 0) {
    fail('availability_conflict', current.issues[0]!.message, { details: { currentQuote: publicQuote(current) } })
  }

  const connection = db.connections[user.id]
  const wallet = db.wallets[user.id]?.find((w) => w.id === body.walletId)
  if (!wallet) fail('validation_failed', 'Carteira não encontrada.', { fields: { walletId: 'Selecione uma carteira cadastrada.' } })
  if (!connection?.connected || connection.walletId !== wallet.id) {
    fail('wallet_not_connected', 'Conecte a carteira selecionada antes de confirmar a compra.')
  }

  const now = nowIso()
  const order: OrderRecord = {
    id: nextId('ord'),
    status: 'pending',
    version: 1,
    createdAt: now,
    updatedAt: now,
    network: body.network,
    wallet: {
      id: wallet.id,
      label: wallet.alias,
      address: wallet.address,
      provider: (connection.provider ?? wallet.walletType) as WalletType,
    },
    snapshot: {
      lines: current.lines.map((l) => ({
        nftId: l.nftId,
        name: l.name,
        tokenId: l.tokenId,
        artwork: l.artwork,
        editionId: l.editionId,
        editionLabel: l.editionLabel,
        quantity: l.quantity,
        unitPriceEth: l.unitPriceEth,
        lineTotalEth: l.lineTotalEth,
      })),
      subtotalEth: current.subtotalEth,
      discountEth: current.discountEth,
      networkFeeEth: current.networkFeeEth,
      totalEth: current.totalEth,
      couponCode: current.couponCode,
    },
    txRef: null,
    explorerUrl: null,
    declineReason: null,
    ownerId: user.id,
    idempotencyKey,
    resolveAt: new Date(Date.now() + scenario.checkout.confirmDelayMs).toISOString(),
    outcome: scenario.checkout.paymentOutcome,
  }
  db.orders.push(order)
  db.idempotency[storeKey] = { fingerprint: orderFingerprint(body), orderId: order.id }
  commit()
  scheduleResolution(order)
  publishOrderUpdate(order)

  const hang = scenario.checkout.hangAfterCreate && once(`checkout:hang:${storeKey}`)
  return { order, replayed: false, hang }
}

const timers = new Map<string, ReturnType<typeof setTimeout>>()

export function scheduleResolution(order: OrderRecord): void {
  if (order.status !== 'pending' || !order.resolveAt) return
  if (timers.has(order.id)) return
  const wait = Math.max(0, Date.parse(order.resolveAt) - Date.now())
  timers.set(
    order.id,
    setTimeout(() => {
      timers.delete(order.id)
      resolveOrder(order.id)
    }, wait),
  )
}

export function resolveOrder(orderId: string): OrderRecord | undefined {
  const db = getDb()
  const order = db.orders.find((o) => o.id === orderId)
  if (!order || order.status !== 'pending') return order

  order.updatedAt = nowIso()
  order.resolveAt = null
  order.version += 1

  if (order.outcome === 'declined') {
    order.status = 'declined'
    order.declineReason = DECLINE_REASON
    commit()
    publishOrderUpdate(order)
    return order
  }

  order.status = 'confirmed'
  order.txRef = `0x${hex(order.id, 64)}`
  order.explorerUrl = `https://etherscan.io/tx/${order.txRef}`
  const cart = getCart(`user:${order.ownerId}`)
  const purchased: Array<{ nftId: string; editionId: EditionId; quantity: number }> = []

  for (const line of order.snapshot.lines) {
    const nft = findNft(line.nftId)
    const edition = nft?.editions.find((e) => e.id === line.editionId)
    if (!nft || !edition) continue
    edition.available = Math.max(0, edition.available - line.quantity)
    nft.version += 1
    purchased.push({ nftId: nft.id, editionId: edition.id, quantity: line.quantity })
    publishNftUpdate(nft, edition.available === 0 ? 'sold_out' : 'availability_changed')
  }
  removePurchased(cart, purchased)
  commit()
  publishOrderUpdate(order)
  return order
}

export function resolveDueOrders(): void {
  const db = getDb()
  const now = Date.now()
  for (const order of db.orders) {
    if (order.status === 'pending' && order.resolveAt && Date.parse(order.resolveAt) <= now) resolveOrder(order.id)
  }
}

export function resumePendingOrders(): void {
  for (const order of getDb().orders) if (order.status === 'pending') scheduleResolution(order)
}

export function ordersOf(userId: string): OrderRecord[] {
  return getDb().orders.filter((o) => o.ownerId === userId)
}

