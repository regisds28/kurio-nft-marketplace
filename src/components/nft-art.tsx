import type { Artwork } from '@/api/contracts'
import { ARTWORK_ALT, ARTWORK_SRC } from '@/lib/artwork'
import { cn } from '@/lib/utils'

interface Props {
  artwork: Artwork
  alt?: string
  className?: string
  imgClassName?: string
  priority?: boolean
  sizes?: string
}

export function NftArt({ artwork, alt, className, imgClassName, priority = false, sizes }: Props) {
  const { src, width, height } = ARTWORK_SRC[artwork]
  return (
    <div className={cn('overflow-hidden', className)}>
      <img
        src={src}
        width={width}
        height={height}
        alt={alt ?? ARTWORK_ALT[artwork]}
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        {...(priority ? { fetchPriority: 'high' as const } : {})}
        className={cn('size-full object-cover', imgClassName)}
      />
    </div>
  )
}
