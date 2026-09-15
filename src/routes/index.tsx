import { createFileRoute, redirect } from "@tanstack/react-router";
import { getStoredAccessToken } from "@/lib/auth";
import { LandingPage } from "@/pages/landing/LandingPage";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (getStoredAccessToken()) throw redirect({ to: "/financeiro" });
  },
  component: LandingPage,
});
