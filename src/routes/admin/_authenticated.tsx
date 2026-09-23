import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { getStoredAdminAccessToken } from "@/lib/adminAuth";
import { AdminLayout } from "@/components/layout/AdminLayout";

export const Route = createFileRoute("/admin/_authenticated")({
  beforeLoad: () => {
    if (!getStoredAdminAccessToken()) {
      throw redirect({ to: "/admin/login" });
    }
  },
  component: () => (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  ),
});
