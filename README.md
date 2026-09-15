# Órbita Web

Dashboard do Órbita. Vite + React 19 + TypeScript + TanStack Router/Query + Tailwind v4
+ shadcn/ui, seguindo a identidade visual em
`../identidade-visual/Órbita - Identidade Visual.md` (Space Grotesk + JetBrains Mono,
tokens de cor claro/escuro).

## Rodando localmente

```bash
yarn install
yarn dev
```

Por padrão aponta para `http://localhost:3000` (a `orbita-api` rodando localmente).
Para apontar para a API no Railway, copie `.env.example` para `.env` e ajuste
`VITE_API_URL`. Para a tela de assinatura funcionar, preencha também
`VITE_PAGARME_PUBLIC_KEY` (a chave pública do Pagar.me, `pk_...` — ver
`../docs/assinatura.md`).

## Build

```bash
yarn build      # tsc -b && vite build — gera dist/
yarn preview    # serve o build localmente
```

Na primeira vez que você rodar `yarn dev` ou `yarn build`, o plugin do TanStack Router
gera `src/routeTree.gen.ts` automaticamente a partir dos arquivos em `src/routes/`. Esse
arquivo é código gerado — não editar à mão, mas **deve ser commitado** (é isso que
permite `tsc -b` type-checar as rotas sem precisar rodar o Vite antes).

## Deploy

Sem preferência de host definida ainda — o Palpite Arena web usa Vercel, que também
serve bem aqui (build estático). Qualquer host de SPA funciona; só garantir rewrite de
todas as rotas para `index.html` (TanStack Router faz roteamento client-side).

## Estrutura

```
src/
├── api/            # um arquivo por recurso da API (auth, usuarios, roles, financeiro, projetos)
├── components/ui/  # primitivos estilo shadcn (Button, Input, Card, Table, ...)
├── components/layout/
├── lib/            # api client, query client, auth helper, formatação de dinheiro/data
├── stores/         # Zustand (sessão de auth)
├── pages/          # componentes de página, organizados por módulo
│   └── landing/    # página inicial pública (marketing) em "/"
└── routes/         # arquivos de rota do TanStack Router (file-based)
```

## Landing page e assinatura

`/` é pública e mostra a landing page (`src/pages/landing/LandingPage.tsx`) para quem
não está logado — redireciona direto para `/financeiro` se já houver sessão. A tela de
assinatura (`/assinatura`, autenticada) tokeniza o cartão direto no navegador via
`src/lib/pagarme.ts` — o número/CVV nunca passam pela nossa API. Ver
`../docs/assinatura.md` para o fluxo completo.

## Autenticação

Sem refresh token na v1 (ver `../api/README.md`): a sessão fica em `localStorage`
(`orbita-auth`, via `zustand/persist`) com um único `accessToken` válido por 7 dias. Um
401 de qualquer rota que não seja `/auth/*` desloga automaticamente (ver
`src/lib/api.ts`).
