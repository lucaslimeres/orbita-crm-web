import { createFileRoute, redirect } from "@tanstack/react-router";
import { getStoredAccessToken } from "@/lib/auth";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: getStoredAccessToken() ? "/financeiro" : "/login" });
  },
});
