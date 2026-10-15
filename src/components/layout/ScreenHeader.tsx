import { useNavigate, useCanGoBack, useRouter } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'

export function ScreenHeader({ title, fallback = '/', right }: { title: string; fallback?: string; right?: ReactNode }) {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const navigate = useNavigate()
  return (
    <div className="relative mb-4 flex h-11 items-center justify-center lg:hidden">
      <button
        type="button"
        aria-label="Voltar"
        onClick={() => (canGoBack ? router.history.back() : void navigate({ to: fallback }))}
        className="absolute left-0 grid size-[35px] place-items-center rounded-full bg-surface-card"
      >
        <ArrowLeft className="size-5" aria-hidden="true" />
      </button>
      <h1 className="text-base font-bold">{title}</h1>
      {right && <div className="absolute right-0">{right}</div>}
    </div>
  )
}
