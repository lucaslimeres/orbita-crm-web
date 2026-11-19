import { expect, test } from "@playwright/test";
import { logado, me, mockApi, semRolagemLateral } from "./mock-api";

test.describe("Acesso congelado (plano Free acima do limite)", () => {
  test("usuário congelado vê o aviso e consegue sair", async ({ page }) => {
    await logado(page);
    await mockApi(page, { "GET /me": { body: me({ congelado: true }) } });

    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Seu acesso está congelado" })).toBeVisible();
    await semRolagemLateral(page);

    await page.getByRole("button", { name: "Sair" }).last().click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("e-mail não verificado manda para a tela do código mesmo logado", async ({ page }) => {
    await logado(page, { emailVerificadoEm: null });
    await mockApi(page, { "GET /me": { body: me({ usuario: { ...me().usuario, emailVerificadoEm: null } }) } });

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/verificar-email$/);
  });
});
