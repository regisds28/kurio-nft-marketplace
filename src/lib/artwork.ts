import type { Artwork } from '@/api/contracts'

export const ARTWORK_SRC: Record<Artwork, { src: string; width: number; height: number }> = {
  ape: { src: '/images/nft/ape.webp', width: 432, height: 432 },
  sage: { src: '/images/nft/sage.webp', width: 294, height: 294 },
  noir: { src: '/images/nft/noir.webp', width: 238, height: 238 },
  amber: { src: '/images/nft/amber.webp', width: 238, height: 238 },
}

export const SAGE_PORTRAIT = { src: '/images/nft/sage-portrait.webp', width: 294, height: 350 }

export const ARTWORK_ALT: Record<Artwork, string> = {
  ape: 'Macaco de pelagem marrom com óculos redondos de lentes verdes e jaqueta universitária verde com colar de esmeralda',
  sage: 'Gorila de pelagem cinza com chapéu bucket verde-oliva e moletom roxo com capuz',
  noir: 'Gorila de pelagem preta com brinco dourado, gola alta verde-escura e blazer bege',
  amber: 'Macaco de pelagem laranja com fones de ouvido verdes e jaqueta bege sobre fundo circular verde-claro',
}

export const ARTWORK_ORDER: Artwork[] = ['ape', 'sage', 'noir', 'amber']
