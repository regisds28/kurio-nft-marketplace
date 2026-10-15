import { useMutation } from '@tanstack/react-query'
import type { PasswordChangeInput, ProfileInput } from '@/api/contracts'
import { api } from '@/api/endpoints'
import { useSession } from '@/features/session/SessionProvider'

export function useUpdateProfile() {
  const { setUser } = useSession()
  return useMutation({ mutationFn: (body: ProfileInput) => api.profile.update(body), onSuccess: setUser })
}
export function useChangePassword() {
  return useMutation({ mutationFn: (body: PasswordChangeInput) => api.profile.changePassword(body) })
}
export function useUploadAvatar() {
  const { setUser } = useSession()
  return useMutation({ mutationFn: (file: File) => api.profile.uploadAvatar(file), onSuccess: setUser })
}
export function useRemoveAvatar() {
  const { setUser } = useSession()
  return useMutation({ mutationFn: () => api.profile.removeAvatar(), onSuccess: setUser })
}
