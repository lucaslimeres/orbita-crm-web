import { createFileRoute } from "@tanstack/react-router";
import { AdminContasPage } from "@/pages/admin/AdminContasPage";

export const Route = createFileRoute("/admin/_authenticated/contas/")({
  component: AdminContasPage,
});
