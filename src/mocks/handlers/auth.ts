import {
  loginSchema,
  registerSchema,
  type AuthResponse,
  type SessionResponse,
} from '@/api/contracts'
import { commit, getDb, nextId, nowIso } from '../db'
import { createSession, publicUser } from '../domain/auth'
import { mergeGuestIntoUser } from '../domain/cart'
import { fail, validationFail } from '../http-fail'
import { hashPassword } from '../seed'
import { route, HttpResponse } from '../route'
import { parseBody } from './helpers'

export const authHandlers = [
  route('POST', '/api/auth/register', async ({ json, request }) => {
    const raw = await json<Record<string, unknown>>()
    const body = parseBody(registerSchema, raw)
    const db = getDb()
    const email = body.email.trim().toLowerCase()
    if (db.users.some((u) => u.email.toLowerCase() === email)) {
      fail('email_taken', 'Este e-mail já está cadastrado.', { fields: { email: 'Este e-mail já está cadastrado.' } })
    }
    if (db.users.some((u) => u.username.toLowerCase() === body.username.toLowerCase())) {
      fail('username_taken', 'Este nome de usuário já está em uso.', { fields: { username: 'Este nome de usuário já está em uso.' } })
    }
    const salt = nextId('salt')
    const user = {
      id: nextId('u'),
      email,
      username: body.username,
      displayName: body.username,
      ensName: `${body.username.toLowerCase().replace(/[^a-z0-9-]/g, '-')}.kurio`,
      walletNickname: 'Principal',
      avatarUrl: null,
      salt,
      passwordHash: hashPassword(salt, body.password),
      createdAt: nowIso(),
    }
    db.users.push(user)
    db.wallets[user.id] = []
    db.favorites[user.id] = []
    const guestId = typeof raw.guestCartId === 'string' ? raw.guestCartId : request.headers.get('x-guest-cart')
    if (guestId) mergeGuestIntoUser(guestId, user.id)
    const session = createSession(user.id)
    commit()
    const payload: AuthResponse = { user: publicUser(user), token: session.token, expiresAt: session.expiresAt }
    return HttpResponse.json(payload, { status: 201 })
  }),

  route('POST', '/api/auth/login', async ({ json, request }) => {
    const raw = await json<Record<string, unknown>>()
    const body = parseBody(loginSchema, raw)
    const db = getDb()
    const user = db.users.find((u) => u.email.toLowerCase() === body.email.trim().toLowerCase())
    if (!user || user.passwordHash !== hashPassword(user.salt, body.password)) {
      fail('invalid_credentials', 'E-mail ou senha incorretos.', { fields: { _form: 'E-mail ou senha incorretos.' } })
    }
    const guestId = typeof raw.guestCartId === 'string' ? raw.guestCartId : request.headers.get('x-guest-cart')
    if (guestId) mergeGuestIntoUser(guestId, user.id)
    const session = createSession(user.id)
    const payload: AuthResponse = { user: publicUser(user), token: session.token, expiresAt: session.expiresAt }
    return HttpResponse.json(payload)
  }),

  route(
    'POST',
    '/api/auth/logout',
    ({ auth }) => {
      const db = getDb()
      db.sessions = db.sessions.filter((s) => s.token !== auth.token)
      commit()
      return new HttpResponse(null, { status: 204 })
    },
    { auth: 'required' },
  ),

  route(
    'GET',
    '/api/session',
    ({ user, auth }) => {
      const payload: SessionResponse = { user: publicUser(user), expiresAt: auth.session!.expiresAt }
      return HttpResponse.json(payload)
    },
    { auth: 'required' },
  ),
]

export { validationFail }
