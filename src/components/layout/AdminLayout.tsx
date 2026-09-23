import { Link, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, LogOut, ShieldCheck, UserCog, Users, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useAdminAuthStore } from "@/stores/useAdminAuthStore";
import { queryClient } from "@/lib/queryClient";

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/contas", label: "Contas", icon: Users },
  { to: "/admin/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/admin/administradores", label: "Administradores", icon: UserCog },
];

/**
 * Casca visual do painel admin — deliberadamente diferente do `AppLayout` do tenant
 * (fundo escuro fixo, faixa "ADMIN" no topo) pra nunca ficar ambíguo em qual sistema
 * quem está logado se encontra. Ver docs/admin.md.
 */
export function AdminLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { admin, logout } = useAdminAuthStore();

  function handleLogout() {
    logout();
    queryClient.clear();
    navigate({ to: "/admin/login" });
  }

  return (
    <div className="dark flex min-h-screen bg-background">
      <aside className="flex w-60 flex-col border-r border-border bg-card px-4 py-5">
        <div className="mb-8 flex items-center gap-2 px-1">
          <ShieldCheck className="size-5 text-primary" />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">Órbita</span>
            <span className="text-[10px] font-medium tracking-[0.16em] text-primary uppercase">Admin</span>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-background hover:text-foreground [&.active]:bg-accent [&.active]:text-accent-foreground"
              activeProps={{ className: "active" }}
              activeOptions={{ exact: item.to === "/admin" }}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <div className="px-1">
            <p className="truncate text-sm font-medium">{admin?.nome}</p>
            <p className="truncate text-xs text-muted-foreground">{admin?.email}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Sair" className="self-start">
            <LogOut className="size-4" />
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
