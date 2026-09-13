import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { getStoredAccessToken } from "@/lib/auth";
import { AppLayout } from "@/components/layout/AppLayout";
import { ThemeProvider } from "@/components/theme-provider";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: () => {
    if (!getStoredAccessToken()) {
      throw redirect({ to: "/login" });
    }
  },
  component: AuthenticatedRoot,
});

function AuthenticatedRoot() {
  return (
    <ThemeProvider>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </ThemeProvider>
  );
}
