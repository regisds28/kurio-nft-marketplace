import type { FavoritesResponse } from '@/api/contracts'
import { commit, getDb } from '../db'
import { findNft } from '../domain/catalog'
import { fail } from '../http-fail'
import { route, HttpResponse } from '../route'

function listFor(userId: string): string[] {
  const db = getDb()
  return (db.favorites[userId] ??= [])
}

const body = (ids: string[]): FavoritesResponse => ({ nftIds: [...ids] })

export const favoriteHandlers = [
  route('GET', '/api/favorites', ({ user }) => HttpResponse.json(body(listFor(user.id))), { auth: 'required' }),

  route(
    'PUT',
    '/api/favorites/:nftId',
    ({ user, params }) => {
      if (!findNft(params.nftId!)) fail('not_found', 'NFT não encontrado.')
      const ids = listFor(user.id)
      if (!ids.includes(params.nftId!)) ids.push(params.nftId!)
      commit()
      return HttpResponse.json(body(ids))
    },
    { auth: 'required' },
  ),

  route(
    'DELETE',
    '/api/favorites/:nftId',
    ({ user, params }) => {
      const db = getDb()
      db.favorites[user.id] = listFor(user.id).filter((id) => id !== params.nftId)
      commit()
      return HttpResponse.json(body(db.favorites[user.id]!))
    },
    { auth: 'required' },
  ),
]
