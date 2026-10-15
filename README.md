# Kurio — Marketplace de NFTs (desafio frontend)

SPA em **React 19 + TypeScript** que implementa o fluxo completo de um marketplace de NFTs: catálogo, detalhe, carrinho, pagamento com carteira simulada, confirmação, login/cadastro, perfil e carteiras — contra uma **API REST e um servidor Socket.IO simulados na camada de rede com MSW**.

| Camada | Tecnologia |
|---|---|
| Rotas | TanStack Router (rotas em código, `validateSearch` tolerante, rotas privadas) |
| Dados | TanStack Query + Axios (cliente único) |
| Tempo real | `socket.io-client` (conexão real) ↔ servidor simulado com `@mswjs/socket.io-binding` |
| UI | Tailwind CSS v4 + componentes no padrão shadcn/ui (Radix) |
| Formulários | react-hook-form + zod |
| Mocks | MSW (`setupWorker`): REST, WebSocket, persistência, cenários |
| Testes | Vitest (domínio dos mocks), Playwright (E2E + regressão visual), Lighthouse |

> Documentação de arquitetura (contratos REST/eventos, política de sessão, cache, reconciliação, decisões de UX, desvios do Figma): **[ARCHITECTURE.md](./ARCHITECTURE.md)**.

## Como rodar

Requisitos: Node ≥ 20.19 e npm.

```bash
npm ci
npm run dev          # http://localhost:5173 — mocks ligados (.env)
```

Comandos:

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com mocks (MSW) ligados |
| `npm run build` | `tsc -b` (typecheck) + build de produção em `dist/` |
| `npm run preview` | Serve o build em http://localhost:4173 (com mocks, é o que o Playwright/Lighthouse usam) |
| `npm run typecheck` | TypeScript estrito, sem emitir |
| `npm run lint` | ESLint (inclui `jsx-a11y`) |
| `npm test` | Vitest — domínio dos mocks (catálogo, carrinho, cotação, pedidos, idempotência) |
| `npm run test:e2e` | Playwright (compila e serve o app sozinho): 21 cenários E2E em desktop e mobile + regressão visual |
| `npm run test:e2e:update` | Regrava os baselines da regressão visual |
| `npm run test:e2e:report` | Abre o relatório HTML do Playwright (traces das falhas incluídos) |
| `npm run lighthouse` | Lighthouse em Início e Detalhe (mobile e desktop, 3 execuções, mediana) → `lighthouse/SUMMARY.md` e `lighthouse/reports/` |

Se o Playwright não encontrar o Chromium, instale-o (`npx playwright install chromium`) **ou** aponte um existente: `PW_CHROMIUM_PATH=/caminho/chromium npm run test:e2e` (e `CHROME_PATH=...` para o Lighthouse).

### Variáveis de ambiente (`.env`, ver `.env.example`)

| Variável | Padrão | Efeito |
|---|---|---|
| `VITE_ENABLE_MOCKS` | `true` | Liga MSW (REST + Socket.IO). Com `false` o app fala com a API real em `VITE_API_BASE_URL` |
| `VITE_MOCK_SCENARIO` | `default` | Cenário inicial dos mocks |
| `VITE_MOCK_PANEL` | `true` | Mostra o painel flutuante "Mocks" |
| `VITE_API_BASE_URL` | `/api` | Base das chamadas REST |
| `VITE_SOCKET_URL` | *(origem da página)* | Origem do Socket.IO (caminho `/socket.io/`) |

## Credenciais fictícias

| Usuário | E-mail | Senha | Observações |
|---|---|---|---|
| Regis Paiva | `regispaiva@kurio.test` | `Kurio#2026` | Carrinho semeado (3 itens, total 26.846 ETH), carteira principal e reserva, 2 favoritos |

Na tela de login, o botão **Preencher** insere as credenciais de Nova. Cupons: `KURIO10` (10 %), `BEMVINDO5` (5 %), `EXPIRED20` (expirado). CPF válido para o pagamento: `529.982.247-25`.

## Cenários dos mocks (seleção e reset)

Os cenários são combináveis (separados por vírgula) e podem ser escolhidos de três formas:

1. **URL**: `http://localhost:5173/?scenario=fast,payment-declined` (fica salvo no `localStorage`);
2. **Painel flutuante "Mocks"** (canto inferior esquerdo): marca/desmarca cenários, **Restaurar seed**, **Expirar sessão**, muda preço/estoque de um NFT, derruba ou "desliga" o socket;
3. **Console / testes**: `window.__KURIO_MOCK__.setScenario('fast')`, `.reset()`, `.expireSession()`, `.nft.update({ id, priceEth })`, `.realtime.disconnect()`, `.orders.list()` …

O banco simulado (catálogo, favoritos, carrinho, perfil, carteiras, pedidos) persiste em `localStorage` e sobrevive a refresh; **Restaurar seed** (ou `__KURIO_MOCK__.reset()`) volta ao estado inicial conhecido.

| Cenário | Efeito |
|---|---|
| `default` | Caminho feliz, latência 60–220 ms |
| `fast` | Sem latência; pedido resolve em 400 ms (usado pelos testes) |
| `slow` / `jitter` | Latência alta / variável (respostas fora de ordem) |
| `empty` | Catálogo vazio |
| `offline` | Todas as chamadas `/api/*` falham na rede |
| `server-error` | `GET /api/nfts` responde 500 |
| `flaky` | As 2 primeiras leituras respondem 503 e depois recuperam |
| `forbidden` | Perfil e carteiras respondem 403 |
| `session-expired` / `session-short` | Próxima chamada autenticada responde 401 / sessão de 30 s |
| `signup-conflict` | Cadastro responde 409 (e-mail/usuário já usado) |
| `favorites-failure` | Favoritar/desfavoritar responde 500 uma vez (rollback) |
| `price-change` | O preço de um item muda **no instante da criação do pedido** (409 `quote_stale`) |
| `sold-out` | A edição de um item esgota no instante da criação do pedido |
| `order-timeout` | O pedido é criado, mas a resposta nunca chega (timeout → reenvio idempotente) |
| `payment-declined` | A "rede" recusa o pagamento (pedido `declined`) |
| `wallet-rejected` | A carteira recusa a conexão simulada |

### Reproduzindo os fluxos de falha

1. **Pagamento recusado** — `?scenario=fast,payment-declined`, entre como Nova → *Carrinho* → *Pagamento* → informe o CPF, conecte a carteira, *Revisar pedido* → *Confirmar compra*. O pedido termina `declined`, **o carrinho é mantido** e há "Tentar novamente".
2. **Timeout na criação** — `?scenario=fast,order-timeout`: o primeiro envio não recebe resposta; o app reenvia com a **mesma `Idempotency-Key`** e o servidor devolve o mesmo pedido (um único pedido é criado).
3. **Preço muda no pagamento** — `?scenario=fast,price-change`: ao confirmar, a API responde `409 quote_stale` com a cotação atual; a tela mostra o que mudou e exige **nova confirmação**. Também dá para mudar o preço pelo painel enquanto está na revisão (evento `nft.updated`).
4. **Carteira recusa** — `?scenario=fast,wallet-rejected`: a conexão falha, a UI explica e permite tentar de novo.
5. **Sessão expirada** — painel → *Expirar sessão* (ou `session-short`): a próxima chamada leva ao login com `redirect` para a tela de origem; depois do login você volta ao mesmo ponto.
6. **Socket caiu** — painel → *Derrubar socket* / *Socket offline*: aparece aviso de reconexão e, ao voltar, as queries ativas são revalidadas via REST.

## Testes

- **Vitest** (`npm test`): 26 testes do domínio dos mocks (paginação, filtros/facetas, cotação decimal exata, limites de estoque, cupom, merge de carrinho visitante, idempotência, estados terminais, snapshot imutável do recibo, SHA-256).
- **Playwright** (`npm run test:e2e`), projetos `desktop` (1440×900) e `mobile` (390×844) para os 21 cenários E2E, e `visual` para regressão visual:
  - catálogo com filtros/ordenar/paginar na URL, vazio e erro; parâmetros inválidos;
  - detalhe (acesso direto, 404, limite de quantidade); carrinho (visitante, persistência, merge ao entrar, cupom, remoção, decimais exatos);
  - favoritos por usuário com rollback; sessão expirada preservando contexto; rotas privadas;
  - pagamento confirmado (recibo, carrinho limpo), recusado (carrinho mantido, nova tentativa), carteira recusada, timeout idempotente (1 pedido), preço mudando durante o pagamento;
  - tempo real: `nft.updated` (duplicata e versão antiga ignoradas), reconexão + reconciliação, sem vazamento de `order.updated` entre usuários;
  - acessibilidade/responsividade: sem rolagem horizontal, skip link, ações fora de escopo.
  - **Visual**: Início, Detalhe, Carrinho, Pagamento (e revisão) em 390 / 768 / 1440 px, com relógio, cenário `fast`, dados semeados e animações controlados. Baselines em `e2e/__screenshots__/`.
- **Lighthouse**: ver `lighthouse/SUMMARY.md` e a seção "Lighthouse" do ARCHITECTURE.md.

## Deploy (Vercel / Netlify)

`vercel.json` (fallback SPA + cache) e `public/_redirects` (Netlify) já estão no repositório. Build: `npm run build`, saída `dist/`. O `.env` versionado deixa os mocks ligados — é o que permite avaliar o app publicado sem backend. O Service Worker do MSW é servido de `/mockServiceWorker.js` (precisa de HTTPS, que Vercel/Netlify fornecem).

## Funcionalidades fora de escopo

Páginas editoriais (Criadores, Aprenda), suporte, atividade, ofertas, downloads, pedidos antigos, redes sociais etc. **não fingem sucesso**: mostram um aviso informativo ("… não faz parte desta versão da demonstração") e anunciam o aviso por região `aria-live`.
