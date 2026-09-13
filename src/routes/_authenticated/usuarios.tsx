import { createFileRoute } from "@tanstack/react-router";
import { UsuariosPage } from "@/pages/usuarios/UsuariosPage";

export const Route = createFileRoute("/_authenticated/usuarios")({
  component: UsuariosPage,
});
