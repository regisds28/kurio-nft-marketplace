import { useEffect } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { Catalog } from '@/features/catalog/Catalog'
import { Blog } from '@/features/home/Blog'
import { Hero } from '@/features/home/Hero'
import { Promos } from '@/features/home/Promos'
import { useDocumentTitle } from '@/lib/use-document-title'

const SHELL = 'mx-auto w-full max-w-[1200px] px-4 sm:px-6 xl:px-0'

export function HomePage() {
  useDocumentTitle('Início')
  const hash = useRouterState({ select: (s) => s.location.hash })
  useEffect(() => {
    if (hash === 'catalogo') document.getElementById('catalogo')?.scrollIntoView({ block: 'start' })
  }, [hash])

  return (
    <div className={`${SHELL} flex flex-col gap-10 py-4 lg:gap-16 lg:py-8`}>
      <Hero />
      <Catalog />
      <Promos />
      <Blog />
    </div>
  )
}
