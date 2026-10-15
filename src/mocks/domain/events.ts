import type { NftUpdatedPayload, OrderUpdatedPayload } from '@/api/contracts'
import { commit, mockBus, nextEventId, nowIso } from '../db'
import type { NftRecord, OrderRecord } from '../types'
import { availabilityOf, availableUnits, toEditions } from './catalog'

export function publishNftUpdate(nft: NftRecord, reason: NftUpdatedPayload['reason']): void {
  const units = availableUnits(nft)
  mockBus.emit('nft.updated', {
    eventId: nextEventId(),
    type: 'nft.updated',
    resource: { type: 'nft', id: nft.id },
    version: nft.version,
    occurredAt: nowIso(),
    payload: {
      priceEth: nft.priceEth,
      previousPriceEth: nft.previousPriceEth,
      availableUnits: units,
      availability: availabilityOf(units),
      editions: toEditions(nft).map((e) => ({ id: e.id, available: e.available })),
      reason,
    },
  })
  commit()
}

export function publishOrderUpdate(order: OrderRecord): void {
  const payload: OrderUpdatedPayload = {
    status: order.status,
    declineReason: order.declineReason,
    ownerId: order.ownerId,
  }
  mockBus.emit('order.updated', {
    eventId: nextEventId(),
    type: 'order.updated',
    resource: { type: 'order', id: order.id },
    version: order.version,
    occurredAt: nowIso(),
    payload,
  })
  commit()
}

export function mutateNft(
  nft: NftRecord,
  patch: { priceEth?: string; editions?: Partial<Record<string, number>> },
  reason: NftUpdatedPayload['reason'],
): void {
  if (patch.priceEth && patch.priceEth !== nft.priceEth) {
    nft.previousPriceEth = nft.priceEth
    nft.priceEth = patch.priceEth
  }
  if (patch.editions) {
    for (const edition of nft.editions) {
      const next = patch.editions[edition.id]
      if (typeof next === 'number') edition.available = Math.max(0, next)
    }
  }
  nft.version += 1
  publishNftUpdate(nft, reason)
}
