import { createFileRoute } from "@tanstack/react-router";
import { AdminFinanceiroPage } from "@/pages/admin/AdminFinanceiroPage";

export const Route = createFileRoute("/admin/_authenticated/financeiro")({
  component: AdminFinanceiroPage,
});
