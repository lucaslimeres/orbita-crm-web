import { Link, useNavigate } from "@tanstack/react-router";
import { useTheme } from "next-themes";
import { CreditCard, LayoutDashboard, LogOut, Moon, Sun, Users, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/useAuthStore";
import { queryClient } from "@/lib/queryClient";
import logoBranco from "@/assets/orbita-lockup-branco.svg";
import logoCor from "@/assets/orbita-lockup-cor.svg";

const NAV_ITEMS = [
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/projetos", label: "Projetos", icon: LayoutDashboard },
  { to: "/usuarios", label: "Usuários", icon: Users },
  { to: "/assinatura", label: "Assinatura", icon: CreditCard },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { usuario, empresa, logout } = useAuthStore();

  function handleLogout() {
    logout();
    queryClient.clear();
    navigate({ to: "/login" });
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-60 flex-col border-r border-border bg-card px-4 py-5">
        <img src={theme === "light" ? logoCor : logoBranco} alt="Órbita" className="mb-8 h-6 w-auto" />

        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-background hover:text-foreground [&.active]:bg-accent [&.active]:text-accent-foreground"
              activeProps={{ className: "active" }}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <div className="px-1">
            <p className="truncate text-sm font-medium">{usuario?.nome}</p>
            <p className="truncate text-xs text-muted-foreground">{empresa?.nomeFantasia}</p>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title="Alternar tema">
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Sair">
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
