import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { AddCartItemRequest, Cart } from '@/api/contracts'
import { describeError } from '@/api/errors'
import { api } from '@/api/endpoints'
import { keys } from '@/api/keys'
import { announce } from '@/components/live-announcer'
import { useSession } from '@/features/session/SessionProvider'

export function useCart() {
  const { userKey, status } = useSession()
  return useQuery({
    queryKey: keys.cart(userKey),
    queryFn: ({ signal }) => api.cart.get({ signal }),
    enabled: status === 'guest' || status === 'authenticated',
    staleTime: 10_000,
  })
}

export function useCartCount(): number {
  return useCart().data?.itemCount ?? 0
}

function useCartKey() {
  const { userKey } = useSession()
  return { key: keys.cart(userKey), quoteKey: ['user', userKey, 'quote'] as const }
}

function useApplyCart() {
  const qc = useQueryClient()
  const { key, quoteKey } = useCartKey()
  return (cart: Cart) => {
    qc.setQueryData(key, cart)
    void qc.invalidateQueries({ queryKey: quoteKey })
  }
}

export function useAddToCart() {
  const apply = useApplyCart()
  return useMutation({
    scope: { id: 'cart' },
    mutationFn: (body: AddCartItemRequest) => api.cart.add(body),
    onSuccess: (cart) => {
      apply(cart)
      toast.success('Item adicionado ao carrinho.')
      announce('Item adicionado ao carrinho.')
    },
    onError: (error) => {
      const message = describeError(error)
      toast.error(message)
      announce(message, 'assertive')
    },
  })
}

export function useUpdateCartItem() {
  const qc = useQueryClient()
  const { key, quoteKey } = useCartKey()
  return useMutation({
    scope: { id: 'cart' },
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) => api.cart.update(itemId, quantity),
    onMutate: async ({ itemId, quantity }) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<Cart>(key)
      if (previous) {
        qc.setQueryData<Cart>(key, {
          ...previous,
          items: previous.items.map((i) => (i.id === itemId ? { ...i, quantity } : i)),
          itemCount: previous.items.reduce((n, i) => n + (i.id === itemId ? quantity : i.quantity), 0),
        })
      }
      return { previous }
    },
    onError: (error, _vars, ctx) => {
      qc.setQueryData(key, ctx?.previous)
      const message = describeError(error)
      toast.error(message)
      announce(message, 'assertive')
    },
    onSuccess: (cart) => {
      qc.setQueryData(key, cart)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: key })
      void qc.invalidateQueries({ queryKey: quoteKey })
    },
  })
}

export function useRemoveCartItem() {
  const apply = useApplyCart()
  return useMutation({
    scope: { id: 'cart' },
    mutationFn: (itemId: string) => api.cart.remove(itemId),
    onSuccess: (cart) => {
      apply(cart)
      announce('Item removido do carrinho.')
    },
    onError: (error) => {
      const message = describeError(error)
      toast.error(message)
      announce(message, 'assertive')
    },
  })
}

export function useApplyCoupon() {
  const apply = useApplyCart()
  return useMutation({
    scope: { id: 'cart' },
    mutationFn: (code: string) => api.cart.applyCoupon(code),
    onSuccess: (cart) => {
      apply(cart)
      announce(`Cupom ${cart.couponCode ?? ''} aplicado.`)
    },
  })
}

export function useRemoveCoupon() {
  const apply = useApplyCart()
  return useMutation({
    scope: { id: 'cart' },
    mutationFn: () => api.cart.removeCoupon(),
    onSuccess: (cart) => {
      apply(cart)
      announce('Cupom removido.')
    },
    onError: (error) => toast.error(describeError(error)),
  })
}
