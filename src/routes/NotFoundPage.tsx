import { Link } from '@tanstack/react-router'
import { EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { useDocumentTitle } from '@/lib/use-document-title'

export function NotFoundPage() {
  useDocumentTitle('Página não encontrada')
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-16 sm:px-6 xl:px-0">
      <EmptyState
        title="Página não encontrada"
        description="O endereço que você acessou não existe ou foi movido."
        action={
          <Button asChild>
            <Link to="/">Voltar ao início</Link>
          </Button>
        }
      />
    </div>
  )
}
