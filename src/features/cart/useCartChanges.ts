import { useEffect, useRef, useState } from 'react'
import type { Cart } from '@/api/contracts'
import { formatEth } from '@/lib/money'
import { announce } from '@/components/live-announcer'

export function useCartChanges(cart: Cart | undefined) {
  const prev = useRef<Map<string, { price: string; status: string; available: number; name: string }>>(new Map())
  const [notes, setNotes] = useState<string[]>([])

  useEffect(() => {
    if (!cart) return
    const next = new Map(cart.items.map((i) => [i.id, { price: i.unitPriceEth, status: i.status, available: i.available, name: i.name }]))
    if (prev.current.size > 0) {
      const added: string[] = []
      for (const item of cart.items) {
        const before = prev.current.get(item.id)
        if (!before) continue
        if (before.price !== item.unitPriceEth) {
          added.push(`O preço de ${item.name} mudou de ${formatEth(before.price)} para ${formatEth(item.unitPriceEth)}.`)
        }
        if (before.status === 'ok' && item.status === 'unavailable') added.push(`${item.name} esgotou e não pode ser comprado agora.`)
        else if (before.status === 'ok' && item.status === 'insufficient') {
          added.push(`${item.name}: só restam ${item.available} unidades. Ajuste a quantidade.`)
        } else if (before.status !== 'ok' && item.status === 'ok') added.push(`${item.name} voltou a ficar disponível.`)
      }
      if (added.length) {
        setNotes((n) => [...added, ...n].slice(0, 5))
        announce(added.join(' '))
      }
    }
    prev.current = next
  }, [cart])

  return { notes, dismiss: () => setNotes([]) }
}
