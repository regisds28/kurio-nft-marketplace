import {
  EDITION_LABEL,
  type Network,
  type Quote,
  type QuoteIssue,
  type QuoteLine,
} from '@/api/contracts'
import { addEth, percentOfEth, subEth, normalizeEth } from '@/lib/money'
import { commit, getDb, nextId } from '../db'
import { shortHash } from '../prng'
import type { CartRecord, QuoteRecord } from '../types'
import { COUPONS, normalizeCoupon, resolveItems } from './cart'

export const NETWORK_FEE: Record<Network, string> = {
  ethereum: '0.016',
  polygon: '0.002',
  solana: '0.0005',
}

const QUOTE_TTL_MS = 5 * 60_000

export function computeQuote(cart: CartRecord, network: Network, options: { persist?: boolean } = {}): QuoteRecord {
  const resolved = resolveItems(cart)
  const issues: QuoteIssue[] = []
  const lines: QuoteLine[] = []

  for (const { view } of resolved) {
    if (view.status === 'unavailable') {
      issues.push({ type: 'unavailable', itemId: view.id, message: `${view.name} (${view.editionLabel}) está esgotado.` })
      continue
    }
    if (view.status === 'insufficient') {
      issues.push({
        type: 'insufficient',
        itemId: view.id,
        message: `${view.name} (${view.editionLabel}) tem apenas ${view.maxQuantity} unidade${view.maxQuantity === 1 ? '' : 's'} disponível${view.maxQuantity === 1 ? '' : 'is'}.`,
      })
      continue
    }
    lines.push({
      itemId: view.id,
      nftId: view.nftId,
      name: view.name,
      tokenId: view.tokenId,
      artwork: view.artwork,
      editionId: view.editionId,
      editionLabel: EDITION_LABEL[view.editionId],
      unitPriceEth: view.unitPriceEth,
      quantity: view.quantity,
      lineTotalEth: view.lineTotalEth,
    })
  }

  const subtotal = addEth('0', ...lines.map((l) => l.lineTotalEth))

  let discount = '0'
  let discountLabel: string | null = null
  if (cart.couponCode) {
    const rule = COUPONS[normalizeCoupon(cart.couponCode)]
    if (!rule) issues.push({ type: 'coupon_invalid', message: 'O código promocional não é mais válido.' })
    else if (rule.kind === 'expired') issues.push({ type: 'coupon_expired', message: 'O código promocional expirou.' })
    else {
      discount = percentOfEth(subtotal, rule.percent ?? 0)
      discountLabel = rule.label
    }
  }

  const fee = lines.length > 0 ? NETWORK_FEE[network] : '0'
  const total = addEth(subEth(subtotal, discount), fee)

  const revision = shortHash(
    JSON.stringify([
      network,
      lines.map((l) => [l.itemId, l.nftId, l.editionId, l.unitPriceEth, l.quantity]),
      issues.map((i) => [i.type, i.itemId ?? null]),
      cart.couponCode,
      discount,
      fee,
      total,
    ]),
    12,
  )

  const now = Date.now()
  const quote: QuoteRecord = {
    id: options.persist === false ? 'q_preview' : nextId('q'),
    revision,
    ownerKey: cart.ownerKey,
    cartId: cart.id,
    cartVersion: cart.version,
    couponCode: cart.couponCode,
    discountLabel,
    network,
    lines,
    subtotalEth: normalizeEth(subtotal),
    discountEth: normalizeEth(discount),
    networkFeeEth: normalizeEth(fee),
    totalEth: normalizeEth(total),
    issues,
    expiresAt: new Date(now + QUOTE_TTL_MS).toISOString(),
    createdAt: new Date(now).toISOString(),
  }

  if (options.persist !== false) {
    const db = getDb()
    db.quotes[quote.id] = quote
    const ids = Object.keys(db.quotes)
    if (ids.length > 40) for (const old of ids.slice(0, ids.length - 40)) delete db.quotes[old]
    commit()
  }
  return quote
}

export function publicQuote(record: QuoteRecord): Quote {
  const { ownerKey: _owner, ...quote } = record
  return quote
}

