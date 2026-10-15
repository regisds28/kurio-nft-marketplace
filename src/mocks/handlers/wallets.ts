import {
  connectWalletSchema,
  walletInputSchema,
  type Wallet,
  type WalletConnection,
  type WalletsResponse,
} from '@/api/contracts'
import { commit, getDb, getScenario, nextId, nowIso } from '../db'
import { fail, validationFail } from '../http-fail'
import { route, HttpResponse } from '../route'
import { parseBody } from './helpers'

function listFor(userId: string): Wallet[] {
  const db = getDb()
  return (db.wallets[userId] ??= [])
}

const DISCONNECTED: WalletConnection = {
  connected: false,
  walletId: null,
  provider: null,
  address: null,
  network: null,
  connectedAt: null,
}

export const walletHandlers = [
  route(
    'GET',
    '/api/wallets',
    ({ user }) => {
      const payload: WalletsResponse = { wallets: listFor(user.id) }
      return HttpResponse.json(payload)
    },
    { auth: 'required' },
  ),

  route(
    'POST',
    '/api/wallets',
    async ({ user, json }) => {
      const body = parseBody(walletInputSchema, await json())
      const wallets = listFor(user.id)
      if (wallets.some((w) => w.role === body.role)) {
        validationFail({ _form: `Já existe uma carteira ${body.role === 'primary' ? 'principal' : 'secundária'} cadastrada.` })
      }
      if (wallets.some((w) => w.address.toLowerCase() === body.address.toLowerCase())) {
        validationFail({ address: 'Este endereço já está cadastrado.' })
      }
      const wallet: Wallet = { ...body, id: nextId('w'), updatedAt: nowIso() }
      wallets.push(wallet)
      commit()
      return HttpResponse.json(wallet, { status: 201 })
    },
    { auth: 'required' },
  ),

  route(
    'PUT',
    '/api/wallets/:id',
    async ({ user, params, json }) => {
      const wallets = listFor(user.id)
      const current = wallets.find((w) => w.id === params.id)
      if (!current) fail('not_found', 'Carteira não encontrada.')
      const body = parseBody(walletInputSchema, await json())
      if (body.role !== current.role) validationFail({ role: 'O tipo da carteira não pode ser alterado.' })
      if (wallets.some((w) => w.id !== current.id && w.address.toLowerCase() === body.address.toLowerCase())) {
        validationFail({ address: 'Este endereço já está cadastrado.' })
      }
      Object.assign(current, body, { updatedAt: nowIso() })
      commit()
      return HttpResponse.json(current)
    },
    { auth: 'required' },
  ),

  route(
    'GET',
    '/api/wallet-connection',
    ({ user }) => HttpResponse.json(getDb().connections[user.id] ?? DISCONNECTED),
    { auth: 'required' },
  ),

  route(
    'POST',
    '/api/wallet-connection',
    async ({ user, json }) => {
      const body = parseBody(connectWalletSchema, await json())
      const wallet = listFor(user.id).find((w) => w.id === body.walletId)
      if (!wallet) fail('validation_failed', 'Carteira não encontrada.', { fields: { walletId: 'Selecione uma carteira cadastrada.' } })
      if (getScenario().walletRejects) {
        fail('wallet_rejected', 'A conexão foi recusada pela carteira. Tente novamente.')
      }
      const connection: WalletConnection = {
        connected: true,
        walletId: wallet.id,
        provider: body.provider,
        address: wallet.address,
        network: body.network,
        connectedAt: nowIso(),
      }
      getDb().connections[user.id] = connection
      commit()
      return HttpResponse.json(connection)
    },
    { auth: 'required' },
  ),

  route(
    'DELETE',
    '/api/wallet-connection',
    ({ user }) => {
      delete getDb().connections[user.id]
      commit()
      return new HttpResponse(null, { status: 204 })
    },
    { auth: 'required' },
  ),
]
