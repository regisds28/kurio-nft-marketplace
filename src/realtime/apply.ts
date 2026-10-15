import type { QueryClient } from '@tanstack/react-query'
import {
  TERMINAL_ORDER_STATUS,
  type Cart,
  type NftDetail,
  type NftListResponse,
  type NftUpdatedEvent,
  type Order,
  type OrderUpdatedEvent,
  type RealtimeEvent,
} from '@/api/contracts'
import { keys } from '@/api/keys'
import { announce } from '@/components/live-announcer'
import { formatEth } from '@/lib/money'
import { toast } from 'sonner'

export class EventApplier {
  private seenEvents = new Set<string>()
  private seenOrder: string[] = []
  private versions = new Map<string, number>()

  constructor(
    private readonly qc: QueryClient,
    private readonly userKey: string,
    private readonly userId: string | null,
  ) {}

  reset(): void {
    this.seenEvents.clear()
    this.seenOrder = []
    this.versions.clear()
  }

  handle(event: RealtimeEvent): 'applied' | 'duplicate' | 'stale' | 'foreign' {
    if (this.seenEvents.has(event.eventId)) return 'duplicate'
    this.remember(event.eventId)

    if (event.type === 'order.updated' && event.payload.ownerId !== this.userId) return 'foreign'

    const rid = `${event.resource.type}:${event.resource.id}`
    const known = this.versions.get(rid) ?? 0
    if (event.version <= known) return 'stale'

    const applied = event.type === 'nft.updated' ? this.applyNft(event) : this.applyOrder(event)
    if (!applied) return 'stale'
    this.versions.set(rid, event.version)
    return 'applied'
  }

  private remember(id: string): void {
    this.seenEvents.add(id)
    this.seenOrder.push(id)
    if (this.seenOrder.length > 500) this.seenEvents.delete(this.seenOrder.shift()!)
  }

  private applyNft(event: NftUpdatedEvent): boolean {
    const { qc } = this
    const { id } = event.resource
    const p = event.payload
    let touched = false

    const detailKey = keys.nfts.detail(id)
    const detail = qc.getQueryData<NftDetail>(detailKey)
    if (detail) {
      if (event.version <= detail.version) return false
      qc.setQueryData<NftDetail>(detailKey, {
        ...detail,
        version: event.version,
        priceEth: p.priceEth,
        previousPriceEth: p.previousPriceEth,
        availableUnits: p.availableUnits,
        availability: p.availability,
        editions: detail.editions.map((e) => {
          const next = p.editions.find((x) => x.id === e.id)
          return next ? { ...e, available: next.available } : e
        }),
      })
      touched = true
    }

    for (const [key, data] of qc.getQueriesData<NftListResponse>({ queryKey: keys.nfts.lists })) {
      if (!data) continue
      let changed = false
      const items = data.items.map((item) => {
        if (item.id !== id || event.version <= item.version) return item
        changed = true
        return {
          ...item,
          version: event.version,
          priceEth: p.priceEth,
          previousPriceEth: p.previousPriceEth,
          availableUnits: p.availableUnits,
          availability: p.availability,
        }
      })
      if (changed) {
        qc.setQueryData<NftListResponse>(key, { ...data, items })
        touched = true
      }
    }

    void qc.invalidateQueries({ queryKey: ['nfts', 'related'], refetchType: 'active' })
    void qc.invalidateQueries({ queryKey: keys.nfts.featured, refetchType: 'active' })

    const cart = qc.getQueryData<Cart>(keys.cart(this.userKey))
    const inCart = cart?.items.find((i) => i.nftId === id)
    if (inCart) {
      touched = true
      void qc.invalidateQueries({ queryKey: keys.cart(this.userKey) })
      void qc.invalidateQueries({ queryKey: ['user', this.userKey, 'quote'] })
      const message = describeNftChange(inCart.name, event)
      toast.info(message, { id: `nft-${id}` })
      announce(message, 'polite')
    }
    return touched || !detail
  }

  private applyOrder(event: OrderUpdatedEvent): boolean {
    const { qc } = this
    const { id } = event.resource
    const key = keys.order(this.userKey, id)
    const current = qc.getQueryData<Order>(key)
    if (current) {
      if (event.version <= current.version) return false
      if (TERMINAL_ORDER_STATUS.has(current.status) && current.status !== event.payload.status) return false
    }
    void qc.invalidateQueries({ queryKey: key })
    void qc.invalidateQueries({ queryKey: keys.orders(this.userKey) })
    if (event.payload.status === 'confirmed') {
      void qc.invalidateQueries({ queryKey: keys.cart(this.userKey) })
      void qc.invalidateQueries({ queryKey: keys.nfts.all })
      announce('Pedido confirmado.', 'polite')
    } else if (event.payload.status === 'declined') {
      announce('Pedido recusado. Seus itens continuam no carrinho.', 'assertive')
    }
    return true
  }
}

function describeNftChange(name: string, event: NftUpdatedEvent): string {
  const p = event.payload
  switch (p.reason) {
    case 'price_changed':
      return `O preço de ${name} mudou para ${formatEth(p.priceEth)}. O resumo foi atualizado.`
    case 'sold_out':
      return `${name} esgotou. Revise seu carrinho.`
    case 'restocked':
      return `${name} voltou a ter unidades disponíveis.`
    default:
      return `A disponibilidade de ${name} mudou. O resumo foi atualizado.`
  }
}
