import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ConnectWalletRequest, WalletConnection, WalletInput } from '@/api/contracts'
import { api } from '@/api/endpoints'
import { keys } from '@/api/keys'
import { useSession } from '@/features/session/SessionProvider'

export function useWallets() {
  const { userKey, isAuthenticated } = useSession()
  return useQuery({
    queryKey: keys.wallets(userKey),
    queryFn: ({ signal }) => api.wallets.list({ signal }),
    enabled: isAuthenticated,
  })
}

export function useSaveWallet() {
  const qc = useQueryClient()
  const { userKey } = useSession()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: WalletInput }) => (id ? api.wallets.update(id, input) : api.wallets.create(input)),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.wallets(userKey) }),
  })
}

export const DISCONNECTED: WalletConnection = { connected: false, walletId: null, provider: null, address: null, network: null, connectedAt: null }

export function useWalletConnection() {
  const { userKey, isAuthenticated } = useSession()
  return useQuery({
    queryKey: keys.connection(userKey),
    queryFn: ({ signal }) => api.wallets.connection({ signal }),
    enabled: isAuthenticated,
  })
}

export function useConnectWallet() {
  const qc = useQueryClient()
  const { userKey } = useSession()
  return useMutation({
    mutationFn: (body: ConnectWalletRequest) => api.wallets.connect(body),
    onSuccess: (data) => qc.setQueryData(keys.connection(userKey), data),
  })
}

export function useDisconnectWallet() {
  const qc = useQueryClient()
  const { userKey } = useSession()
  return useMutation({
    mutationFn: () => api.wallets.disconnect(),
    onSuccess: () => qc.setQueryData(keys.connection(userKey), DISCONNECTED),
  })
}
