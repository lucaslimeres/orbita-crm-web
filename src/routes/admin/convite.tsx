import { createFileRoute } from "@tanstack/react-router";
import { AdminConvitePage } from "@/pages/admin/AdminConvitePage";

export const Route = createFileRoute("/admin/convite")({
  component: AdminConvitePage,
});
