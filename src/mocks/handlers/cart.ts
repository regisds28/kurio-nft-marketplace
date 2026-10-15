import {
  addCartItemSchema,
  couponSchema,
  quoteRequestSchema,
  updateCartItemSchema,
} from '@/api/contracts'
import { fail } from '../http-fail'
import { addItem, cartView, clearCoupon, getCart, removeItem, setCoupon, updateItem } from '../domain/cart'
import { computeQuote, publicQuote } from '../domain/quote'
import { route, HttpResponse } from '../route'
import { parseBody } from './helpers'

function owner(ownerKey: string | null): string {
  if (!ownerKey) fail('bad_request', 'Carrinho não identificado (envie X-Guest-Cart ou autentique-se).')
  return ownerKey
}

export const cartHandlers = [
  route('GET', '/api/cart', ({ ownerKey }) => HttpResponse.json(cartView(getCart(owner(ownerKey))))),

  route('POST', '/api/cart/items', async ({ ownerKey, json }) => {
    const body = parseBody(addCartItemSchema, await json())
    const cart = addItem(getCart(owner(ownerKey)), body)
    return HttpResponse.json(cartView(cart), { status: 201 })
  }),

  route('PATCH', '/api/cart/items/:itemId', async ({ ownerKey, params, json }) => {
    const body = parseBody(updateCartItemSchema, await json())
    return HttpResponse.json(cartView(updateItem(getCart(owner(ownerKey)), params.itemId!, body.quantity)))
  }),

  route('DELETE', '/api/cart/items/:itemId', ({ ownerKey, params }) =>
    HttpResponse.json(cartView(removeItem(getCart(owner(ownerKey)), params.itemId!))),
  ),

  route('PUT', '/api/cart/coupon', async ({ ownerKey, json }) => {
    const body = parseBody(couponSchema, await json())
    return HttpResponse.json(cartView(setCoupon(getCart(owner(ownerKey)), body.code)))
  }),

  route('DELETE', '/api/cart/coupon', ({ ownerKey }) =>
    HttpResponse.json(cartView(clearCoupon(getCart(owner(ownerKey))))),
  ),

  route('POST', '/api/quotes', async ({ ownerKey, json }) => {
    const raw = await json<Record<string, unknown>>().catch(() => ({}))
    const body = parseBody(quoteRequestSchema, raw)
    const quote = computeQuote(getCart(owner(ownerKey)), body.network)
    return HttpResponse.json(publicQuote(quote))
  }),
]
