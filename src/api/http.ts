import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { env } from '@/config/env'
import { authStorage, guestCart } from '@/features/session/storage'
import { GUEST_HEADER } from './contracts'
import { ApiError, toApiError } from './errors'
import { sessionBus } from './session-bus'

interface TimeoutMeta {
  timer?: ReturnType<typeof setTimeout>
  timedOut?: boolean
  controller?: AbortController
}

const meta = new WeakMap<InternalAxiosRequestConfig, TimeoutMeta>()

export interface RequestOptions {
  timeoutMs?: number
  skipAuthHandling?: boolean
}

declare module 'axios' {
  interface AxiosRequestConfig {
    timeoutMs?: number
    skipAuthHandling?: boolean
  }
}

function createClient(): AxiosInstance {
  const client = axios.create({
    baseURL: env.apiBaseUrl,
    timeout: 0,
    headers: { Accept: 'application/json' },
  })

  client.interceptors.request.use((config) => {
    const auth = authStorage.read()
    if (auth?.token) config.headers.set('Authorization', `Bearer ${auth.token}`)
    const guest = auth?.token ? guestCart.peek() : guestCart.id()
    if (guest) config.headers.set(GUEST_HEADER, guest)

    const state: TimeoutMeta = {}
    const controller = new AbortController()
    state.controller = controller
    if (config.signal) {
      const upstream = config.signal as AbortSignal
      if (upstream.aborted) controller.abort()
      else upstream.addEventListener('abort', () => controller.abort(), { once: true })
    }
    config.signal = controller.signal

    const ms = config.timeoutMs ?? env.requestTimeoutMs
    if (ms > 0) {
      state.timer = setTimeout(() => {
        state.timedOut = true
        controller.abort()
      }, ms)
    }
    meta.set(config, state)
    return config
  })

  client.interceptors.response.use(
    (response) => {
      const state = meta.get(response.config)
      if (state?.timer) clearTimeout(state.timer)
      return response
    },
    (error: unknown) => {
      const config = axios.isAxiosError(error) ? error.config : undefined
      const state = config ? meta.get(config) : undefined
      if (state?.timer) clearTimeout(state.timer)

      if (state?.timedOut) {
        return Promise.reject(
          new ApiError({ kind: 'timeout', message: 'Tempo de resposta esgotado', code: 'timeout', retryable: true }),
        )
      }

      const apiError = toApiError(error)
      if (apiError.status === 401 && !config?.skipAuthHandling) {
        sessionBus.emitInvalid(apiError.code === 'session_expired' ? 'session_expired' : 'session_invalid')
      }
      return Promise.reject(apiError)
    },
  )

  return client
}

export const http = createClient()
