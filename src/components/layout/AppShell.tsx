import { Outlet, useRouterState } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { Footer } from './Footer'
import { Header } from './Header'
import { TabBar } from './TabBar'
import { useRealtimeStatus } from '@/realtime/status'
import { InlineNotice } from '@/components/states'

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const main = useRef<HTMLElement>(null)
  const first = useRef(true)
  const realtime = useRealtimeStatus()
  const bare = /^\/(nft|carrinho|pagamento|pedido|entrar|cadastro)/.test(pathname)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    main.current?.focus({ preventScroll: true })
    if (!window.location.hash) window.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#conteudo"
        className="sr-only-focusable fixed top-2 left-2 z-[100] rounded-md bg-primary px-3 py-2 font-bold text-ink"
      >
        Pular para o conteúdo
      </a>
      <div className={bare ? 'max-lg:hidden' : undefined}>
        <Header />
      </div>
      {realtime === 'reconnecting' && (
        <div className="mx-auto w-full max-w-[1200px] px-4 pt-3 sm:px-6 xl:px-0">
          <InlineNotice tone="warning">Reconectando às atualizações em tempo real… os dados serão revalidados ao voltar.</InlineNotice>
        </div>
      )}
      <main id="conteudo" ref={main} tabIndex={-1} className={`flex-1 outline-none lg:min-h-dvh lg:pb-0 ${bare ? '' : 'pb-20'}`}>
        <Outlet />
      </main>
      <div className="max-lg:hidden">
        <Footer />
      </div>
      <div className={bare ? 'hidden' : undefined}>
        <TabBar />
      </div>
    </div>
  )
}
