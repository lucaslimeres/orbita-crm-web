import { createFileRoute } from "@tanstack/react-router";
import { AdminAdministradoresPage } from "@/pages/admin/AdminAdministradoresPage";

export const Route = createFileRoute("/admin/_authenticated/administradores")({
  component: AdminAdministradoresPage,
});
