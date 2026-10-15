import {
  EDITION_LABEL,
  type AddCartItemRequest,
  type Cart,
  type CartItem,
} from '@/api/contracts'
import { mulEth } from '@/lib/money'
import { fail } from '../http-fail'
import { commit, getDb, nextId, nowIso } from '../db'
import type { CartItemRecord, CartRecord } from '../types'
import { findNft } from './catalog'

export interface CouponRule {
  kind: 'percent' | 'expired'
  percent?: number
  label: string
}

export const COUPONS: Record<string, CouponRule> = {
  KURIO10: { kind: 'percent', percent: 10, label: 'KURIO10 (10%)' },
  BEMVINDO5: { kind: 'percent', percent: 5, label: 'BEMVINDO5 (5%)' },
  EXPIRED20: { kind: 'expired', label: 'EXPIRED20' },
}

export function normalizeCoupon(code: string): string {
  return code.trim().toUpperCase()
}

export function validateCoupon(code: string): CouponRule {
  const rule = COUPONS[normalizeCoupon(code)]
  if (!rule) fail('coupon_invalid', 'Código promocional inválido.', { fields: { code: 'Código promocional inválido.' } })
  if (rule.kind === 'expired') fail('coupon_expired', 'Este código promocional expirou.', { fields: { code: 'Este código promocional expirou.' } })
  return rule
}

export function getCart(ownerKey: string): CartRecord {
  const db = getDb()
  let cart = db.carts[ownerKey]
  if (!cart) {
    cart = { id: `cart_${ownerKey.replace(':', '_')}`, ownerKey, items: [], couponCode: null, version: 1, updatedAt: nowIso() }
    db.carts[ownerKey] = cart
    commit()
  }
  return cart
}

function touch(cart: CartRecord): void {
  cart.version += 1
  cart.updatedAt = nowIso()
  commit()
}

export interface ResolvedItem {
  record: CartItemRecord
  view: CartItem
}

export function resolveItems(cart: CartRecord): ResolvedItem[] {
  const out: ResolvedItem[] = []
  for (const record of cart.items) {
    const nft = findNft(record.nftId)
    const edition = nft?.editions.find((e) => e.id === record.editionId)
    if (!nft || !edition) continue
    const available = edition.available
    const maxQuantity = Math.max(0, Math.min(available, nft.maxPerOrder))
    const status = available <= 0 ? 'unavailable' : record.quantity > maxQuantity ? 'insufficient' : 'ok'
    out.push({
      record,
      view: {
        id: record.id,
        nftId: nft.id,
        name: nft.name,
        tokenId: nft.tokenId,
        artwork: nft.artwork,
        editionId: record.editionId,
        editionLabel: EDITION_LABEL[record.editionId],
        unitPriceEth: nft.priceEth,
        quantity: record.quantity,
        lineTotalEth: mulEth(nft.priceEth, record.quantity),
        available,
        maxQuantity,
        status,
        nftVersion: nft.version,
      },
    })
  }
  return out
}

export function cartView(cart: CartRecord): Cart {
  const items = resolveItems(cart).map((r) => r.view)
  return {
    id: cart.id,
    items,
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    couponCode: cart.couponCode,
    version: cart.version,
    updatedAt: cart.updatedAt,
  }
}

function limitsFor(nftId: string, editionId: AddCartItemRequest['editionId']) {
  const nft = findNft(nftId)
  if (!nft) fail('not_found', 'NFT não encontrado.')
  const edition = nft.editions.find((e) => e.id === editionId)
  if (!edition) fail('validation_failed', 'Edição inválida.', { fields: { editionId: 'Edição inválida.' } })
  const max = Math.max(0, Math.min(edition.available, nft.maxPerOrder))
  return { nft, edition, max }
}

export function addItem(cart: CartRecord, input: AddCartItemRequest): CartRecord {
  const { nft, edition, max } = limitsFor(input.nftId, input.editionId)
  if (edition.available <= 0) {
    fail('availability_conflict', `A edição ${EDITION_LABEL[edition.id]} de ${nft.name} está esgotada.`, {
      details: { available: 0, max: 0, nftId: nft.id, editionId: edition.id },
    })
  }
  const existing = cart.items.find((i) => i.nftId === input.nftId && i.editionId === input.editionId)
  const nextQty = (existing?.quantity ?? 0) + input.quantity
  if (nextQty > max) {
    fail('availability_conflict', `Limite de ${max} unidade${max === 1 ? '' : 's'} por pedido para esta edição.`, {
      details: { available: edition.available, max, current: existing?.quantity ?? 0, nftId: nft.id, editionId: edition.id },
    })
  }
  if (existing) existing.quantity = nextQty
  else cart.items.push({ id: nextId('ci'), nftId: input.nftId, editionId: input.editionId, quantity: input.quantity })
  touch(cart)
  return cart
}

export function updateItem(cart: CartRecord, itemId: string, quantity: number): CartRecord {
  const item = cart.items.find((i) => i.id === itemId)
  if (!item) fail('not_found', 'Item não encontrado no carrinho.')
  const { nft, edition, max } = limitsFor(item.nftId, item.editionId)
  if (edition.available <= 0) {
    fail('availability_conflict', `A edição ${EDITION_LABEL[edition.id]} de ${nft.name} está esgotada.`, {
      details: { available: 0, max: 0, nftId: nft.id, editionId: edition.id },
    })
  }
  if (quantity > max) {
    fail('availability_conflict', `Limite de ${max} unidade${max === 1 ? '' : 's'} por pedido para esta edição.`, {
      details: { available: edition.available, max, current: item.quantity, nftId: nft.id, editionId: edition.id },
    })
  }
  item.quantity = quantity
  touch(cart)
  return cart
}

export function removeItem(cart: CartRecord, itemId: string): CartRecord {
  const before = cart.items.length
  cart.items = cart.items.filter((i) => i.id !== itemId)
  if (cart.items.length === before) fail('not_found', 'Item não encontrado no carrinho.')
  touch(cart)
  return cart
}

export function setCoupon(cart: CartRecord, code: string): CartRecord {
  validateCoupon(code)
  cart.couponCode = normalizeCoupon(code)
  touch(cart)
  return cart
}

export function clearCoupon(cart: CartRecord): CartRecord {
  cart.couponCode = null
  touch(cart)
  return cart
}

export function mergeGuestIntoUser(guestId: string, userId: string): void {
  const db = getDb()
  const guestKey = `guest:${guestId}`
  const guest = db.carts[guestKey]
  if (!guest) return
  const target = getCart(`user:${userId}`)
  for (const item of guest.items) {
    const nft = findNft(item.nftId)
    const edition = nft?.editions.find((e) => e.id === item.editionId)
    if (!nft || !edition || edition.available <= 0) continue
    const max = Math.min(edition.available, nft.maxPerOrder)
    const existing = target.items.find((i) => i.nftId === item.nftId && i.editionId === item.editionId)
    const qty = Math.min((existing?.quantity ?? 0) + item.quantity, max)
    if (existing) existing.quantity = qty
    else target.items.push({ id: nextId('ci'), nftId: item.nftId, editionId: item.editionId, quantity: qty })
  }
  if (!target.couponCode && guest.couponCode) target.couponCode = guest.couponCode
  delete db.carts[guestKey]
  touch(target)
}

export function removePurchased(
  cart: CartRecord,
  lines: Array<{ nftId: string; editionId: CartItemRecord['editionId']; quantity: number }>,
): void {
  for (const line of lines) {
    const item = cart.items.find((i) => i.nftId === line.nftId && i.editionId === line.editionId)
    if (!item) continue
    item.quantity -= line.quantity
    if (item.quantity <= 0) cart.items = cart.items.filter((i) => i.id !== item.id)
  }
  if (cart.items.length === 0) cart.couponCode = null
  touch(cart)
}
