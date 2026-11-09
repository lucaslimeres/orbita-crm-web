import { createFileRoute } from "@tanstack/react-router";
import { AdminEsqueciSenhaPage } from "@/pages/admin/AdminEsqueciSenhaPage";

export const Route = createFileRoute("/admin/esqueci-senha")({
  component: AdminEsqueciSenhaPage,
});
