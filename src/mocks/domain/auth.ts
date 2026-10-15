import type { User } from '@/api/contracts'
import { fail } from '../http-fail'
import { getDb, getScenario, nextId, commit } from '../db'
import { shortHash } from '../prng'
import type { SessionRecord, UserRecord } from '../types'

export function publicUser(u: UserRecord): User {
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    displayName: u.displayName,
    ensName: u.ensName,
    walletNickname: u.walletNickname,
    avatarUrl: u.avatarUrl,
    createdAt: u.createdAt,
  }
}

export function createSession(userId: string): SessionRecord {
  const db = getDb()
  const now = Date.now()
  const session: SessionRecord = {
    token: `kt_${shortHash(`${userId}:${now}:${db.seq}`, 24)}${nextId('s')}`,
    userId,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + getScenario().sessionTtlMs).toISOString(),
  }
  db.sessions.push(session)
  db.sessions = db.sessions.filter((s) => Date.parse(s.expiresAt) > now - 24 * 3_600_000)
  commit()
  return session
}

export type AuthProblem = 'missing' | 'invalid' | 'expired'

export interface AuthState {
  user: UserRecord | null
  session: SessionRecord | null
  problem: AuthProblem | null
  token: string | null
}

export function tokenFrom(request: Request): string | null {
  const header = request.headers.get('authorization')
  if (!header) return null
  const match = /^Bearer\s+(.+)$/i.exec(header)
  return match ? match[1]!.trim() : null
}

export function authenticateToken(token: string | null): AuthState {
  if (!token) return { user: null, session: null, problem: 'missing', token }
  const db = getDb()
  const session = db.sessions.find((s) => s.token === token)
  if (!session) return { user: null, session: null, problem: 'invalid', token }
  if (Date.parse(session.expiresAt) <= Date.now()) return { user: null, session, problem: 'expired', token }
  const user = db.users.find((u) => u.id === session.userId) ?? null
  if (!user) return { user: null, session, problem: 'invalid', token }
  return { user, session, problem: null, token }
}

export function authenticate(request: Request): AuthState {
  return authenticateToken(tokenFrom(request))
}

export function requireUser(auth: AuthState): UserRecord {
  if (auth.user) return auth.user
  if (auth.problem === 'expired') fail('session_expired', 'Sua sessão expirou. Entre novamente para continuar.')
  fail('session_invalid', 'Faça login para continuar.')
}

export function ownerKeyOf(request: Request, user: UserRecord | null): string | null {
  if (user) return `user:${user.id}`
  const guest = request.headers.get('x-guest-cart')
  return guest ? `guest:${guest}` : null
}
