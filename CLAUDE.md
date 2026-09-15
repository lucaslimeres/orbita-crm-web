# Órbita Web — Contexto do repo

> Copiar este arquivo para a raiz do repo `orbita-web` como `CLAUDE.md`. Este contexto
> soma com o `CLAUDE.md` compartilhado da pasta-mãe (`orbita-context/`).

## Stack

Vite + React 19 + TypeScript + TanStack Router (file-based, `src/routes/`) + TanStack
Query + Tailwind v4 + componentes estilo shadcn (`src/components/ui/`, escritos à mão —
não instalados via CLI) + Zustand (sessão de auth, com persist em localStorage). Fontes
e cores seguem `../identidade-visual/Órbita - Identidade Visual.md` (Space Grotesk +
JetBrains Mono, tokens `--bg/--surface/--text/--accent/--positive/--negative/--warning`
em `src/index.css`, com `.dark` override).

Estrutura:
- `src/api/` — um arquivo por recurso (`auth.ts`, `usuarios.ts`, `roles.ts`,
  `financeiro.ts`, `projetos.ts`), cada um só chamando `src/lib/api.ts`.
- `src/pages/<modulo>/` — componentes de página; módulos com sub-seções (ex.
  Financeiro) quebram em `XxxSection.tsx` dentro da mesma pasta.
- `src/routes/` — arquivos finos que só importam a página e chamam
  `createFileRoute(...)`; a lógica sempre vive em `src/pages/`.
- `src/routeTree.gen.ts` — **gerado automaticamente** pelo plugin do TanStack Router
  (`vite.config.ts`) a partir de `src/routes/`. Não editar à mão; roda de novo sozinho
  em qualquer `dev`/`build`.
- `/` é a landing page pública (`src/pages/landing/`) — redireciona pra `/financeiro`
  se já houver sessão. É a única página com o wrapper `dark` fixo (não segue o toggle
  de tema do usuário, igual `/login` e `/cadastro`).

**v1 usa `useState` + validação manual nos formulários, não React Hook Form/Zod** — os
forms são simples o bastante (poucos campos, sem validação cruzada) que a abstração não
se pagou ainda. Se um formulário crescer em complexidade, aí sim vale introduzir RHF+Zod
naquele form específico — não é preciso migrar tudo de uma vez.

## Regras específicas do Web

- Nunca calcular saldo, totais financeiros ou permissão efetiva no cliente — sempre
  consumir o que a API já retorna calculado.
- Esconder/desabilitar ações na UI conforme permissão do usuário logado é só cosmético —
  a checagem real acontece sempre na API.
- Valores monetários chegam em centavos da API; formatar em R$ só na renderização
  (`src/lib/format.ts`). Inputs de valor coletam string em reais e convertem para
  centavos só no submit.
- Sem refresh token na v1 (ver `../api/README.md`) — sessão expira e desloga sozinha
  depois de 7 dias; não implementar renovação silenciosa sem antes checar se a API já
  suporta.
- **Cartão de assinatura nunca vai pro nosso backend** — `src/lib/pagarme.ts` tokeniza
  direto no Pagar.me (`VITE_PAGARME_PUBLIC_KEY`) e só o token sai do navegador. Não
  "simplificar" isso mandando o `cardForm` cru pra API — é a única coisa deste projeto
  onde a v1 é deliberadamente mais rigorosa que o Palpite Arena, não mais simples.
