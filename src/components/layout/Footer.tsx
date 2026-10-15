import { FacebookIcon, InstagramIcon, LinkedinIcon, TwitterIcon, YoutubeIcon } from '@/components/icons'
import { notAvailable } from '@/lib/out-of-scope'
import { useState, type FormEvent } from 'react'

const MEDALLIONS = [
  { letter: 'W', title: 'Segurança da carteira', text: 'Proteja sua carteira e colecione arte digital verificada com confiança.' },
  { letter: 'C', title: 'Criadores em destaque', text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.' },
  { letter: 'D', title: 'Alertas de lançamentos', text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.' },
]

const COLUMNS: Array<{ title: string; links: string[] }> = [
  { title: 'Meu perfil', links: ['Meu perfil', 'Minha coleção', 'Atividade', 'Estúdio do criador', 'Lista de interesse'] },
  { title: 'Central de ajuda', links: ['Central de ajuda', 'Como comprar NFTs', 'Carteira e segurança', 'Política do mercado', 'Denunciar item'] },
  { title: 'Coleções', links: ['Arte digital', 'Fotografia', 'Música', 'Arte 3D', 'Utilidade'] },
]

function FooterLink({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => notAvailable(label)} className="block w-full py-[5px] text-left text-sm hover:text-accent">
      {label}
    </button>
  )
}

function Newsletter() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Informe um e-mail válido.')
      return
    }
    setError(null)
    notAvailable('A assinatura da newsletter')
  }
  return (
    <form onSubmit={submit} noValidate className="flex w-full flex-col gap-3 lg:w-[357px]">
      <h2 className="text-lg font-bold leading-snug">Antecipe-se ao próximo lançamento</h2>
      <div className="flex h-10 items-stretch overflow-hidden rounded-md bg-surface-dark shadow-[0_0_10px_rgba(10,6,4,0.45)]">
        <label htmlFor="newsletter-email" className="sr-only">E-mail para a newsletter</label>
        <input
          id="newsletter-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="digite seu e-mail..."
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'newsletter-error' : undefined}
          className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-secondary focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
        />
        <button type="submit" className="bg-primary px-4 text-lg font-bold text-ink hover:bg-accent">Enviar</button>
      </div>
      {error && <p id="newsletter-error" className="text-sm text-danger">{error}</p>}
      <p className="text-[13px] leading-[22px] text-muted">Receba lançamentos selecionados, histórias de criadores e novidades do mercado.</p>
    </form>
  )
}

export function Footer() {
  return (
    <footer className="mt-24 w-full">
      <div className="bg-surface-card">
        <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_1px_1fr_1px_1fr_1px_auto] xl:px-8">
          {MEDALLIONS.flatMap((m, i) => [
            <div key={m.letter} className="flex flex-col gap-3 lg:px-4">
              <div aria-hidden="true" className="grid size-[74px] place-items-center rounded-full bg-primary text-2xl font-bold text-ink">{m.letter}</div>
              <h2 className="text-[17px] font-bold leading-4">{m.title}</h2>
              <p className="max-w-[204px] text-sm leading-[22px] text-muted">{m.text}</p>
            </div>,
            <div key={`sep-${i}`} aria-hidden="true" className="hidden bg-primary lg:block" />,
          ])}
          <Newsletter />
        </div>
      </div>

      <div className="bg-surface-dark">
        <div className="mx-auto grid max-w-[1200px] items-center gap-4 px-4 py-6 text-sm sm:px-6 md:grid-cols-4 xl:px-8">
          <span className="font-bold tracking-[1.4px]">KURIO</span>
          <p className="leading-[22px]">Feito para colecionadores,<br />criadores e cultura</p>
          <a href="mailto:contato@email.com" className="hover:text-accent">contato@email.com</a>
          <span>+55 11 4002 8922</span>
        </div>
      </div>

      <div className="bg-surface-card">
        <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-8 sm:px-6 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_228px] lg:gap-[60px] xl:px-8">
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="mb-2 text-lg font-bold">{col.title}</h2>
              <ul>
                {col.links.map((l) => (
                  <li key={l}>
                    <FooterLink label={l} />
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-5">
              <h2 className="text-lg font-bold">Redes sociais</h2>
              <div className="flex gap-2.5">
                {[
                  { label: 'Facebook', Icon: FacebookIcon },
                  { label: 'Instagram', Icon: InstagramIcon },
                  { label: 'Twitter', Icon: TwitterIcon },
                  { label: 'LinkedIn', Icon: LinkedinIcon },
                  { label: 'YouTube', Icon: YoutubeIcon },
                ].map(({ label, Icon }) => (
                  <button
                    key={label}
                    type="button"
                    aria-label={label}
                    onClick={() => notAvailable(label)}
                    className="grid size-[30px] place-items-center rounded-[4px] border border-primary text-accent hover:bg-primary/15"
                  >
                    <Icon className="size-4" />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <h2 className="text-lg font-bold">Carteiras compatíveis</h2>
              <p className="flex min-h-[26px] items-center justify-center whitespace-pre rounded-md border border-border-soft bg-surface-dark px-2 text-[9px] font-bold tracking-[0.1px] text-accent">
                METAMASK  •  WALLETCONNECT  •  COINBASE
              </p>
            </div>
          </div>
        </div>
        <p className="pb-8 text-center text-sm leading-[30px]">© 2026 Kurio. Propriedade digital para todos.</p>
      </div>
    </footer>
  )
}
