import { expect, test } from "@playwright/test";
import { me, mockApi, semRolagemLateral, usuario } from "./mock-api";

test.describe("Login", () => {
  test("mostra a mensagem da API quando a senha está errada", async ({ page }) => {
    await mockApi(page, { "POST /auth/login": { status: 401, body: { message: "E-mail ou senha inválidos." } } });
    await page.goto("/login");
    await semRolagemLateral(page);

    await page.getByLabel("E-mail").fill("lucas@teste.dev");
    await page.getByLabel("Senha").fill("errada");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page.getByText("E-mail ou senha inválidos.")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("com e-mail verificado entra no Dashboard", async ({ page }) => {
    await mockApi(page, {
      "POST /auth/login": { body: { usuario: usuario(), accessToken: "token-e2e" } },
      "GET /me": { body: me() },
    });
    await page.goto("/login");
    await page.getByLabel("E-mail").fill("lucas@teste.dev");
    await page.getByLabel("Senha").fill("senha-certa");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("sem e-mail verificado vai para a tela do código", async ({ page }) => {
    const naoVerificado = usuario({ emailVerificadoEm: null });
    await mockApi(page, {
      "POST /auth/login": { body: { usuario: naoVerificado, accessToken: "token-e2e" } },
      "GET /me": { body: me({ usuario: naoVerificado }) },
    });
    await page.goto("/login");
    await page.getByLabel("E-mail").fill("lucas@teste.dev");
    await page.getByLabel("Senha").fill("senha-certa");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page).toHaveURL(/\/verificar-email$/);
    await expect(page.getByRole("button", { name: "Confirmar e-mail" })).toBeVisible();
    await semRolagemLateral(page);
  });

  test("sem sessão, a área logada manda para o login", async ({ page }) => {
    await mockApi(page, {});
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
  });
});
