import { useQuery } from "@tanstack/react-query";
import { CreditCard, FolderKanban, QrCode, TrendingUp, Users, Wallet } from "lucide-react";
import { adminPanelApi } from "@/api/admin";
import { formatMoney } from "@/lib/format";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STATUS_LABEL: Record<string, string> = {
  sem_assinatura: "Sem assinatura",
  ativa: "Ativa",
  atrasada: "Atrasada",
  cancelada: "Cancelada",
};

function StatCard({ icon: Icon, label, value, hint }: { icon: React.ElementType; label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 pt-5">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="size-4" />
          <CardDescription>{label}</CardDescription>
        </div>
        <CardTitle className="font-numeric text-2xl">{value}</CardTitle>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export function AdminDashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ["admin", "dashboard"], queryFn: () => adminPanelApi.dashboard() });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  const totalPro = data.empresasPorPlano.find((p) => p.plano === "pro")?.total ?? 0;
  const totalFree = data.empresasPorPlano.find((p) => p.plano === "free")?.total ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Resumo geral de todas as contas do Órbita.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Contas" value={String(data.totalEmpresas)} hint={`${data.novasContasUltimos30Dias} nos últimos 30 dias`} />
        <StatCard icon={TrendingUp} label="MRR (PRO ativos)" value={formatMoney(data.mrrCentavos)} hint={`${totalPro} conta${totalPro === 1 ? "" : "s"} PRO`} />
        <StatCard icon={Wallet} label="Faturamento total" value={formatMoney(data.faturamentoTotalCentavos)} hint="Histórico, cartão + PIX" />
        <StatCard icon={Wallet} label="Faturamento no mês" value={formatMoney(data.faturamentoMesAtualCentavos)} hint="Faturas pagas neste mês" />
        <StatCard icon={Users} label="Usuários (todas as contas)" value={String(data.totalUsuarios)} />
        <StatCard icon={FolderKanban} label="Projetos (todas as contas)" value={String(data.totalProjetos)} />
        <StatCard icon={CreditCard} label="Free" value={String(totalFree)} hint="contas no plano Free" />
        <StatCard icon={CreditCard} label="PRO" value={String(totalPro)} hint="contas no plano PRO" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-3 pt-5">
            <CardDescription>Contas por status de assinatura</CardDescription>
            <div className="flex flex-wrap gap-2">
              {data.empresasPorStatus.map((s) => (
                <Badge key={s.status} variant={s.status === "atrasada" ? "warning" : s.status === "cancelada" ? "negative" : s.status === "ativa" ? "positive" : "outline"}>
                  {STATUS_LABEL[s.status] ?? s.status}: {s.total}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3 pt-5">
            <CardDescription>Faturas pagas por forma de pagamento</CardDescription>
            {data.faturasPagasPorFormaPagamento.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma fatura paga ainda.</p>}
            <div className="flex flex-col gap-2">
              {data.faturasPagasPorFormaPagamento.map((f) => (
                <div key={f.formaPagamento} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    {f.formaPagamento === "cartao" ? <CreditCard className="size-4 text-muted-foreground" /> : <QrCode className="size-4 text-muted-foreground" />}
                    {f.formaPagamento === "cartao" ? "Cartão" : "PIX"} · {f.total} fatura{f.total === 1 ? "" : "s"}
                  </span>
                  <span className="font-numeric">{formatMoney(f.valorCentavos)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
