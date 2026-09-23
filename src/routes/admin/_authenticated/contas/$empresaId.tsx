import { createFileRoute } from "@tanstack/react-router";
import { AdminContaDetailPage } from "@/pages/admin/AdminContaDetailPage";

export const Route = createFileRoute("/admin/_authenticated/contas/$empresaId")({
  component: AdminContaDetailPage,
});
