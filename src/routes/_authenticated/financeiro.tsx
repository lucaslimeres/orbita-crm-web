import { createFileRoute } from "@tanstack/react-router";
import { FinanceiroPage } from "@/pages/financeiro/FinanceiroPage";

export const Route = createFileRoute("/_authenticated/financeiro")({
  component: FinanceiroPage,
});
