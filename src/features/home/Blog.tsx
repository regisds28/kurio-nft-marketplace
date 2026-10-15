import { ArrowRight } from 'lucide-react'
import { ErrorState } from '@/components/states'
import { NftArt } from '@/components/nft-art'
import { Skeleton } from '@/components/ui/skeleton'
import { notAvailable } from '@/lib/out-of-scope'
import { useEditorialPosts } from '@/features/catalog/hooks'

export function Blog() {
  const { data, isPending, isError, error, refetch } = useEditorialPosts()
  return (
    <section aria-labelledby="blog-title" className="hidden lg:block">
      <h2 id="blog-title" className="text-[28px] leading-[37px] font-bold">Diário da Cunhagem</h2>
      <p className="mt-3 text-sm leading-[18px] text-muted">
        Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
      </p>
      <div className="mt-10 grid grid-cols-4 gap-6">
        {isError ? (
          <div className="col-span-4">
            <ErrorState error={error} onRetry={() => void refetch()} title="Não foi possível carregar as publicações" />
          </div>
        ) : isPending ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[369px] rounded-lg" />)
        ) : (
          data.map((post) => (
            <article key={post.id} className="overflow-hidden rounded-lg bg-surface-card">
              <NftArt artwork={post.artwork} alt="" className="h-[195px] w-full" sizes="268px" />
              <div className="flex h-[174px] flex-col px-4 py-3">
                <p className="text-xs leading-4 text-secondary">
                  {post.dateLabel} | Leitura de {post.readMinutes} min
                </p>
                <h3 className="mt-3 text-base leading-[21px] font-bold">{post.title}</h3>
                <p className="mt-2 text-xs leading-4 text-muted">{post.excerpt}</p>
                <button
                  type="button"
                  onClick={() => notAvailable('A leitura do artigo')}
                  className="mt-auto inline-flex items-center gap-1 text-xs font-bold text-accent hover:underline"
                >
                  Ler mais <ArrowRight className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
