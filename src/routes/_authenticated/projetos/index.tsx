import { createFileRoute } from "@tanstack/react-router";
import { ProjetosPage } from "@/pages/projetos/ProjetosPage";

export const Route = createFileRoute("/_authenticated/projetos/")({
  component: ProjetosPage,
});
