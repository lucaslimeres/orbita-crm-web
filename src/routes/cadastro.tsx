import { createFileRoute } from "@tanstack/react-router";
import { SignupPage } from "@/pages/auth/SignupPage";

type CadastroSearch = { plano?: "free" | "pro" };

export const Route = createFileRoute("/cadastro")({
  validateSearch: (search: Record<string, unknown>): CadastroSearch => ({
    plano: search.plano === "pro" ? "pro" : search.plano === "free" ? "free" : undefined,
  }),
  component: SignupPage,
});
