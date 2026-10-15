import { ArrowRight } from 'lucide-react'
import { NftArt } from '@/components/nft-art'
import { notAvailable } from '@/lib/out-of-scope'
import type { Artwork } from '@/api/contracts'

const PROMOS: Array<{ id: string; title: [string, string]; text: string; artwork: Artwork; label: string }> = [
  {
    id: 'genesis',
    title: ['Lançamentos gênesis', 'de edição limitada'],
    text: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
    artwork: 'ape',
    label: 'Lançamentos gênesis',
  },
  {
    id: 'curated',
    title: ['Arte digital selecionada', 'e muito mais'],
    text: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.',
    artwork: 'sage',
    label: 'A curadoria de arte digital',
  },
]

export function Promos() {
  return (
    <section aria-label="Promoções" className="hidden gap-6 lg:grid lg:grid-cols-2">
      {PROMOS.map((p) => (
        <article key={p.id} className="relative flex h-[250px] overflow-hidden rounded-lg bg-surface-card">
          <NftArt artwork={p.artwork} alt="" className="h-full w-[292px] shrink-0 rounded-[18px]" sizes="292px" />
          <div className="flex flex-1 flex-col items-end px-7 pt-[37px] text-right">
            <h3 className="text-lg font-bold leading-6">
              {p.title[0]}
              <br />
              {p.title[1]}
            </h3>
            <p className="mt-[22px] max-w-[263px] text-sm leading-6 text-muted">{p.text}</p>
            <button
              type="button"
              onClick={() => notAvailable(p.label)}
              className="mt-auto mb-[46px] inline-flex h-10 w-[140px] items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-ink hover:bg-accent"
            >
              Explorar <ArrowRight className="size-[18px]" aria-hidden="true" />
            </button>
          </div>
        </article>
      ))}
    </section>
  )
}
