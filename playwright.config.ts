import { defineConfig } from "@playwright/test";

/**
 * Testes de tela (E2E) — ver e2e/README.md. A API é simulada no próprio navegador
 * (`e2e/mock-api.ts`), então não precisa de banco nem da API rodando.
 */
const API_URL = "http://api.orbita.test";
const PORT = 4173;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "off",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "celular", use: { browserName: "chromium", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: "desktop", use: { browserName: "chromium", viewport: { width: 1400, height: 900 } } },
  ],
  webServer: {
    command: `vite build --outDir dist-e2e --emptyOutDir && vite preview --outDir dist-e2e --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: { VITE_API_URL: API_URL, VITE_PAGARME_PUBLIC_KEY: "pk_test_e2e" },
  },
});

export { API_URL };
