import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import { projetosApi, type CreateReceitaRequest } from "@/api/projetos";
import { financeiroApi } from "@/api/financeiro";
import { ApiError } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const emptyReceita: CreateReceitaRequest & { valorReais: string } = {
  clienteNome: "",
  tipo: "pagamento_unico",
  valorReais: "",
  valorCentavos: 0,
  dataInicio: new Date().toISOString().slice(0, 10),
  recorrencia: null,
};

export function ProjetoDetailPage() {
  const { projetoId } = useParams({ from: "/_authenticated/projetos/$projetoId" });
  const id = Number(projetoId);
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyReceita);

  const { data: projeto } = useQuery({ queryKey: ["projetos", id], queryFn: () => projetosApi.get(id) });
  const { data: dashboard } = useQuery({ queryKey: ["projetos", id, "dashboard"], queryFn: () => projetosApi.dashboard(id) });
  const { data: receitas = [] } = useQuery({ queryKey: ["projetos", id, "receitas"], queryFn: () => projetosApi.listReceitas(id) });
  const { data: gastos = [] } = useQuery({ queryKey: ["financeiro", "gastos", id], queryFn: () => financeiroApi.listGastos(id) });

  const createReceitaMutation = useMutation({
    mutationFn: (data: CreateReceitaRequest) => projetosApi.createReceita(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projetos", id] });
      setForm(emptyReceita);
      toast.success("Receita lançada.");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Não foi possível lançar a receita."),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valorCentavos = Math.round(Number(form.valorReais.replace(",", ".")) * 100);
    if (!valorCentavos) return toast.error("Informe um valor válido.");
    if (!form.clienteNome) return toast.error("Informe o cliente.");
    createReceitaMutation.mutate({
      clienteNome: form.clienteNome,
      tipo: form.tipo,
      valorCentavos,
      dataInicio: form.dataInicio,
      recorrencia: form.tipo === "mensalidade" ? "mensal" : null,
    });
  }

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
        <Card>
          <CardContent className="pt-5">
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="flex flex-col gap-1.5">
                <Label>Cliente</Label>
                <Input value={form.clienteNome} onChange={(e) => setForm((f) => ({ ...f, clienteNome: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Tipo</Label>
                <Select value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as CreateReceitaRequest["tipo"] }))}>
                  <option value="pagamento_unico">Pagamento único</option>
                  <option value="mensalidade">Mensalidade</option>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Valor (R$)</Label>
                <Input inputMode="decimal" placeholder="0,00" value={form.valorReais} onChange={(e) => setForm((f) => ({ ...f, valorReais: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Data</Label>
                <Input type="date" value={form.dataInicio} onChange={(e) => setForm((f) => ({ ...f, dataInicio: e.target.value }))} />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={createReceitaMutation.isPending}>
                  Lançar receita
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receitas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhuma receita lançada ainda.
                  </TableCell>
                </TableRow>
              )}
              {receitas.map((receita) => (
                <TableRow key={receita.id}>
                  <TableCell>{receita.clienteNome}</TableCell>
                  <TableCell>{receita.tipo === "mensalidade" ? "Mensalidade" : "Pagamento único"}</TableCell>
                  <TableCell className="font-numeric">{formatDate(receita.dataInicio)}</TableCell>
                  <TableCell>
                    <Badge variant={receita.status === "recebido" ? "positive" : receita.status === "atrasado" ? "negative" : "warning"}>
                      {receita.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-numeric text-positive">{formatMoney(receita.valorCentavos)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium tracking-[0.02em] text-muted-foreground uppercase">Gastos do projeto</h2>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gastos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhum gasto vinculado a este projeto.
                  </TableCell>
                </TableRow>
              )}
              {gastos.map((gasto) => (
                <TableRow key={gasto.id}>
                  <TableCell>{gasto.categoria}</TableCell>
                  <TableCell className="text-muted-foreground">{gasto.descricao ?? "—"}</TableCell>
                  <TableCell className="font-numeric">{formatDate(gasto.dataInicio)}</TableCell>
                  <TableCell className="text-right font-numeric text-negative">{formatMoney(gasto.valorCentavos)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </section>
    </div>
  );
}
