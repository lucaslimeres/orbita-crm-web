import { createFileRoute } from "@tanstack/react-router";
import { AssinaturaPage } from "@/pages/assinatura/AssinaturaPage";

export const Route = createFileRoute("/_authenticated/assinatura")({
  component: AssinaturaPage,
});
