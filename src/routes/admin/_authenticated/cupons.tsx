import { createFileRoute } from "@tanstack/react-router";
import { AdminCuponsPage } from "@/pages/admin/AdminCuponsPage";

export const Route = createFileRoute("/admin/_authenticated/cupons")({
  component: AdminCuponsPage,
});
