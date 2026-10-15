# Lighthouse — resultados

Lighthouse 13.5.0 · 3 execuções por combinação (relatório = execução mediana por performance) · build de produção servido por `vite preview` com mocks MSW (cenário `default`).
Navegador: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/141.0.0.0 Safari/537.36

| Tela | Dispositivo | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT | Perf. das execuções |
|---|---|---|---|---|---|---|---|---|---|
| Início | mobile | 78 ❌ | 100 ✅ | 100 ✅ | 100 ✅ | 4.25 s | 0.026 | 138 ms | 78 / 78 / 77 |
| Detalhe | mobile | 75 ❌ | 100 ✅ | 100 ✅ | 100 ✅ | 4.53 s | 0.000 | 140 ms | 76 / 75 / 71 |
| Início | desktop | 99 ✅ | 100 ✅ | 100 ✅ | 100 ✅ | 0.94 s | 0.000 | 2 ms | 99 / 98 / 99 |
| Detalhe | desktop | 98 ✅ | 100 ✅ | 100 ✅ | 100 ✅ | 1.03 s | 0.000 | 0 ms | 98 / 98 / 99 |

Metas: Performance ≥ 90, Acessibilidade ≥ 95, Boas práticas ≥ 95, SEO ≥ 90.

Relatórios completos em `lighthouse/reports/` (HTML e JSON). Justificativas para metas não atingidas ficam na seção "Lighthouse" do ARCHITECTURE.md.
