import type { Page, Route } from "@playwright/test";
import { API_URL } from "../playwright.config";

type Resposta = { status?: number; body?: unknown };
/** Chave: "MÉTODO /caminho" (sem query string). Valor: resposta fixa ou função. */
export type Rotas = Record<string, Resposta | ((route: Route) => Resposta)>;

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "Content-Type, Authorization",
  "access-control-allow-methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
};

/**
 * Simula a API: cada chamada ao `API_URL` é respondida aqui. Rota não declarada responde
 * 404 — o teste não depende de dados que não declarou. Devolve as chamadas recebidas.
 */
export async function mockApi(page: Page, rotas: Rotas) {
  const chamadas: string[] = [];
  await page.route(`${API_URL}/**`, async (route) => {
    const req = route.request();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    const chave = `${req.method()} ${new URL(req.url()).pathname}`;
    chamadas.push(chave);
    const handler = rotas[chave];
    const resposta = typeof handler === "function" ? handler(route) : handler ?? { status: 404, body: { message: `Sem mock para ${chave}` } };
    await route.fulfill({ status: resposta.status ?? 200, headers: CORS, contentType: "application/json", body: JSON.stringify(resposta.body ?? {}) });
  });
  return chamadas;
}

export const usuario = (extra: Record<string, unknown> = {}) => ({
  id: "u-1",
  empresaId: "e-1",
  roleId: 1,
  nome: "Lucas Teste",
  email: "lucas@teste.dev",
  cpf: "52998224725",
  telefone: null,
  ativo: true,
  confirmado: true,
  emailVerificadoEm: "2026-11-01T12:00:00.000Z",
  ...extra,
});

export const empresa = { id: "e-1", razaoSocial: "Empresa Teste LTDA", nomeFantasia: "Empresa Teste", cnpj: null, email: "contato@teste.dev" };

export const me = (extra: Record<string, unknown> = {}) => ({
  usuario: usuario(),
  empresa,
  assinatura: { plano: "free", status: "ativa", bloqueada: false },
  permissoes: [],
  congelado: false,
  ...extra,
});

/** Sessão já logada (o que o login grava no localStorage). */
export async function logado(page: Page, extraUsuario: Record<string, unknown> = {}) {
  const state = { usuario: usuario(extraUsuario), empresa, assinatura: { plano: "free", status: "ativa", bloqueada: false }, accessToken: "token-e2e" };
  await page.addInitScript((s) => localStorage.setItem("orbita-auth", JSON.stringify({ state: s, version: 0 })), state);
}

/** Falha se a página rolar para o lado (regra do responsivo: nada além da largura da tela). */
export async function semRolagemLateral(page: Page) {
  const { scroll, client } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  if (scroll > client) throw new Error(`rolagem lateral: conteúdo com ${scroll}px numa tela de ${client}px`);
}
