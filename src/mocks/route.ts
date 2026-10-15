import { delay, http, HttpResponse, type HttpHandler } from 'msw'
import type { ApiErrorBody } from '@/api/contracts'
import { authenticate, ownerKeyOf, requireUser, type AuthState } from './domain/auth'
import { matchFault, latencyFor } from './faults'
import { errorResponse, HttpFail } from './http-fail'
import type { HttpMethod } from './scenarios'
import type { UserRecord } from './types'

export interface RouteContext {
  request: Request
  url: URL
  params: Record<string, string>
  auth: AuthState
  user: UserRecord
  ownerKey: string | null
  json<T>(): Promise<T>
}

type PublicRouteContext = Omit<RouteContext, 'user'> & { user: UserRecord | null }

export interface RouteOptions {
  auth?: 'required' | 'optional'
}

type Handler<A extends 'required' | 'optional'> = (
  ctx: A extends 'required' ? RouteContext : PublicRouteContext,
) => Response | Promise<Response>

const factories = {
  GET: http.get,
  POST: http.post,
  PUT: http.put,
  PATCH: http.patch,
  DELETE: http.delete,
} as const

function normalizeParams(params: Record<string, string | readonly string[] | undefined>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(params)) out[k] = Array.isArray(v) ? v.join('/') : (v as string)
  return out
}

export function route<A extends 'required' | 'optional' = 'optional'>(
  method: HttpMethod,
  path: string,
  handler: Handler<A>,
  options: { auth?: A } = {},
): HttpHandler {
  return factories[method](path, async ({ request, params }) => {
    const url = new URL(request.url)
    try {
      const wait = latencyFor(method, url.pathname)
      if (wait > 0) await delay(wait)

      const fault = matchFault(method, url.pathname, request.headers.has('authorization'))
      if (fault) {
        if (fault.kind === 'network') return HttpResponse.error()
        if (fault.kind === 'hang') {
          await delay('infinite')
          return new HttpResponse(null, { status: 504 })
        }
        return errorResponse(
          new HttpFail(fault.code ?? 'internal_error', fault.message ?? 'Falha simulada pelo cenário.', {
            status: fault.status ?? 500,
            fields: fault.fields,
            retryable: (fault.status ?? 500) >= 500,
          }),
        )
      }

      const auth = authenticate(request)
      const required = (options.auth ?? 'optional') === 'required'
      const user = required ? requireUser(auth) : auth.user
      const ctx = {
        request,
        url,
        params: normalizeParams(params),
        auth,
        user,
        ownerKey: ownerKeyOf(request, auth.user),
        json: <T>() => request.clone().json() as Promise<T>,
      }
      return await handler(ctx as never)
    } catch (error) {
      if (error instanceof HttpFail) return errorResponse(error)
      if (error instanceof SyntaxError) {
        return HttpResponse.json<ApiErrorBody>(
          { error: { code: 'bad_request', message: 'Corpo da requisição inválido.' } },
          { status: 400 },
        )
      }
      console.error('[mocks] erro inesperado em', method, path, error)
      return HttpResponse.json<ApiErrorBody>(
        { error: { code: 'internal_error', message: 'Erro interno da API simulada.', retryable: true } },
        { status: 500 },
      )
    }
  })
}

export { HttpResponse }
