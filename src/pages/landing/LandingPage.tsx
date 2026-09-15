import { Link } from "@tanstack/react-router";
import { BarChart3, Check, FolderKanban, ShieldCheck, Users, Wallet } from "lucide-react";
import logo from "@/assets/orbita-lockup-branco.svg";
import simbolo from "@/assets/orbita-simbolo-cor.svg";
import { Button } from "@/components/ui/button";

const FUNCIONALIDADES = [
  {
    icon: Wallet,
    titulo: "Financeiro da empresa",
    descricao: "Gastos com recorrência, aportes de capital e retiradas de sócios num único painel — com previsão dos próximos vencimentos.",
  },
  {
    icon: FolderKanban,
    titulo: "Projetos",
    descricao: "Cadastre cada produto ou projeto com seu próprio controle de receita e despesa. Veja a margem de cada um sem abrir planilha.",
  },
  {
    icon: Users,
    titulo: "Equipe & permissões",
    descricao: "Perfis Owner, Manager e Operator com permissões configuráveis — decida exatamente quem vê o financeiro e quem só acompanha projetos.",
  },
  {
    icon: BarChart3,
    titulo: "Dashboards consolidados",
    descricao: "Saldo em caixa, gastos por categoria e receita recorrente de cada projeto, atualizados em tempo real.",
  },
  {
    icon: ShieldCheck,
    titulo: "Multi-empresa por natureza",
    descricao: "Cada conta é isolada desde o primeiro dia — pensado para crescer de um negócio para vários sem trocar de ferramenta.",
  },
];

const FREE_INCLUI = ["Financeiro completo (gastos, aportes, retiradas)", "1 projeto ativo", "1 usuário", "Dashboards e relatórios inclusos"];

const PRO_INCLUI = [
  "Financeiro completo (gastos, aportes, retiradas)",
  "Projetos ilimitados, cada um com seu próprio financeiro",
  "Usuários ilimitados e permissões configuráveis",
  "Dashboards e relatórios inclusos",
  "Suporte por e-mail",
];

export function LandingPage() {
  return (
    <div className="dark min-h-screen bg-[#0b1220] text-[#f4f5f7]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <img src={logo} alt="Órbita" className="h-6 w-auto" />
        <nav className="flex items-center gap-6 text-sm text-[#9aa0b0]">
          <a href="#funcionalidades" className="hidden hover:text-white sm:block">
            Funcionalidades
          </a>
          <a href="#precos" className="hidden hover:text-white sm:block">
            Preços
          </a>
          <Link to="/login" className="hover:text-white">
            Entrar
          </Link>
          <Button asChild size="sm">
            <Link to="/cadastro">Criar conta</Link>
          </Button>
        </nav>
      </header>

      <section className="mx-auto flex max-w-4xl flex-col items-center px-6 pt-16 pb-24 text-center">
        <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-[#12192b] ring-1 ring-[#1e2740]">
          <img src={simbolo} alt="" className="size-8" />
        </div>
        <h1 className="text-4xl font-semibold tracking-[-0.03em] text-balance sm:text-5xl">
          Todos os seus projetos e seu financeiro,
          <br className="hidden sm:block" /> girando em torno de um único centro de controle.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-[#9aa0b0]">
          O Órbita é o back-office de quem toca vários negócios digitais ao mesmo tempo — financeiro consolidado, cada projeto com seu próprio resultado e a equipe com o acesso certo.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link to="/cadastro">Começar grátis</Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <a href="#funcionalidades">Ver funcionalidades</a>
          </Button>
        </div>
      </section>

      <section id="funcionalidades" className="border-t border-[#1e2740] bg-[#0d1526] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-semibold tracking-[-0.02em]">Feito para quem já não cabe numa planilha</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-[#9aa0b0]">Um único lugar para o financeiro da empresa e o resultado de cada projeto — sem depender de três ferramentas diferentes.</p>

          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FUNCIONALIDADES.map((f) => (
              <div key={f.titulo} className="rounded-xl border border-[#1e2740] bg-[#12192b] p-6">
                <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-[#1c1740] text-[#8b77ff]">
                  <f.icon className="size-5" />
                </div>
                <h3 className="font-semibold">{f.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#9aa0b0]">{f.descricao}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="precos" className="py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-semibold tracking-[-0.02em]">Comece grátis. Assine quando fizer sentido.</h2>
          <p className="mt-3 text-[#9aa0b0]">Sem letra miúda, sem módulo trancado atrás de um plano mais caro — o Free já tem tudo, só limitado em volume.</p>

          <div className="mt-10 grid grid-cols-1 gap-6 text-left sm:grid-cols-2">
            <div className="rounded-2xl border border-[#1e2740] bg-[#12192b] p-8">
              <p className="text-xs font-medium tracking-[0.12em] text-[#9aa0b0] uppercase">Plano Free</p>
              <p className="mt-2 font-numeric text-5xl font-semibold">
                R$ 0<span className="text-lg font-normal text-[#9aa0b0]">/mês</span>
              </p>
              <ul className="mt-6 flex flex-col gap-3">
                {FREE_INCLUI.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-positive" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button asChild size="lg" variant="secondary" className="mt-8 w-full">
                <Link to="/cadastro">Criar conta grátis</Link>
              </Button>
              <p className="mt-3 text-center text-xs text-[#9aa0b0]">Sem cartão de crédito. 1 usuário, 1 projeto.</p>
            </div>

            <div className="relative rounded-2xl border border-[#8b77ff] bg-[#12192b] p-8">
              <span className="absolute -top-3 left-8 rounded-full bg-[#8b77ff] px-3 py-1 text-xs font-medium text-[#0b1220]">Mais popular</span>
              <p className="text-xs font-medium tracking-[0.12em] text-[#8b77ff] uppercase">Plano Pro</p>
              <p className="mt-2 font-numeric text-5xl font-semibold">
                R$ 97<span className="text-lg font-normal text-[#9aa0b0]">/mês</span>
              </p>
              <ul className="mt-6 flex flex-col gap-3">
                {PRO_INCLUI.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-positive" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button asChild size="lg" className="mt-8 w-full">
                <Link to="/cadastro">Assinar Pro</Link>
              </Button>
              <p className="mt-3 text-center text-xs text-[#9aa0b0]">Cartão ou PIX. Cancele quando quiser.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#1e2740] py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-6 text-sm text-[#5a5f6a] sm:flex-row sm:justify-between">
          <img src={logo} alt="Órbita" className="h-4 w-auto opacity-70" />
          <p>© {new Date().getFullYear()} Órbita. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
