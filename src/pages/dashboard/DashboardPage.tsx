import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { dashboardApi, type ContaAPagar, type FatiaValor, type MargemProjeto, type MesFluxo, type MesPrevisao } from "@/api/dashboard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError } from "@/lib/api";
import { formatDateOnly, formatMoney, rotuloMes } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BarrasDivergentes, BarrasRanqueadas, ChartCard, ColunasAgrupadas, Linha, type Serie } from "./charts";

const ENTRADAS: Serie = { nome: "Entradas", cor: "var(--chart-in)" };
const SAIDAS: Serie = { nome: "Saídas", cor: "var(--chart-out)" };
const SALDO: Serie = { nome: "Saldo projetado", cor: "var(--chart-balance)" };

const ROTULO_TIPO_ENTRADA: Record<FatiaValor["tipo"], string> = {
  aporte: "aporte",
  projeto: "receita de projeto",
  categoria: "",
};

export function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => dashboardApi.geral(),
    retry: (falhas, err) => !(err instanceof ApiError && err.status === 403) && falhas < 1,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Para onde vai o dinheiro, de onde ele vem e o que esperar dos próximos meses.</p>
      </div>

      {error ? (
        <Card>
          <CardContent className="pt-5 text-sm text-muted-foreground">
            {error instanceof ApiError && error.status === 403 ? (
              <>
                Seu perfil não tem permissão para ver o financeiro da empresa — peça acesso a um administrador da conta. Enquanto
                isso, veja seus{" "}
                <Link to="/projetos" className="underline underline-offset-2">
                  projetos
                </Link>
                .
              </>
            ) : (
              "Não foi possível carregar o dashboard. Tente novamente em instantes."
            )}
          </CardContent>
        </Card>
      ) : isLoading || !data ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <>
          <Indicadores data={data.indicadores} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard<FatiaValor>
              titulo="Onde mais se gasta"
              descricao="Gastos pagos por categoria, últimos 12 meses"
              vazio={data.gastosPorCategoria.length === 0 && "Nenhum gasto pago nos últimos 12 meses."}
              linhas={data.gastosPorCategoria}
              colunas={[
                { titulo: "Categoria", valor: (f) => f.rotulo },
                { titulo: "Total", valor: (f) => formatMoney(f.totalCentavos), numerica: true },
              ]}
            >
              <BarrasRanqueadas itens={data.gastosPorCategoria} cor={SAIDAS.cor} />
            </ChartCard>

            <ChartCard<FatiaValor>
              titulo="De onde vem o dinheiro"
              descricao="Receitas recebidas por projeto e aportes, últimos 12 meses"
              vazio={data.entradasPorOrigem.length === 0 && "Nenhuma entrada (receita recebida ou aporte) nos últimos 12 meses."}
              linhas={data.entradasPorOrigem}
              colunas={[
                { titulo: "Origem", valor: (f) => f.rotulo },
                { titulo: "Tipo", valor: (f) => ROTULO_TIPO_ENTRADA[f.tipo] },
                { titulo: "Total", valor: (f) => formatMoney(f.totalCentavos), numerica: true },
              ]}
            >
              <BarrasRanqueadas
                itens={data.entradasPorOrigem.map((f) => ({ ...f, detalhe: f.tipo === "projeto" ? "projeto" : undefined }))}
                cor={ENTRADAS.cor}
              />
            </ChartCard>
          </div>

          <ChartCard<MesFluxo>
            titulo="Fluxo de caixa mensal"
            descricao="Entradas (receitas recebidas + aportes) e saídas (gastos pagos + retiradas), últimos 12 meses — o mês atual (tracejado) ainda está em andamento"
            legenda={[ENTRADAS, SAIDAS]}
            vazio={data.fluxoMensal.every((m) => m.entradasCentavos === 0 && m.saidasCentavos === 0) && "Nenhuma movimentação nos últimos 12 meses."}
            linhas={data.fluxoMensal}
            colunas={[
              { titulo: "Mês", valor: (m) => rotuloMes(m.mes) },
              { titulo: "Entradas", valor: (m) => formatMoney(m.entradasCentavos), numerica: true },
              { titulo: "Saídas", valor: (m) => formatMoney(m.saidasCentavos), numerica: true },
            ]}
          >
            <ColunasAgrupadas
              dados={data.fluxoMensal}
              destaqueIndice={data.fluxoMensal.length - 1}
              series={[
                { ...ENTRADAS, valor: (m) => m.entradasCentavos },
                { ...SAIDAS, valor: (m) => m.saidasCentavos },
              ]}
            />
          </ChartCard>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard<MesPrevisao>
              titulo="Previsão dos próximos meses"
              descricao="Receitas e gastos recorrentes previstos + lançamentos pendentes, mês atual e 5 seguintes"
              legenda={[ENTRADAS, SAIDAS]}
              linhas={data.previsao}
              colunas={[
                { titulo: "Mês", valor: (m) => rotuloMes(m.mes) },
                { titulo: "Entradas previstas", valor: (m) => formatMoney(m.entradasCentavos), numerica: true },
                { titulo: "Saídas previstas", valor: (m) => formatMoney(m.saidasCentavos), numerica: true },
              ]}
            >
              <ColunasAgrupadas
                dados={data.previsao}
                series={[
                  { ...ENTRADAS, valor: (m) => m.entradasCentavos },
                  { ...SAIDAS, valor: (m) => m.saidasCentavos },
                ]}
              />
            </ChartCard>

            <ChartCard<MesPrevisao>
              titulo="Saldo projetado"
              descricao="Saldo em caixa ao fim de cada mês, se a previsão se confirmar"
              linhas={data.previsao}
              colunas={[
                { titulo: "Mês", valor: (m) => rotuloMes(m.mes) },
                { titulo: "Saldo ao fim do mês", valor: (m) => formatMoney(m.saldoProjetadoCentavos), numerica: true },
              ]}
            >
              <Linha dados={data.previsao} serie={{ ...SALDO, valor: (m) => m.saldoProjetadoCentavos }} />
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ContasAPagar contas={data.aPagarProximos30Dias} />

            <ChartCard<MargemProjeto>
              titulo="Margem por projeto"
              descricao="Receitas − gastos lançados no projeto (qualquer status), acumulado — mesma conta do painel do projeto"
              vazio={data.margemPorProjeto.length === 0 && "Nenhum projeto cadastrado."}
              linhas={data.margemPorProjeto}
              colunas={[
                { titulo: "Projeto", valor: (p) => p.nome },
                { titulo: "Receita", valor: (p) => formatMoney(p.receitaCentavos), numerica: true },
                { titulo: "Gasto", valor: (p) => formatMoney(p.gastoCentavos), numerica: true },
                { titulo: "Margem", valor: (p) => formatMoney(p.margemCentavos), numerica: true },
              ]}
            >
              <BarrasDivergentes
                itens={data.margemPorProjeto.map((p) => ({
                  rotulo: p.nome,
                  valorCentavos: p.margemCentavos,
                  detalhe: `Receita ${formatMoney(p.receitaCentavos)} · Gasto ${formatMoney(p.gastoCentavos)}`,
                }))}
              />
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}

function Indicadores({ data }: { data: Awaited<ReturnType<typeof dashboardApi.geral>>["indicadores"] }) {
  const tiles = [
    { rotulo: "Saldo em caixa", valor: data.saldoCentavos, sinal: true },
    { rotulo: "Entradas no mês", valor: data.entradasMesCentavos },
    { rotulo: "Saídas no mês", valor: data.saidasMesCentavos },
    { rotulo: "Resultado do mês", valor: data.resultadoMesCentavos, sinal: true },
    {
      rotulo: "A pagar em 30 dias",
      valor: data.aPagarCentavos,
      nota: data.aPagarQuantidade === 1 ? "1 conta" : `${data.aPagarQuantidade} contas`,
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
      {tiles.map((t) => (
        <Card key={t.rotulo}>
          <CardContent className="pt-5">
            <CardDescription>{t.rotulo}</CardDescription>
            <CardTitle className={cn("mt-1 font-numeric text-2xl", t.sinal && t.valor < 0 && "text-negative")}>{formatMoney(t.valor)}</CardTitle>
            {t.nota && <p className="mt-0.5 text-xs text-muted-foreground">{t.nota}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ContasAPagar({ contas }: { contas: ContaAPagar[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>A pagar nos próximos 30 dias</CardTitle>
        <CardDescription>Gastos pendentes (inclusive vencidos) e próximas ocorrências de gastos recorrentes</CardDescription>
      </CardHeader>
      <CardContent>
        {contas.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Nada a pagar nos próximos 30 dias.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Gasto</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contas.map((c) => (
                <TableRow key={`${c.gastoId}-${c.data}`}>
                  <TableCell className="whitespace-nowrap font-numeric">
                    <span className={cn(c.vencido && "text-negative")}>{formatDateOnly(c.data)}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span>{c.descricao}</span>
                      {c.vencido && (
                        <Badge variant="negative" className="gap-1">
                          <AlertTriangle className="size-3" /> Vencido
                        </Badge>
                      )}
                      {c.origem === "recorrente" && <Badge variant="outline">Previsto</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {c.categoria}
                      {c.projetoNome && ` · ${c.projetoNome}`}
                    </p>
                  </TableCell>
                  <TableCell className="text-right font-numeric">{formatMoney(c.valorCentavos)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Para marcar como pago, use{" "}
          <Link to="/financeiro" className="underline underline-offset-2">
            Financeiro → Gastos
          </Link>
          .
        </p>
      </CardContent>
    </Card>
  );
}
