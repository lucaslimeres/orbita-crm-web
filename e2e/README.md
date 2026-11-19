# Testes de tela (Playwright)

```bash
yarn test:e2e
```

- Rodam em dois tamanhos: **celular** (390px) e **desktop** (1400px) — cada teste roda nos dois.
- O `webServer` do `playwright.config.ts` gera um build próprio (`dist-e2e/`, com
  `VITE_API_URL=http://api.orbita.test`) e sobe o `vite preview`.
- **A API é simulada** no navegador (`mock-api.ts`): cada teste declara as respostas de que
  precisa (`"GET /me": { body: me({ congelado: true }) }`); rota não declarada responde 404.
  Não precisa de banco nem da API rodando. As regras de negócio são testadas na API
  (`orbita-crm-api/test`); aqui o foco é o que a tela faz com cada resposta.
- `logado(page)` grava a sessão no `localStorage`, como o login faz.
- `semRolagemLateral(page)` falha se a página rolar para o lado (regra do responsivo).

Primeira vez fora do container do Claude: `yarn playwright install chromium`.

No GitHub, `.github/workflows/testes.yml` roda lint, build e estes testes em todo PR para
`staging`/`main`; se falhar, o relatório fica nos artefatos da execução.
