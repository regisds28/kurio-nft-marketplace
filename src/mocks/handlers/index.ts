import { http, HttpResponse } from 'msw'
import type { ApiErrorBody } from '@/api/contracts'
import { authHandlers } from './auth'
import { cartHandlers } from './cart'
import { editorialHandlers } from './editorial'
import { favoriteHandlers } from './favorites'
import { nftHandlers } from './nfts'
import { orderHandlers } from './orders'
import { profileHandlers } from './profile'
import { walletHandlers } from './wallets'

export const handlers = [
  ...authHandlers,
  ...nftHandlers,
  ...favoriteHandlers,
  ...cartHandlers,
  ...orderHandlers,
  ...profileHandlers,
  ...walletHandlers,
  ...editorialHandlers,
  http.all('/api/*', () =>
    HttpResponse.json<ApiErrorBody>({ error: { code: 'not_found', message: 'Rota da API não encontrada.' } }, { status: 404 }),
  ),
]
