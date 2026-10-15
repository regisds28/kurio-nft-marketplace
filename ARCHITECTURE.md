# Arquitetura

Este documento descreve as decisões do projeto: contratos REST e de eventos, política de sessão, estado do carrinho, cache, reconciliação em tempo real, fluxo de pagamento, limitações, decisões de UX e desvios do Figma.

## 1. Visão geral

```
UI (React) ─ hooks por feature ─ TanStack Query ─ endpoints.ts ─ Axios (http.ts) ─┐
                    │                                                              ├─► MSW (service worker) ─► handlers REST (src/mocks/handlers)
                    └─ RealtimeProvider ─ socket.io-client ──────────────────────┘                       └► servidor Socket.IO simulado (src/mocks/socket.ts)
                                                                                                          └─ db.ts (estado + localStorage) ◄─ domínio (src/mocks/domain)
```

- **Os mocks vivem só na camada de rede.** `http.ts` não conhece respostas fictícias; `RealtimeProvider` usa o `socket.io-client` real. Trocar `VITE_ENABLE_MOCKS=false` aponta o app para uma API real sem mudar o código das telas.
- **Fonte única de eventos**: toda mutação do domínio mocado publica no `mockBus`; o servidor Socket.IO simulado assina esse barramento. Os eventos que o cliente recebe são os mesmos fatos que as respostas REST refletem — nada é "simulado na UI".
- Organização: `src/api` (contratos zod/TS, erros, cliente HTTP, endpoints, chaves de cache), `src/features/*` (hooks e componentes por domínio), `src/routes` (telas), `src/realtime`, `src/mocks`, `src/components` (UI e layout).

## 2. Contratos REST

Tipos e validações em `src/api/contracts.ts` (zod onde há entrada do usuário). Valores em ETH trafegam como **strings decimais** (`"26.846"`) e são somados/formatados com `decimal.js` (`src/lib/money.ts`); nunca `number`.

| Método e rota | Auth | Descrição |
|---|---|---|
| `POST /api/auth/register` · `POST /api/auth/login` | — | Devolve `{ token, user, expiresAt }`. Aceita `guestCartId` para mesclar o carrinho de visitante |
| `POST /api/auth/logout` · `GET /api/session` | token | Encerra / consulta a sessão |
| `GET /api/nfts` | — | Lista paginada (9/página). Query: `q`, `collections`, `networks`, `minPrice`, `maxPrice`, `sort`, `tab`, `page`. Devolve `items`, `total`, `totalPages`, `page` e **facetas** (contagens que ignoram o próprio filtro) |
| `GET /api/nfts/featured` · `/:id` · `/:id/related` | — | Destaques, detalhe (404 `not_found`), relacionados |
| `GET/PUT/DELETE /api/favorites[/:nftId]` | sim | Favoritos **por usuário** |
| `GET /api/cart` · `POST /api/cart/items` · `PATCH/DELETE /api/cart/items/:id` · `PUT/DELETE /api/cart/coupon` | visitante (`X-Guest-Cart`) ou token | Carrinho com `status` por item (`available`/`limited`/`unavailable`) e `version` |
| `POST /api/quotes` | idem | Cotação por rede: linhas, subtotal, desconto, taxa de rede, total, `issues[]` e `revision` |
| `POST /api/orders` | sim | Cria o pedido (`Idempotency-Key` obrigatório). Estados `pending → confirmed \| declined` |
| `GET /api/orders[?status=]` · `GET /api/orders/:id` | sim | Consulta/polling |
| `GET/PATCH /api/profile` · `PUT /api/profile/password` · `POST/DELETE /api/profile/avatar` | sim | Perfil (avatar até 2 MB, PNG/JPG/WebP) |
| `GET/POST/PUT /api/wallets[/:id]` | sim | Carteira principal e secundária |
| `GET/POST/DELETE /api/wallet-connection` | sim | Conexão **simulada** da carteira (provedor + rede); o servidor guarda por usuário |

**Erros** seguem `{ error: { code, message, fields?, details?, retryable? } }`. Códigos: `validation_failed 422`, `session_invalid/session_expired/invalid_credentials 401`, `forbidden/wallet_rejected 403`, `not_found 404`, `email_taken/username_taken/availability_conflict/quote_stale/idempotency_conflict/wallet_not_connected 409`, `coupon_invalid/coupon_expired 422`, `payload_too_large 413`, `bad_request 400`, `internal_error 500`, `service_unavailable 503`. O cliente normaliza tudo em `ApiError` (`kind: http | network | timeout | canceled`, `retryable`, `fields`), e a UI nunca lida com `AxiosError`.

## 3. Eventos em tempo real (Socket.IO)

Transporte: **apenas WebSocket** (`transports: ['websocket']`, caminho `/socket.io/`). O long-polling HTTP do Socket.IO não é simulado.

| Evento | Direção | Payload |
|---|---|---|
| `session.authenticate` | cliente → servidor | `{ token \| null }`, enviado após cada `connect` |
| `session.authenticated` / `session.rejected` | servidor → cliente | `{ userId }` / `{ reason }` |
| `nft.updated` | servidor → todos | `priceEth`, `previousPriceEth`, `availableUnits`, `availability`, `editions[]`, `reason` |
| `order.updated` | servidor → **só o dono** | `status`, `declineReason`, `ownerId` |

Todo evento tem envelope `{ eventId, type, resource: { type, id }, version, occurredAt, payload }`.

**Aplicação no cliente (`src/realtime/apply.ts`)**: (1) **deduplicação** por `eventId` (janela de 500); (2) **descarte de versão antiga** por recurso (mapa `resource → maior versão vista`); (3) eventos de pedido só são aplicados se `ownerId` é o usuário atual; (4) atualiza por `setQueryData` o detalhe e as listas em cache e invalida carrinho/cotação quando o NFT está no carrinho; (5) mostra um aviso (toast + região `aria-live`).

**Reconciliação**: em **reconexão** o applier é zerado e as queries ativas são revalidadas via REST — eventos perdidos durante a queda não deixam a tela divergente. `order.updated` também tem um **polling de segurança** de 3 s enquanto o pedido está `pending`.

**Vazamento e limpeza**: uma conexão por identidade (visitante/usuário). Trocar de usuário desconecta, remove todos os listeners e recria o applier. O servidor simulado só entrega `order.updated` a conexões autenticadas como o dono (verificado em E2E lendo o log de envio). Ao desmontar, `removeAllListeners()` + `disconnect()`.

> **Armadilha de integração (documentada de propósito)**: o `engine.io-client` guarda o construtor de `WebSocket` **quando o módulo é avaliado**. Para o MSW interceptar o socket, `socket.io-client` é importado dinamicamente *depois* de `startMocks()` e não pode compartilhar chunk com o MSW (`vite.config.ts` não cria um chunk para `socket.io`). Além disso, o MSW remove o prefixo `/socket.io/` da URL antes de comparar, então `ws.link()` usa só a origem. Isso é específico dos mocks; com um backend real nada disso se aplica.

## 4. Sessão

- Token opaco + `expiresAt` em `localStorage` (`kurio.auth`), lido pelo cliente HTTP a cada requisição (`Authorization: Bearer`). Senhas **nunca** são guardadas em texto puro: o servidor simulado guarda apenas hash (SHA-256 com sal, `src/mocks/sha256.ts`) e o cliente só envia a senha no login/cadastro/troca. Credenciais são fictícias.
- **Expiração**: um temporizador no `SessionProvider` e o tratamento global de `401` (`session-bus`) encerram a sessão; o usuário vai para `/entrar?redirect=<tela de origem>&motivo=expirada`, e após o login volta à mesma tela. Rascunhos (checkout) por usuário sobrevivem.
- **Logout** (e troca de usuário): limpa o prefixo de cache `['user', …]`, rascunhos de pagamento, tentativa de pedido pendente local, desconecta o socket e remove listeners. Chaves privadas incluem o `userKey` (id do usuário ou `guest`), então dados de um usuário nunca são lidos por outro.
- **Sincronização entre abas**: evento `storage` replica login/logout.
- **Rotas privadas** (`/pagamento`, `/pedido/:id`, `/perfil`, `/carteiras`): `RequireAuth` leva ao login com `redirect` (só caminhos internos — `safeRedirect`).

## 5. Estado do carrinho

- Fonte da verdade: o **servidor** (`GET /api/cart`). Totais **sempre vêm da API** (`/api/quotes`); o cliente não soma preços para decidir cobrança.
- **Visitante**: carrinho identificado por `X-Guest-Cart` (id local em `localStorage`), persistente a refresh. **Ao autenticar**, o login/cadastro envia `guestCartId` e o servidor mescla respeitando limites de estoque e de 10 unidades por pedido; o carrinho do visitante é removido.
- **Disponibilidade**: cada item tem `status`; itens indisponíveis bloqueiam a compra e explicam o motivo; o stepper respeita o limite de quantidade.
- **Mutações do carrinho são serializadas** (`scope: { id: 'cart' }` no TanStack Query) para não competirem entre si; cada uma devolve o carrinho novo (`version`).
- **Tempo real**: `nft.updated` de um item do carrinho invalida carrinho e cotação; um painel descreve o que mudou (preço/disponibilidade) e o botão de pagamento reflete o novo estado.
- **Cupons** são validados pelo servidor (`coupon_invalid`, `coupon_expired`); o desconto vem na cotação.

## 6. Política de cache e retry (`src/app/query-client.ts`)

| Item | Política |
|---|---|
| `staleTime` / `gcTime` | 30 s / 5 min |
| Leituras | até **2 retentativas**, só para erros `retryable` (rede, timeout, 5xx), backoff `400·2ⁿ` ms (máx. 4 s). 4xx não repete |
| Mutações | **sem retry automático** (exceto criação de pedido, abaixo, que é idempotente) |
| Refetch | ao voltar o foco e ao reconectar a rede |
| Cotação | `staleTime: 0` (sempre revalidada) |
| Chaves | públicas: `['nfts', …]`, `['editorial']`; privadas: `['user', userKey, …]` |
| Respostas fora de ordem | a chave da query inclui todos os filtros e a UI exibe sempre os dados da chave atual; uma resposta lenta de filtro anterior só atualiza o cache da *sua* chave (cenário `jitter` reproduz a ordem trocada) |
| Favoritos | **atualização otimista** com rollback (`onMutate` guarda estado, `onError` restaura e avisa, `onSettled` revalida) |

## 7. Pagamento, idempotência e estados do pedido

1. **Dados + carteira** (formulário validado: nome, e-mail, CPF com dígitos verificadores; rascunho por usuário em `sessionStorage`), carteiras cadastradas, rede (a cotação é por rede) e provedor, com **conexão simulada** (conectar / recusa / desconectar).
2. **Revisão**: mostra dados, carteira, rede e itens com a cotação aceita (`revision`).
3. **Confirmar**: o app **revalida a cotação** antes de criar o pedido. Se `revision` ou `issues` mudaram, entra na fase `changes` (diferença destacada) e **exige nova confirmação explícita**. Um `409 quote_stale` do servidor segue o mesmo caminho usando `details.currentQuote`.
4. **Criação idempotente**: a tentativa (`Idempotency-Key` + corpo) é persistida por usuário **antes** do envio. Em timeout/queda de rede o mesmo par chave+corpo é reenviado (até 3 vezes; 0,8/1,6/3,2 s); após refresh, a tela retoma a tentativa pendente. O servidor devolve o mesmo pedido para a mesma chave+corpo e responde `409 idempotency_conflict` se o corpo mudar. Há trava contra duplo clique.
5. **Estados**: `pending → confirmed | declined`, estados terminais (não regridem, efeitos não se repetem). A confirmação só aparece para pedidos **`confirmed`** (`/pedido/:id`); `pending` mostra espera (polling + `order.updated`); `declined` mostra o motivo, **mantém o carrinho** e oferece nova tentativa.
6. Na confirmação o servidor baixa estoque, **remove do carrinho apenas o que foi comprado** e gera um **snapshot imutável** (base do recibo): mudar preço depois não altera o recibo.
7. Se existe pedido `pending`, `/pagamento` redireciona para ele (nunca cria um segundo).

## 8. Acessibilidade e responsividade

- Skeletons com shimmer que respeita `prefers-reduced-motion`; foco visível; link "Pular para o conteúdo"; foco vai ao `<main>` a cada navegação; erros de campo ligados por `aria-describedby`/`role="alert"`; mudanças assíncronas anunciadas por `LiveAnnouncer` (polite/assertive); diálogos e menus via Radix (foco preso, Esc, retorno de foco).
- Layout: desktop ≥ 1024 px (`lg:`); abaixo disso, layout mobile com grades mais largas em 768 px (**tablet é derivado do mobile**, já que o Figma não traz tablet). Sem rolagem horizontal (testado em 390/768/1440) e tolerância a zoom (unidades relativas, quebra de linha).
- Fluxos "bare" no mobile (Detalhe, Carrinho, Pagamento, Pedido, Login, Cadastro) escondem header/tab bar globais, como no Figma.

## 9. Lighthouse

Resultados completos em `lighthouse/SUMMARY.md` (relatórios HTML/JSON em `lighthouse/reports/`). Última medição (Lighthouse 13.5, Chromium 141 headless, build de produção com mocks, mediana de 3 execuções, emulação padrão: mobile com CPU 4× e rede 4G simulada):

| Tela | Dispositivo | Perf. | A11y | BP | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|---|
| Início | desktop | 99 | 100 | 100 | 100 | 0,94 s | 0,000 | 2 ms |
| Detalhe | desktop | 98 | 100 | 100 | 100 | 1,03 s | 0,000 | 0 ms |
| Início | mobile | **78** | 100 | 100 | 100 | 4,25 s | 0,026 | 138 ms |
| Detalhe | mobile | **75** | 100 | 100 | 100 | 4,53 s | 0,000 | 140 ms |

**Meta de performance mobile (≥ 90) não atingida — justificativa:** o gargalo é CPU de *script* na emulação 4× (≈1,2 s de avaliação de JS no Início): React/React-DOM, TanStack Router/Query, Radix, axios e o **MSW (~180 kB gz) que só existe por causa do mock**. FCP ≈ 3,2 s e LCP ≈ 4,3 s vêm de esperar esse JS antes da primeira renderização; a rede local não é o limitante (cada recurso responde em ms). Medi o mesmo build **sem MSW** (`VITE_ENABLE_MOCKS=false`): mobile sobe só para ~80, o que mostra que o restante é o custo do app em si. Já feito: code splitting por rota (`lazyRouteComponent`), chunks de vendor, `preload` da imagem do herói com `fetchpriority=high`, dimensões explícitas (CLS ≈ 0), fonte `woff2` com `font-display: swap`. Próximo passo se fosse necessário: casca HTML estática com o herói para antecipar FCP/LCP e hidratação parcial do catálogo. Acessibilidade, boas práticas e SEO cumprem as metas em todas as telas. Em desktop todas as metas são cumpridas. (Em ambientes com CPU mais rápida que a emulação, os valores reais tendem a ser melhores.)

Um CLS de 0,26 no Detalhe desktop foi encontrado e corrigido durante a medição: o rodapé aparecia na dobra enquanto o skeleton era curto e era empurrado quando o conteúdo chegava; agora o `<main>` tem altura mínima de uma tela no desktop.

## 10. Limitações conhecidas

- **Mocks, não backend**: o "servidor" roda no navegador (cada aba/contexto tem seu banco em `localStorage`); não há sincronização entre dispositivos. O Socket.IO simulado só cobre WebSocket e autentica por evento (`session.authenticate`), pois o binding não repassa `auth` do handshake nem suporta acks.
- **Hash de senha no mock** é didático (SHA-256 + sal em JS), não substitui um KDF de servidor.
- Tela **Perfil/Carteiras**: sem validação de endereço on-chain; "Igual à carteira principal" copia os dados, exceto o endereço (precisa ser distinto).
- **Mobile**: a ordenação e os filtros ficam na folha lateral aberta pelo botão de filtros (no desktop, a ordenação fica no cabeçalho da lista).
- Faixa de preço usa os limites dos dados semeados (0–3 ETH), diferentes dos exemplos do Figma (0,02–12,30).
- Vários textos do Figma são de exemplo (“Seguir criador”, redes sociais, etc.) e são tratados como **fora de escopo** (aviso informativo).

## 11. Decisões de UX e desvios do Figma

O arquivo Figma do desafio foi lido por meio da API de metadados/screenshots; a cota da ferramenta de leitura do Figma se esgotou durante o trabalho, então:

- **Pagamento (desktop)** no arquivo é só uma instância de componente ("Checkout Page"); o layout foi **inferido do Pagamento mobile** (cabeçalho "Pagamento com carteira", "Carteira conectada | Trocar carteira", cartões de carteira Reserva/Principal, "Carteira e rede" com WalletConnect/MetaMask/Coinbase Wallet, "Total:", "Confirmar compra") e do resumo do carrinho. Foi adicionada uma etapa explícita de **Revisão** e os campos de dados do colecionador exigidos pelo desafio.
- **Perfil e Carteiras** seguem a estrutura do Figma (menu lateral + formulários) com a lista de campos extraída dos metadados; rótulos de itens do menu fora de escopo foram deduzidos pelos ícones.
- **Detalhe**: no arquivo Figma os rótulos "Rede / Contrato / Direitos autorais" estão trocados em relação aos valores; o app os exibe de forma lógica.
- **Início** contém o catálogo (o item "Mercado" do menu leva a `/#catalogo`; `/mercado` redireciona). Blog e promoções aparecem só no desktop. O fundo da Início **não** é renderizado atrás do diálogo de login no desktop; a modal de confirmação de compra também fica sobre a tela de pedido (não sobre a Início).
- **Ativos**: as imagens dos NFTs são ilustrações próprias em WebP (o Figma usa imagens externas); os ícones são `lucide-react` e SVG inline para marcas (Facebook, Instagram, X, LinkedIn, YouTube), desenhados à mão.
- A **tab bar** mobile tem atalhos "Favoritos" e "Explorar" (câmera/scan) que mostram o aviso de fora de escopo.
- Fonte: Roboto Mono variável (`@fontsource-variable/roboto-mono`), como no arquivo.

## 12. Testes e determinismo

Os testes E2E dirigem os mesmos caminhos do usuário e usam a API de controle (`window.__KURIO_MOCK__`) só para **provocar condições** (expirar sessão, mudar preço, derrubar socket) — as consequências passam pelos handlers MSW e pelo transporte Socket.IO. A regressão visual fixa relógio (`page.clock`), cenário `fast`, dados semeados e desliga animações. Cada teste roda em contexto novo (banco e sessão isolados).
