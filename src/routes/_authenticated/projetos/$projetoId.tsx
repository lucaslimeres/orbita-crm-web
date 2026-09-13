import { createFileRoute } from "@tanstack/react-router";
import { ProjetoDetailPage } from "@/pages/projetos/ProjetoDetailPage";

export const Route = createFileRoute("/_authenticated/projetos/$projetoId")({
  component: ProjetoDetailPage,
});
