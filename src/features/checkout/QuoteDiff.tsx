import { AlertTriangle } from 'lucide-react'
import type { Quote } from '@/api/contracts'
import { Button } from '@/components/ui/button'
import { formatEth } from '@/lib/money'

export function diffQuotes(previous: Quote, current: Quote): string[] {
  const out: string[] = []
  const prevLines = new Map(previous.lines.map((l) => [l.itemId, l]))
  for (const line of current.lines) {
    const before = prevLines.get(line.itemId)
    if (!before) out.push(`${line.name} (${line.editionLabel}) entrou na cotação.`)
    else {
      if (before.unitPriceEth !== line.unitPriceEth) {
        out.push(`${line.name}: preço de ${formatEth(before.unitPriceEth)} para ${formatEth(line.unitPriceEth)}.`)
      }
      if (before.quantity !== line.quantity) out.push(`${line.name}: quantidade de ${before.quantity} para ${line.quantity}.`)
    }
  }
  for (const before of previous.lines) {
    if (!current.lines.some((l) => l.itemId === before.itemId)) out.push(`${before.name} (${before.editionLabel}) saiu da cotação.`)
  }
  for (const issue of current.issues) out.push(issue.message)
  if (previous.networkFeeEth !== current.networkFeeEth) {
    out.push(`Taxa de rede de ${formatEth(previous.networkFeeEth, { minDecimals: 3 })} para ${formatEth(current.networkFeeEth, { minDecimals: 3 })}.`)
  }
  if (previous.discountEth !== current.discountEth) {
    out.push(`Desconto de ${formatEth(previous.discountEth)} para ${formatEth(current.discountEth)}.`)
  }
  if (out.length === 0 && previous.totalEth !== current.totalEth) out.push('Os valores do pedido foram atualizados.')
  return out
}

export function QuoteChanges({
  previous,
  current,
  onAccept,
  onBack,
}: {
  previous: Quote
  current: Quote
  onAccept: () => void
  onBack: () => void
}) {
  const diffs = diffQuotes(previous, current)
  const blocked = current.issues.length > 0
  return (
    <div role="alert" className="rounded-lg border border-primary/60 bg-primary/10 p-4" data-testid="quote-changes">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden="true" />
        <div className="flex-1">
          <h2 className="text-base font-bold text-accent">Os valores do seu pedido mudaram</h2>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {diffs.map((d) => <li key={d}>{d}</li>)}
          </ul>
          <p className="mt-3 text-sm">
            Total anterior <span className="line-through">{formatEth(previous.totalEth, { minDecimals: 3 })}</span> → novo total{' '}
            <strong>{formatEth(current.totalEth, { minDecimals: 3 })}</strong>
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {blocked ? (
              <Button variant="outline" size="sm" onClick={onBack}>Voltar ao carrinho</Button>
            ) : (
              <Button size="sm" onClick={onAccept} data-testid="accept-changes">Aceitar novos valores</Button>
            )}
          </div>
          {!blocked && <p className="mt-2 text-xs text-muted">Depois de aceitar, confirme a compra novamente.</p>}
        </div>
      </div>
    </div>
  )
}
