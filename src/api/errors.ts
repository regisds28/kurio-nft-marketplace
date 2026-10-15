import { isAxiosError } from 'axios'
import { ERROR_CODES, type ApiErrorBody, type ErrorCode } from './contracts'

export type ApiErrorKind = 'http' | 'network' | 'timeout' | 'canceled'

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | null
  readonly code: ErrorCode | 'network_error' | 'timeout' | 'canceled' | 'unknown'
  readonly fields: Record<string, string>
  readonly details: unknown
  readonly retryable: boolean

  constructor(init: {
    kind: ApiErrorKind
    message: string
    status?: number | null
    code?: ApiError['code']
    fields?: Record<string, string>
    details?: unknown
    retryable?: boolean
  }) {
    super(init.message)
    this.name = 'ApiError'
    this.kind = init.kind
    this.status = init.status ?? null
    this.code = init.code ?? 'unknown'
    this.fields = init.fields ?? {}
    this.details = init.details
    this.retryable = init.retryable ?? false
  }

  get isAuthError(): boolean {
    return this.status === 401
  }
  get isSessionExpired(): boolean {
    return this.code === 'session_expired'
  }
  get isValidation(): boolean {
    return this.code === 'validation_failed'
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError
}

function isErrorBody(data: unknown): data is ApiErrorBody {
  return typeof data === 'object' && data !== null && 'error' in data && typeof (data as ApiErrorBody).error?.code === 'string'
}

export const MESSAGES: Record<string, string> = {
  network_error: 'Não foi possível conectar. Verifique sua conexão e tente novamente.',
  timeout: 'O servidor demorou demais para responder.',
  service_unavailable: 'Serviço temporariamente indisponível. Tente novamente em instantes.',
  internal_error: 'Algo deu errado do nosso lado. Tente novamente.',
  forbidden: 'Você não tem permissão para realizar esta ação.',
  not_found: 'Não encontramos o que você procura.',
  session_expired: 'Sua sessão expirou. Entre novamente para continuar.',
  session_invalid: 'Faça login para continuar.',
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (isAxiosError(error)) {
    if (error.code === 'ERR_CANCELED') {
      return new ApiError({ kind: 'canceled', message: 'Requisição cancelada', code: 'canceled' })
    }
    const response = error.response
    if (!response) {
      return new ApiError({
        kind: 'network',
        message: MESSAGES.network_error!,
        code: 'network_error',
        retryable: true,
      })
    }
    const status = response.status
    const data: unknown = response.data
    if (isErrorBody(data)) {
      const body = data.error
      const code = body.code in ERROR_CODES ? body.code : 'internal_error'
      return new ApiError({
        kind: 'http',
        status,
        code,
        message: body.message || MESSAGES[code] || 'Erro inesperado',
        fields: body.fields,
        details: body.details,
        retryable: body.retryable ?? status >= 500,
      })
    }
    return new ApiError({
      kind: 'http',
      status,
      code: status >= 500 ? 'service_unavailable' : 'bad_request',
      message: status >= 500 ? MESSAGES.service_unavailable! : 'Requisição inválida',
      retryable: status >= 500,
    })
  }

  return new ApiError({
    kind: 'network',
    message: error instanceof Error ? error.message : 'Erro desconhecido',
    code: 'unknown',
  })
}

export function describeError(error: unknown): string {
  const e = toApiError(error)
  return MESSAGES[e.code] ?? e.message
}
