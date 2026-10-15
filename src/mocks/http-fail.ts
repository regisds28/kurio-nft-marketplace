import { HttpResponse } from 'msw'
import { ERROR_CODES, type ApiErrorBody, type ErrorCode } from '@/api/contracts'

export class HttpFail extends Error {
  readonly status: number
  readonly code: ErrorCode
  readonly fields?: Record<string, string>
  readonly details?: unknown
  readonly retryable?: boolean

  constructor(code: ErrorCode, message: string, extra: { fields?: Record<string, string>; details?: unknown; retryable?: boolean; status?: number } = {}) {
    super(message)
    this.code = code
    this.status = extra.status ?? ERROR_CODES[code]
    this.fields = extra.fields
    this.details = extra.details
    this.retryable = extra.retryable
  }
}

export function fail(code: ErrorCode, message: string, extra?: ConstructorParameters<typeof HttpFail>[2]): never {
  throw new HttpFail(code, message, extra)
}

export function errorResponse(f: HttpFail): Response {
  const body: ApiErrorBody = {
    error: {
      code: f.code,
      message: f.message,
      ...(f.fields ? { fields: f.fields } : {}),
      ...(f.details !== undefined ? { details: f.details } : {}),
      ...(f.retryable !== undefined ? { retryable: f.retryable } : {}),
    },
  }
  return HttpResponse.json(body, { status: f.status })
}

export function validationFail(fields: Record<string, string>, message = 'Verifique os campos informados.'): never {
  throw new HttpFail('validation_failed', message, { fields })
}

export function fieldsFromZod(issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of issues) {
    const key = issue.path.map(String).join('.') || '_form'
    if (!(key in out)) out[key] = issue.message
  }
  return out
}
