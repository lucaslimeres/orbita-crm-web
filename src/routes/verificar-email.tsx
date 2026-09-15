import { createFileRoute, redirect } from "@tanstack/react-router";
import { getStoredAccessToken } from "@/lib/auth";
import { VerifyEmailCodePage } from "@/pages/auth/VerifyEmailCodePage";

export const Route = createFileRoute("/verificar-email")({
  beforeLoad: () => {
    if (!getStoredAccessToken()) throw redirect({ to: "/login" });
  },
  component: VerifyEmailCodePage,
});
