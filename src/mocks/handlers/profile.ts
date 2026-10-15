import {
  AVATAR_MAX_BYTES,
  AVATAR_TYPES,
  passwordChangeSchema,
  profileSchema,
} from '@/api/contracts'
import { commit, getDb } from '../db'
import { publicUser } from '../domain/auth'
import { fail, validationFail } from '../http-fail'
import { hashPassword } from '../seed'
import { route, HttpResponse } from '../route'
import { parseBody, toBase64 } from './helpers'

export const profileHandlers = [
  route('GET', '/api/profile', ({ user }) => HttpResponse.json(publicUser(user)), { auth: 'required' }),

  route(
    'PATCH',
    '/api/profile',
    async ({ user, json }) => {
      const body = parseBody(profileSchema, await json())
      const db = getDb()
      const email = body.email.toLowerCase()
      if (db.users.some((u) => u.id !== user.id && u.email.toLowerCase() === email)) {
        fail('email_taken', 'Este e-mail já está cadastrado.', { fields: { email: 'Este e-mail já está cadastrado.' } })
      }
      if (db.users.some((u) => u.id !== user.id && u.username.toLowerCase() === body.username.toLowerCase())) {
        fail('username_taken', 'Este nome de usuário já está em uso.', { fields: { username: 'Este nome de usuário já está em uso.' } })
      }
      user.displayName = body.displayName
      user.username = body.username
      user.email = email
      user.ensName = body.ensName
      user.walletNickname = body.walletNickname
      commit()
      return HttpResponse.json(publicUser(user))
    },
    { auth: 'required' },
  ),

  route(
    'PUT',
    '/api/profile/password',
    async ({ user, auth, json }) => {
      const body = parseBody(passwordChangeSchema, await json())
      if (user.passwordHash !== hashPassword(user.salt, body.currentPassword)) {
        validationFail({ currentPassword: 'Senha atual incorreta.' })
      }
      if (body.newPassword === body.currentPassword) {
        validationFail({ newPassword: 'A nova senha deve ser diferente da atual.' })
      }
      user.passwordHash = hashPassword(user.salt, body.newPassword)
      const db = getDb()
      db.sessions = db.sessions.filter((s) => s.userId !== user.id || s.token === auth.token)
      commit()
      return new HttpResponse(null, { status: 204 })
    },
    { auth: 'required' },
  ),

  route(
    'POST',
    '/api/profile/avatar',
    async ({ user, request }) => {
      const form = await request.clone().formData().catch(() => null)
      const file = form?.get('avatar')
      if (!(file instanceof Blob)) validationFail({ avatar: 'Selecione uma imagem.' })
      if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) {
        validationFail({ avatar: 'Formato inválido. Use PNG, JPEG ou WebP.' })
      }
      if (file.size > AVATAR_MAX_BYTES) {
        fail('payload_too_large', 'A imagem excede o limite de 2 MB.', { fields: { avatar: 'A imagem excede o limite de 2 MB.' } })
      }
      user.avatarUrl = `data:${file.type};base64,${toBase64(await file.arrayBuffer())}`
      commit()
      return HttpResponse.json(publicUser(user))
    },
    { auth: 'required' },
  ),

  route(
    'DELETE',
    '/api/profile/avatar',
    ({ user }) => {
      user.avatarUrl = null
      commit()
      return HttpResponse.json(publicUser(user))
    },
    { auth: 'required' },
  ),
]
