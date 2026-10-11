import { createFileRoute } from "@tanstack/react-router";
import { AssinaturaPage } from "@/pages/assinatura/AssinaturaPage";

export const Route = createFileRoute("/_authenticated/assinatura")({
  // `?pagar=1` — vindo do cadastro com PRO escolhido: abre o modal de pagamento direto.
  validateSearch: (search: Record<string, unknown>): { pagar?: boolean } =>
    search.pagar === true || search.pagar === 1 || search.pagar === "1" ? { pagar: true } : {},
  component: AssinaturaPage,
});
