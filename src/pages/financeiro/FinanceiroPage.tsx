import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { financeiroApi } from "@/api/financeiro";
import { formatMoney } from "@/lib/format";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { GastosSection } from "./GastosSection";
import { AportesSection } from "./AportesSection";
import { RetiradasSection } from "./RetiradasSection";

const TABS = [
  { key: "gastos", label: "Gastos" },
  { key: "aportes", label: "Aportes" },
  { key: "retiradas", label: "Retiradas" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function FinanceiroPage() {
  const [tab, setTab] = useState<TabKey>("gastos");
  const { data: dashboard } = useQuery({ queryKey: ["financeiro", "dashboard"], queryFn: () => financeiroApi.dashboard() });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Financeiro</h1>
        <p className="text-sm text-muted-foreground">Gastos, aportes e retiradas da empresa.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <CardDescription>Saldo em caixa</CardDescription>
            <CardTitle className={cn("mt-1 font-numeric text-3xl", (dashboard?.saldoCentavos ?? 0) < 0 && "text-negative")}>
              {formatMoney(dashboard?.saldoCentavos ?? 0)}
            </CardTitle>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <CardDescription>Gastos recorrentes nos próximos 90 dias</CardDescription>
            <CardTitle className="mt-1 font-numeric text-3xl">
              {formatMoney(dashboard?.previsaoGastosRecorrentes.reduce((s, g) => s + g.valorCentavos, 0) ?? 0)}
            </CardTitle>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <CardDescription>Maior categoria de gasto</CardDescription>
            <CardTitle className="mt-1 text-lg">
              {dashboard?.gastosPorCategoria.slice().sort((a, b) => b.totalCentavos - a.totalCentavos)[0]?.categoria ?? "—"}
            </CardTitle>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-3 py-2 text-sm font-medium text-muted-foreground transition-colors",
              tab === t.key && "border-b-2 border-primary text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "gastos" && <GastosSection />}
      {tab === "aportes" && <AportesSection />}
      {tab === "retiradas" && <RetiradasSection />}
    </div>
  );
}
