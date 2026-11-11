import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { GastosSection } from "@/pages/financeiro/GastosSection";
import { ReceitasSection } from "./ReceitasSection";
import { projetosApi } from "@/api/projetos";
import { formatMoney } from "@/lib/format";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ProjetoDetailPage() {
  const { projetoId } = useParams({
    from: "/_authenticated/projetos/$projetoId",
  });
  const id = Number(projetoId);

  const { data: projeto } = useQuery({
    queryKey: ["projetos", id],
    queryFn: () => projetosApi.get(id),
  });
  const { data: dashboard } = useQuery({
    queryKey: ["projetos", id, "dashboard"],
    queryFn: () => projetosApi.dashboard(id),
  });

  if (!projeto) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">{projeto.nome}</h1>
        {projeto.descricao && <p className="text-sm text-muted-foreground">{projeto.descricao}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <CardDescription>Receita total</CardDescription>
            <CardTitle className="mt-1 font-numeric text-2xl text-positive">{formatMoney(dashboard?.receitaTotalCentavos ?? 0)}</CardTitle>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <CardDescription>Gasto total</CardDescription>
            <CardTitle className="mt-1 font-numeric text-2xl text-negative">{formatMoney(dashboard?.gastoTotalCentavos ?? 0)}</CardTitle>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <CardDescription>Margem</CardDescription>
            <CardTitle className={cn("mt-1 font-numeric text-2xl", (dashboard?.margemCentavos ?? 0) < 0 && "text-negative")}>
              {formatMoney(dashboard?.margemCentavos ?? 0)}
            </CardTitle>
          </CardContent>
        </Card>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium tracking-[0.02em] text-muted-foreground uppercase">Receitas</h2>
        <ReceitasSection projetoId={id} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium tracking-[0.02em] text-muted-foreground uppercase">Gastos do projeto</h2>
        <GastosSection projetoId={id} />
      </section>
    </div>
  );
}
