import { IDEMPOTENCY_HEADER, type OrdersListResponse, type OrderStatus } from '@/api/contracts'
import { delay } from 'msw'
import { fail } from '../http-fail'
import { createOrder, ordersOf, publicOrder, resolveDueOrders } from '../domain/orders'
import { route, HttpResponse } from '../route'

export const orderHandlers = [
  route(
    'POST',
    '/api/orders',
    async ({ user, request, json }) => {
      const result = createOrder(user, request.headers.get(IDEMPOTENCY_HEADER), await json())
      if (result.hang) {
        await delay('infinite')
      }
      return HttpResponse.json(publicOrder(result.order), {
        status: result.replayed ? 200 : 201,
        headers: { 'Idempotent-Replayed': String(result.replayed) },
      })
    },
    { auth: 'required' },
  ),

  route(
    'GET',
    '/api/orders/:id',
    ({ user, params }) => {
      resolveDueOrders()
      const order = ordersOf(user.id).find((o) => o.id === params.id)
      if (!order) fail('not_found', 'Pedido não encontrado.')
      return HttpResponse.json(publicOrder(order))
    },
    { auth: 'required' },
  ),

  route(
    'GET',
    '/api/orders',
    ({ user, url }) => {
      resolveDueOrders()
      const status = url.searchParams.get('status') as OrderStatus | null
      const orders = ordersOf(user.id)
        .filter((o) => !status || o.status === status)
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        .map(publicOrder)
      const payload: OrdersListResponse = { orders }
      return HttpResponse.json(payload)
    },
    { auth: 'required' },
  ),
]
