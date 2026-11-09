import { createFileRoute } from "@tanstack/react-router";
import { AdminRedefinirSenhaPage } from "@/pages/admin/AdminRedefinirSenhaPage";

export const Route = createFileRoute("/admin/redefinir-senha")({
  component: AdminRedefinirSenhaPage,
});
