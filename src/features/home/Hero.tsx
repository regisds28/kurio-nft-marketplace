import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { NftArt } from '@/components/nft-art'
import { Skeleton } from '@/components/ui/skeleton'
import { useFeatured } from '@/features/catalog/hooks'
import { cn } from '@/lib/utils'

export function Hero() {
  const { data, isPending } = useFeatured()
  const [index, setIndex] = useState(0)
  const slides = data?.hero ?? []
  const current = slides[index]

  return (
    <section
      aria-label="Destaque"
      className={cn(
        'relative isolate overflow-hidden rounded-xl bg-gradient-to-br from-surface-dark via-surface-card to-surface-card p-4',
        'lg:h-[450px] lg:rounded-none lg:bg-none lg:p-0',
      )}
    >
      <div className="flex items-center justify-between gap-3 lg:h-full lg:gap-10">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 lg:gap-6">
          <p className="text-xs font-medium leading-4 lg:hidden">Bem-vindo à Kurio</p>
          <h1 className="text-[18px] leading-[29px] font-bold lg:max-w-[560px] lg:text-[43px] lg:leading-[70px]">
            <span className="lg:hidden">SEJA DONO DA CULTURA DIGITAL</span>
            <span className="hidden lg:inline">SEJA DONO DO FUTURO DA ARTE DIGITAL</span>
          </h1>
          <p className="text-xs leading-[18px] text-muted lg:max-w-[420px] lg:text-base lg:leading-6">
            Descubra NFTs selecionados de criadores do mundo todo.
          </p>
          <Link
            to="/"
            hash="catalogo"
            className="mt-1 inline-flex items-center gap-2 text-xs font-bold text-accent lg:mt-2 lg:h-10 lg:w-[140px] lg:justify-center lg:rounded-md lg:bg-primary lg:text-sm lg:text-ink lg:hover:bg-accent"
          >
            EXPLORAR <ArrowRight className="size-4 lg:size-[18px]" aria-hidden="true" />
          </Link>
        </div>

        <div className="relative shrink-0">
          {isPending || !current ? (
            <Skeleton className="size-[138px] rounded-2xl lg:size-[450px] lg:rounded-3xl" />
          ) : (
            <Link to="/nft/$nftId" params={{ nftId: current.id }} aria-label={`${current.name}, ver detalhes`}>
              <NftArt
                artwork={current.artwork}
                alt={current.name}
                priority
                sizes="(min-width: 1024px) 450px, 138px"
                className="size-[138px] rounded-2xl lg:size-[450px] lg:rounded-3xl"
              />
            </Link>
          )}
        </div>
      </div>

      {slides.length > 1 && (
        <div role="group" aria-label="Escolher destaque" className="mt-3 flex justify-center gap-2 lg:absolute lg:inset-x-0 lg:bottom-[-2px] lg:mt-0">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Destaque ${i + 1}: ${s.name}`}
              aria-pressed={i === index}
              onClick={() => setIndex(i)}
              className="grid size-6 place-items-center"
            >
              <span className={cn('block size-2 rounded-full lg:size-3', i === index ? 'bg-primary' : 'bg-border-soft')} />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
