import { createFileRoute } from "@tanstack/react-router";
import { MinhaContaPage } from "@/pages/conta/MinhaContaPage";

export const Route = createFileRoute("/_authenticated/conta")({
  component: MinhaContaPage,
});
