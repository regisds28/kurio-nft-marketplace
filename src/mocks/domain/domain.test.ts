import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CreateOrderRequest } from '@/api/contracts'
import { getDb, mockBus, resetDb } from '../db'
import { HttpFail } from '../http-fail'
import { addItem, cartView, getCart, mergeGuestIntoUser, setCoupon, updateItem } from './cart'
import { listNfts, findNft } from './catalog'
import { mutateNft } from './events'
import { createOrder, resolveOrder } from './orders'
import { computeQuote } from './quote'

const USER_ID = 'u_nova'
const OWNER = `user:${USER_ID}`

function user() {
  return getDb().users.find((u) => u.id === USER_ID)!
}

function connectWallet() {
  getDb().connections[USER_ID] = {
    connected: true,
    walletId: 'w_nova_primary',
    provider: 'metamask',
    address: '0xA91F3c5d7e9f1a2b4c6d8e0f1a2b3c4d5e6fE82C',
    network: 'ethereum',
    connectedAt: new Date().toISOString(),
  }
}

function orderBody(): CreateOrderRequest {
  const quote = computeQuote(getCart(OWNER), 'ethereum')
  return { quoteId: quote.id, walletId: 'w_nova_primary', network: 'ethereum', expectedTotalEth: quote.totalEth }
}

function expectFail(fn: () => unknown, code: string) {
  try {
    fn()
  } catch (e) {
    expect(e).toBeInstanceOf(HttpFail)
    expect((e as HttpFail).code).toBe(code)
    return
  }
  throw new Error(`esperava HttpFail(${code})`)
}

beforeEach(() => {
  vi.useFakeTimers()
  resetDb('fast')
})
afterEach(() => {
  vi.useRealTimers()
})

describe('catálogo', () => {
  it('pagina 36 NFTs em 4 páginas de 9', () => {
    const res = listNfts({})
    expect(res.total).toBe(36)
    expect(res.totalPages).toBe(4)
    expect(res.items).toHaveLength(9)
    expect(res.items[0]!.name).toBe('Emerald Ape #042')
  })

  it('busca ignora acentos e caixa', () => {
    expect(listNfts({ q: 'EMERALD ape' }).items.map((i) => i.name)).toContain('Emerald Ape #042')
    expect(listNfts({ q: 'música' }).total).toBe(listNfts({ q: 'musica' }).total)
  })

  it('combina filtros e ordena por preço', () => {
    const res = listNfts({ networks: ['ethereum'], sort: 'price_asc', pageSize: 48 })
    expect(res.items.every((i) => i.network === 'ethereum')).toBe(true)
    const prices = res.items.map((i) => Number(i.priceEth))
    expect([...prices].sort((a, b) => a - b)).toEqual(prices)
    const narrowed = listNfts({ networks: ['ethereum'], collections: ['arte-digital'], pageSize: 48 })
    expect(narrowed.total).toBeLessThanOrEqual(res.total)
  })

  it('facetas ignoram o próprio filtro', () => {
    const base = listNfts({ pageSize: 48 })
    const filtered = listNfts({ collections: ['arte-digital'], pageSize: 48 })
    expect(filtered.facets.collections.map((c) => c.count)).toEqual(base.facets.collections.map((c) => c.count))
  })

  it('devolve página válida mesmo com page fora do intervalo', () => {
    expect(listNfts({ page: 99 }).page).toBe(4)
  })
})

describe('carrinho e cotação', () => {
  it('o carrinho semeado reproduz os totais do Figma (26.83 + 0.016 = 26.846)', () => {
    const quote = computeQuote(getCart(OWNER), 'ethereum')
    expect(quote.subtotalEth).toBe('26.83')
    expect(quote.networkFeeEth).toBe('0.016')
    expect(quote.totalEth).toBe('26.846')
    expect(quote.issues).toEqual([])
  })

  it('aplica cupom e rejeita inválido/expirado', () => {
    const cart = getCart(OWNER)
    expectFail(() => setCoupon(cart, 'NAOEXISTE'), 'coupon_invalid')
    expectFail(() => setCoupon(cart, 'expired20'), 'coupon_expired')
    setCoupon(cart, 'kurio10')
    const quote = computeQuote(cart, 'ethereum')
    expect(quote.discountEth).toBe('2.683')
    expect(quote.totalEth).toBe('24.163')
  })

  it('respeita disponibilidade e limite por pedido', () => {
    const cart = getCart('guest:g1')
    const nft = getDb().nfts[0]!
    expectFail(() => addItem(cart, { nftId: nft.id, editionId: 'ed-1-1', quantity: 2 }), 'availability_conflict')
    addItem(cart, { nftId: nft.id, editionId: 'ed-1-50', quantity: 10 })
    expectFail(() => addItem(cart, { nftId: nft.id, editionId: 'ed-1-50', quantity: 1 }), 'availability_conflict')
    nft.editions.find((e) => e.id === 'ed-1-50')!.available = 0
    expect(cartView(cart).items[0]!.status).toBe('unavailable')
    expectFail(() => updateItem(cart, cart.items[0]!.id, 1), 'availability_conflict')
  })

  it('preserva os itens do visitante ao autenticar (merge respeitando limites)', () => {
    const guest = getCart('guest:g2')
    const target = getDb().nfts[3]!
    addItem(guest, { nftId: target.id, editionId: 'open', quantity: 3 })
    mergeGuestIntoUser('g2', USER_ID)
    expect(getDb().carts['guest:g2']).toBeUndefined()
    const merged = cartView(getCart(OWNER))
    expect(merged.items.find((i) => i.nftId === target.id)?.quantity).toBe(3)
    expect(merged.items).toHaveLength(4)
  })

  it('a revisão muda quando o preço muda', () => {
    const before = computeQuote(getCart(OWNER), 'ethereum', { persist: false })
    mutateNft(getDb().nfts[0]!, { priceEth: '1.29' }, 'price_changed')
    const after = computeQuote(getCart(OWNER), 'ethereum', { persist: false })
    expect(after.revision).not.toBe(before.revision)
    expect(after.totalEth).not.toBe(before.totalEth)
  })
})

describe('pedidos', () => {
  it('é idempotente: mesma chave e conteúdo devolvem o mesmo pedido', () => {
    connectWallet()
    const body = orderBody()
    const first = createOrder(user(), 'key-12345678', body)
    const second = createOrder(user(), 'key-12345678', body)
    expect(first.replayed).toBe(false)
    expect(second.replayed).toBe(true)
    expect(second.order.id).toBe(first.order.id)
    expect(getDb().orders).toHaveLength(1)
  })

  it('reutilizar a chave com conteúdo diferente gera conflito', () => {
    connectWallet()
    createOrder(user(), 'key-12345678', orderBody())
    expectFail(() => createOrder(user(), 'key-12345678', { ...orderBody(), network: 'polygon' }), 'idempotency_conflict')
  })

  it('exige Idempotency-Key e carteira conectada', () => {
    expectFail(() => createOrder(user(), null, orderBody()), 'bad_request')
    expectFail(() => createOrder(user(), 'key-12345678', orderBody()), 'wallet_not_connected')
  })

  it('cotação desatualizada gera 409 com a cotação atual', () => {
    connectWallet()
    const body = orderBody()
    mutateNft(getDb().nfts[0]!, { priceEth: '1.50' }, 'price_changed')
    try {
      createOrder(user(), 'key-stale-01', body)
      throw new Error('deveria falhar')
    } catch (e) {
      expect((e as HttpFail).code).toBe('quote_stale')
      expect((e as HttpFail).details).toHaveProperty('currentQuote')
    }
    expect(getDb().orders).toHaveLength(0)
  })

  it('confirma: baixa estoque, remove só o comprado do carrinho e é terminal', () => {
    connectWallet()
    const emerald = findNft('nft-001')!
    const stockBefore = emerald.editions.find((e) => e.id === 'ed-1-50')!.available
    const { order } = createOrder(user(), 'key-confirm-1', orderBody())
    expect(order.status).toBe('pending')
    const events: string[] = []
    mockBus.on('order.updated', (e) => events.push(`${e.payload.status}@${e.version}`))
    const confirmed = resolveOrder(order.id)!
    expect(confirmed.status).toBe('confirmed')
    expect(confirmed.txRef).toMatch(/^0x[0-9a-f]{64}$/)
    expect(emerald.editions.find((e) => e.id === 'ed-1-50')!.available).toBe(stockBefore - 2)
    expect(cartView(getCart(OWNER)).items).toHaveLength(0)
    expect(events).toEqual(['confirmed@2'])

    const again = resolveOrder(order.id)!
    expect(again.version).toBe(2)
    expect(events).toHaveLength(1)
  })

  it('o recibo é um snapshot: mudanças posteriores no catálogo não o alteram', () => {
    connectWallet()
    const { order } = createOrder(user(), 'key-snap-001', orderBody())
    resolveOrder(order.id)
    const total = order.snapshot.totalEth
    mutateNft(findNft('nft-001')!, { priceEth: '9.99' }, 'price_changed')
    expect(getDb().orders[0]!.snapshot.totalEth).toBe(total)
    expect(getDb().orders[0]!.snapshot.lines[0]!.unitPriceEth).toBe('1.19')
  })

  it('pagamento recusado vira pedido terminal sem baixar estoque', () => {
    resetDb('fast,payment-declined')
    connectWallet()
    const emerald = findNft('nft-001')!
    const stock = emerald.editions.find((e) => e.id === 'ed-1-50')!.available
    const { order } = createOrder(user(), 'key-decl-001', orderBody())
    const declined = resolveOrder(order.id)!
    expect(declined.status).toBe('declined')
    expect(declined.declineReason).toBeTruthy()
    expect(emerald.editions.find((e) => e.id === 'ed-1-50')!.available).toBe(stock)
    expect(cartView(getCart(OWNER)).items).toHaveLength(3)
  })
})
