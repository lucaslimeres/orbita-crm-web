import { createFileRoute } from "@tanstack/react-router";
import { ConvitePage } from "@/pages/auth/ConvitePage";

export const Route = createFileRoute("/convite")({
  component: ConvitePage,
});
