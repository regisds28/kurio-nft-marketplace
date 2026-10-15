import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export function MockPanel() {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<string[]>(() => window.__KURIO_MOCK__?.getScenario() ?? [])
  const [nftName, setNftName] = useState('Emerald Ape #042')
  const [offline, setOffline] = useState(false)
  const qc = useQueryClient()
  const mock = window.__KURIO_MOCK__
  if (!mock) return null

  const apply = (ids: string[]) => {
    setActive(ids)
    mock.setScenario(ids.length ? ids : ['default'])
    void qc.invalidateQueries()
  }
  const toggle = (id: string) => apply(active.includes(id) ? active.filter((x) => x !== id) : [...active, id])
  const withNft = (fn: (id: string) => void) => {
    const id = mock.nft.find(nftName)
    if (id) fn(id)
  }
  const btn = 'rounded border border-border-soft px-2 py-1 text-xs hover:border-accent focus-visible:outline-2'

  return (
    <div className="fixed bottom-24 left-3 z-40 text-xs lg:bottom-4" data-testid="mock-panel">
      <button type="button" className={`${btn} bg-surface-dark`} aria-expanded={open} aria-controls="mock-panel-body" onClick={() => setOpen((v) => !v)}>
        {open ? 'Fechar mocks' : 'Mocks'}
      </button>
      {open && (
        <div id="mock-panel-body" role="region" aria-label="Controle dos mocks" className="mt-2 flex max-h-[70dvh] w-[300px] max-w-[calc(100vw-24px)] flex-col gap-3 overflow-y-auto rounded-lg border border-border-soft bg-surface-card p-3 shadow-xl">
          <fieldset>
            <legend className="mb-1 font-bold">Cenários (combináveis)</legend>
            {mock.scenarios.map((s) => (
              <label key={s.id} className="flex items-start gap-2 py-0.5" title={s.description}>
                <input type="checkbox" checked={active.includes(s.id)} onChange={() => toggle(s.id)} />
                <span>{s.label} <span className="text-secondary">({s.id})</span></span>
              </label>
            ))}
          </fieldset>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btn} onClick={() => { mock.reset(); window.location.assign('/') }}>Restaurar seed</button>
            <button type="button" className={btn} onClick={() => { mock.expireSession(); void qc.invalidateQueries() }}>Expirar sessão</button>
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 font-bold">Eventos em tempo real</legend>
            <label className="flex flex-col gap-1">NFT
              <select className="rounded border border-border-soft bg-surface-dark p-1" value={nftName} onChange={(e) => setNftName(e.target.value)}>
                {['Emerald Ape #042', 'Violet Nomad #314', 'Ivory Baron #088'].map((n) => <option key={n}>{n}</option>)}
              </select>
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btn} onClick={() => withNft((id) => mock.nft.update({ id, priceEth: '1.35' }))}>Mudar preço</button>
              <button type="button" className={btn} onClick={() => withNft((id) => mock.nft.update({ id, editions: { 'ed-1-50': 0 }, reason: 'sold_out' }))}>Esgotar 1/50</button>
              <button type="button" className={btn} onClick={() => withNft((id) => mock.nft.update({ id, editions: { 'ed-1-50': 20 }, reason: 'restocked' }))}>Repor</button>
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btn} onClick={() => mock.realtime.disconnect()}>Derrubar socket</button>
            <button type="button" className={btn} onClick={() => { mock.realtime.setOffline(!offline); setOffline(!offline) }}>{offline ? 'Socket online' : 'Socket offline'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
