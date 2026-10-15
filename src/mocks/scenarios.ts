import type { ErrorCode } from '@/api/contracts'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface FaultRule {
  id: string
  method?: HttpMethod
  path: string
  kind: 'http' | 'network' | 'hang'
  status?: number
  code?: ErrorCode
  message?: string
  fields?: Record<string, string>
  times?: number
  skip?: number
  authOnly?: boolean
}

export interface LatencyConfig {
  mode: 'none' | 'range' | 'alternate'
  minMs: number
  maxMs: number
  seed: number
}

export interface CheckoutConfig {
  paymentOutcome: 'confirmed' | 'declined'
  confirmDelayMs: number
  priceChangeOnCreate: boolean
  soldOutOnCreate: boolean
  hangAfterCreate: boolean
}

export interface ScenarioConfig {
  latency: LatencyConfig
  catalogEmpty: boolean
  rules: FaultRule[]
  sessionTtlMs: number
  walletRejects: boolean
  checkout: CheckoutConfig
}

export const BASE_SCENARIO: ScenarioConfig = {
  latency: { mode: 'range', minMs: 60, maxMs: 220, seed: 7 },
  catalogEmpty: false,
  rules: [],
  sessionTtlMs: 8 * 60 * 60 * 1000,
  walletRejects: false,
  checkout: {
    paymentOutcome: 'confirmed',
    confirmDelayMs: 2500,
    priceChangeOnCreate: false,
    soldOutOnCreate: false,
    hangAfterCreate: false,
  },
}

export interface ScenarioPreset {
  id: string
  label: string
  description: string
  patch: Partial<Omit<ScenarioConfig, 'checkout'>> & { checkout?: Partial<CheckoutConfig> }
}

export const PRESETS: ScenarioPreset[] = [
  { id: 'default', label: 'Padrão', description: 'Caminho feliz com latência baixa e variável (60–220 ms).', patch: {} },
  {
    id: 'fast',
    label: 'Rápido (testes)',
    description: 'Sem latência artificial e confirmação de pedido em 400 ms.',
    patch: { latency: { mode: 'none', minMs: 0, maxMs: 0, seed: 1 }, checkout: { confirmDelayMs: 400 } },
  },
  {
    id: 'slow',
    label: 'Lento',
    description: 'Latência alta (1,4–2,6 s) para observar skeletons e estados de carregamento.',
    patch: { latency: { mode: 'range', minMs: 1400, maxMs: 2600, seed: 11 } },
  },
  {
    id: 'jitter',
    label: 'Latência variável / fora de ordem',
    description: 'Cada rota alterna chamadas lentas (1,6 s) e rápidas (60 ms): respostas chegam fora de ordem.',
    patch: { latency: { mode: 'alternate', minMs: 60, maxMs: 1600, seed: 3 } },
  },
  { id: 'empty', label: 'Catálogo vazio', description: 'A listagem de NFTs devolve zero resultados.', patch: { catalogEmpty: true } },
  {
    id: 'offline',
    label: 'Sem conexão',
    description: 'Toda chamada à API falha por erro de rede.',
    patch: { rules: [{ id: 'offline', path: '/api/*', kind: 'network' }] },
  },
  {
    id: 'server-error',
    label: 'Erro 500 no catálogo',
    description: 'GET /api/nfts responde 500 enquanto o cenário estiver ativo.',
    patch: {
      rules: [{ id: 'catalog-500', method: 'GET', path: '/api/nfts*', kind: 'http', status: 500, code: 'internal_error' }],
    },
  },
  {
    id: 'flaky',
    label: 'Falhas transitórias (503)',
    description: 'As 2 primeiras chamadas GET falham com 503; as seguintes funcionam (exercita retry/recuperação).',
    patch: {
      rules: [{ id: 'flaky-503', method: 'GET', path: '/api/*', kind: 'http', status: 503, code: 'service_unavailable', times: 2 }],
    },
  },
  {
    id: 'forbidden',
    label: 'Acesso negado (403)',
    description: 'Perfil e carteiras respondem 403 (sem permissão).',
    patch: {
      rules: [
        { id: 'profile-403', path: '/api/profile*', kind: 'http', status: 403, code: 'forbidden', authOnly: true },
        { id: 'wallets-403', path: '/api/wallets*', kind: 'http', status: 403, code: 'forbidden', authOnly: true },
      ],
    },
  },
  {
    id: 'session-expired',
    label: 'Sessão expira na próxima chamada',
    description: 'A próxima chamada com sessão ativa responde 401 session_expired (uma vez).',
    patch: {
      rules: [{ id: 'expire-next', path: '/api/*', kind: 'http', status: 401, code: 'session_expired', times: 1, authOnly: true }],
    },
  },
  {
    id: 'session-short',
    label: 'Sessões curtas (30 s)',
    description: 'Tokens emitidos expiram em 30 s, para observar a expiração durante a navegação.',
    patch: { sessionTtlMs: 30_000 },
  },
  {
    id: 'signup-conflict',
    label: 'Conflito no cadastro',
    description: 'POST /api/auth/register responde 409 (e-mail já cadastrado).',
    patch: {
      rules: [
        {
          id: 'signup-409',
          method: 'POST',
          path: '/api/auth/register',
          kind: 'http',
          status: 409,
          code: 'email_taken',
          message: 'Este e-mail já está cadastrado.',
          fields: { email: 'Este e-mail já está cadastrado.' },
        },
      ],
    },
  },
  {
    id: 'favorites-failure',
    label: 'Falha ao favoritar',
    description: 'A 1ª inclusão e a 1ª remoção de favorito falham com 500 (rollback otimista); depois funcionam.',
    patch: {
      rules: [
        { id: 'fav-put-500', method: 'PUT', path: '/api/favorites/*', kind: 'http', status: 500, code: 'internal_error', times: 1 },
        { id: 'fav-del-500', method: 'DELETE', path: '/api/favorites/*', kind: 'http', status: 500, code: 'internal_error', times: 1 },
      ],
    },
  },
  {
    id: 'price-change',
    label: 'Preço muda durante a compra',
    description: 'No instante de criar o pedido, o preço de um item sobe (cotação desatualizada → nova confirmação).',
    patch: { checkout: { priceChangeOnCreate: true } },
  },
  {
    id: 'sold-out',
    label: 'Edição esgota durante a compra',
    description: 'No instante de criar o pedido, a edição de um item esgota (conflito de disponibilidade).',
    patch: { checkout: { soldOutOnCreate: true } },
  },
  {
    id: 'order-timeout',
    label: 'Timeout após criar o pedido',
    description: 'O pedido é criado, mas a resposta nunca chega. Reenviar com a mesma Idempotency-Key recupera o mesmo pedido.',
    patch: { checkout: { hangAfterCreate: true } },
  },
  {
    id: 'payment-declined',
    label: 'Pagamento recusado',
    description: 'O pedido é criado como pendente e depois recusado pela "rede".',
    patch: { checkout: { paymentOutcome: 'declined' } },
  },
  {
    id: 'wallet-rejected',
    label: 'Conexão da carteira recusada',
    description: 'A simulação de conexão da carteira é recusada pelo usuário.',
    patch: { walletRejects: true },
  },
]

export const PRESET_IDS = PRESETS.map((p) => p.id)

export function parseScenarioIds(input: string | null | undefined): string[] {
  const ids = (input ?? 'default')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const valid = ids.filter((id) => PRESET_IDS.includes(id))
  return valid.length > 0 ? valid : ['default']
}

export function resolveScenario(ids: string[]): ScenarioConfig {
  let config: ScenarioConfig = structuredClone(BASE_SCENARIO)
  for (const id of ids) {
    const preset = PRESETS.find((p) => p.id === id)
    if (!preset) continue
    const { checkout, rules, latency, ...rest } = preset.patch
    config = {
      ...config,
      ...rest,
      latency: latency ? { ...latency } : config.latency,
      rules: rules ? [...config.rules, ...rules.map((r) => ({ ...r }))] : config.rules,
      checkout: { ...config.checkout, ...(checkout ?? {}) },
    }
  }
  return config
}

export function globToRegExp(glob: string): RegExp {
  const escaped = glob.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
  return new RegExp(`^${escaped}$`)
}
