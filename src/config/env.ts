const raw = import.meta.env

export const env = {
  enableMocks: raw.VITE_ENABLE_MOCKS === 'true',
  mockScenario: raw.VITE_MOCK_SCENARIO ?? 'default',
  mockPanel: raw.VITE_MOCK_PANEL !== 'false',
  apiBaseUrl: raw.VITE_API_BASE_URL ?? '/api',
  socketUrl: raw.VITE_SOCKET_URL ?? '',
  requestTimeoutMs: 12_000,
  isProd: raw.PROD,
} as const
