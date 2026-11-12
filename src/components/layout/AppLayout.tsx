import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { AlertTriangle, ChartColumn, CreditCard, LayoutDashboard, LogOut, Moon, Sun, UserCog, Users, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { authApi } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/useAuthStore";
import { queryClient } from "@/lib/queryClient";
import logoBranco from "@/assets/orbita-lockup-branco.svg";
import logoCor from "@/assets/orbita-lockup-cor.svg";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: ChartColumn },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/projetos", label: "Projetos", icon: LayoutDashboard },
  { to: "/usuarios", label: "Usuários", icon: Users },
  { to: "/assinatura", label: "Assinatura", icon: CreditCard },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario, empresa, assinatura, logout, setAssinatura } = useAuthStore();

  // Reavalia a assinatura a cada navegação — é o gate real de "PRO vencido bloqueia
  // tudo": a API também recusa (402) cada rota privada nesse estado, isto só evita o
  // usuário ver a tela por trás antes do redirect. Ver docs/assinatura.md.
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => authApi.me(), staleTime: 30_000 });

  useEffect(() => {
    if (me?.assinatura) setAssinatura(me.assinatura);
  }, [me, setAssinatura]);

  // E-mail não confirmado bloqueia tudo (a API responde 403 EMAIL_NAO_VERIFICADO) — manda
  // pra tela do código. Vem antes do bloqueio por assinatura de propósito.
  useEffect(() => {
    if (me && !me.usuario.emailVerificadoEm) navigate({ to: "/verificar-email" });
  }, [me, navigate]);

  useEffect(() => {
    if (me?.usuario.emailVerificadoEm && me.assinatura.bloqueada && location.pathname !== "/assinatura") {
      navigate({ to: "/assinatura" });
    }
  }, [me, location.pathname, navigate]);

  function handleLogout() {
    logout();
    queryClient.clear();
    navigate({ to: "/login" });
  }

  const bloqueada = assinatura?.bloqueada ?? false;
  const logo = theme === "light" ? logoCor : logoBranco;

  // Atalhos de conta/tema/sair — na barra lateral (desktop) e na barra do topo (celular).
  const acoes = (
    <>
      <Button variant="ghost" size="icon" asChild title="Minha conta">
        <Link to="/conta" aria-label="Minha conta">
          <UserCog className="size-4" />
        </Link>
      </Button>
      <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title="Alternar tema" aria-label="Alternar tema">
        {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </Button>
      <Button variant="ghost" size="icon" onClick={handleLogout} title="Sair" aria-label="Sair">
        <LogOut className="size-4" />
      </Button>
    </>
  );

  /*
   * Desktop (md+): barra lateral, como sempre foi. Celular: cara de aplicativo — barra fixa
   * no topo (logo + atalhos) e navegação fixa embaixo (abas com ícone), respeitando as áreas
   * seguras do aparelho (notch/barra de gestos, `env(safe-area-inset-*)`).
   */
  return (
    <div className="flex min-h-dvh bg-background">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-card px-4 py-5 md:flex">
        <img src={logo} alt="Órbita" className="mb-8 h-6 w-auto self-start" />

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
          <Link
            to="/conta"
            title="Minha conta"
            className="rounded-md px-1 py-1 transition-colors hover:bg-background [&.active]:bg-accent"
            activeProps={{ className: "active" }}
          >
            <p className="truncate text-sm font-medium">{usuario?.nome}</p>
            <p className="truncate text-xs text-muted-foreground">{empresa?.nomeFantasia}</p>
          </Link>
          <div className="flex gap-1">{acoes}</div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center justify-between gap-2 border-b border-border bg-card/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur md:hidden">
          <div className="flex min-w-0 items-center gap-3 py-2.5">
            <img src={logo} alt="Órbita" className="h-5 w-auto shrink-0" />
            {empresa?.nomeFantasia && <span className="truncate text-xs text-muted-foreground">{empresa.nomeFantasia}</span>}
          </div>
          <div className="flex shrink-0 gap-0.5">{acoes}</div>
        </header>

        {bloqueada && (
          <div className="flex flex-wrap items-center gap-2 border-b border-negative/30 bg-negative/10 px-4 py-3 text-sm text-negative md:px-8">
            <AlertTriangle className="size-4 shrink-0" />
            <span>Sua assinatura PRO está vencida — as funcionalidades ficam bloqueadas até o pagamento ser regularizado.</span>
            {location.pathname !== "/assinatura" && (
              <Link to="/assinatura" className="font-medium underline underline-offset-2">
                Ir para Assinatura
              </Link>
            )}
          </div>
        )}
        <main className="min-w-0 flex-1 p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:p-8">{children}</main>
      </div>

      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex flex-col items-center gap-1 px-1 pt-2 pb-2.5 text-[11px] text-muted-foreground transition-colors [&.active]:text-primary"
            activeProps={{ className: "active" }}
          >
            <item.icon className="size-5" />
            <span className="max-w-full truncate">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
