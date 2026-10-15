#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as chromeLauncher from 'chrome-launcher'
import lighthouse, { desktopConfig } from 'lighthouse'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'lighthouse', 'reports')
const PORT = Number(process.env.LH_PORT ?? 4173)
const RUNS = Number(process.env.LH_RUNS ?? 3)
const SCENARIO = process.env.LH_SCENARIO ?? 'default'
const BASE = `http://localhost:${PORT}`
const PAGES = [
  { id: 'inicio', label: 'Início', path: '/' },
  { id: 'detalhe', label: 'Detalhe', path: '/nft/nft-001' },
]
const TARGETS = { performance: 90, accessibility: 95, 'best-practices': 95, seo: 90 }

const up = async () => fetch(BASE).then((r) => r.ok).catch(() => false)
let server = null
if (!(await up())) {
  server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'ignore', shell: process.platform === 'win32' })
  for (let i = 0; i < 60 && !(await up()); i++) await new Promise((r) => setTimeout(r, 500))
  if (!(await up())) throw new Error('vite preview não respondeu — rode `npm run build` antes.')
}

const median = (arr) => [...arr].sort((a, b) => a - b)[Math.floor(arr.length / 2)]
const rows = []
await mkdir(outDir, { recursive: true })

for (const form of ['mobile', 'desktop']) {
  for (const page of PAGES) {
    const runs = []
    for (let i = 0; i < RUNS; i++) {
      const chrome = await chromeLauncher.launch({
        chromePath: process.env.CHROME_PATH,
        chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'],
      })
      try {
        const url = `${BASE}${page.path}?scenario=${SCENARIO}`
        const result = await lighthouse(
          url,
          { port: chrome.port, output: ['html', 'json'], logLevel: 'error', locale: 'pt-BR' },
          form === 'desktop' ? desktopConfig : undefined,
        )
        if (!result) throw new Error('sem resultado')
        runs.push({ lhr: result.lhr, html: result.report[0], json: result.report[1] })
      } finally {
        await chrome.kill()
      }
    }
    const scores = runs.map((r) => r.lhr.categories.performance.score ?? 0)
    const mid = runs[scores.indexOf(median(scores))]
    const lhr = mid.lhr
    const base = join(outDir, `${page.id}-${form}`)
    await writeFile(`${base}.html`, mid.html)
    await writeFile(`${base}.json`, mid.json)
    const cat = (k) => Math.round((lhr.categories[k].score ?? 0) * 100)
    const audit = (k) => lhr.audits[k].numericValue
    rows.push({
      page: page.label,
      form,
      performance: cat('performance'),
      accessibility: cat('accessibility'),
      'best-practices': cat('best-practices'),
      seo: cat('seo'),
      lcp: audit('largest-contentful-paint'),
      cls: audit('cumulative-layout-shift'),
      tbt: audit('total-blocking-time'),
      all: scores.map((s) => Math.round(s * 100)),
      version: lhr.lighthouseVersion,
      ua: lhr.environment.hostUserAgent,
    })
    console.log(`${page.label} (${form}): perf ${cat('performance')} a11y ${cat('accessibility')} bp ${cat('best-practices')} seo ${cat('seo')}`)
  }
}
server?.kill()

const ok = (k, v) => (v >= TARGETS[k] ? '✅' : '❌')
const md = [
  '# Lighthouse — resultados',
  '',
  `Lighthouse ${rows[0]?.version} · ${RUNS} execuções por combinação (relatório = execução mediana por performance) · build de produção servido por \`vite preview\` com mocks MSW (cenário \`${SCENARIO}\`).`,
  `Navegador: ${rows[0]?.ua}`,
  '',
  '| Tela | Dispositivo | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT | Perf. das execuções |',
  '|---|---|---|---|---|---|---|---|---|---|',
  ...rows.map(
    (r) =>
      `| ${r.page} | ${r.form} | ${r.performance} ${ok('performance', r.performance)} | ${r.accessibility} ${ok('accessibility', r.accessibility)} | ${r['best-practices']} ${ok('best-practices', r['best-practices'])} | ${r.seo} ${ok('seo', r.seo)} | ${(r.lcp / 1000).toFixed(2)} s | ${r.cls.toFixed(3)} | ${Math.round(r.tbt)} ms | ${r.all.join(' / ')} |`,
  ),
  '',
  `Metas: Performance ≥ ${TARGETS.performance}, Acessibilidade ≥ ${TARGETS.accessibility}, Boas práticas ≥ ${TARGETS['best-practices']}, SEO ≥ ${TARGETS.seo}.`,
  '',
  'Relatórios completos em `lighthouse/reports/` (HTML e JSON). Justificativas para metas não atingidas ficam na seção "Lighthouse" do ARCHITECTURE.md.',
  '',
]
await writeFile(join(root, 'lighthouse', 'SUMMARY.md'), md.join('\n'))
console.log(`\nResumo em lighthouse/SUMMARY.md`)
