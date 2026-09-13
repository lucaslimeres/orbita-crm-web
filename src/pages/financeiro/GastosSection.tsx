import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { financeiroApi, type CreateGastoRequest, type Recorrencia } from "@/api/financeiro";
import { ApiError } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2 } from "lucide-react";

const RECORRENCIAS: { value: Recorrencia; label: string }[] = [
  { value: "unico", label: "Único" },
  { value: "mensal", label: "Mensal" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
];

const CATEGORIAS = ["Servidor/Hosting", "Domínio", "Ferramenta/SaaS", "Marketing", "Contabilidade", "Jurídico", "Outro"];

const emptyForm: CreateGastoRequest = {
  categoria: CATEGORIAS[0],
  descricao: "",
  valorCentavos: 0,
  recorrencia: "unico",
  dataInicio: new Date().toISOString().slice(0, 10),
};

export function GastosSection() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreateGastoRequest & { valorReais: string }>({ ...emptyForm, valorReais: "" });

  const { data: gastos = [], isLoading } = useQuery({ queryKey: ["financeiro", "gastos"], queryFn: () => financeiroApi.listGastos() });

  const createMutation = useMutation({
    mutationFn: (data: CreateGastoRequest) => financeiroApi.createGasto(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financeiro"] });
      setForm({ ...emptyForm, valorReais: "" });
      toast.success("Gasto registrado.");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Não foi possível registrar o gasto."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => financeiroApi.deleteGasto(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["financeiro"] }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valorCentavos = Math.round(Number(form.valorReais.replace(",", ".")) * 100);
    if (!valorCentavos) return toast.error("Informe um valor válido.");
    createMutation.mutate({ ...form, valorCentavos });
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardContent className="pt-5">
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <Label>Categoria</Label>
              <Select value={form.categoria} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}>
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Valor (R$)</Label>
              <Input inputMode="decimal" placeholder="0,00" value={form.valorReais} onChange={(e) => setForm((f) => ({ ...f, valorReais: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Recorrência</Label>
              <Select value={form.recorrencia} onChange={(e) => setForm((f) => ({ ...f, recorrencia: e.target.value as Recorrencia }))}>
                {RECORRENCIAS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Data</Label>
              <Input type="date" value={form.dataInicio} onChange={(e) => setForm((f) => ({ ...f, dataInicio: e.target.value }))} />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5 md:col-span-3">
              <Label>Descrição / fornecedor</Label>
              <Input
                placeholder="Ex.: Railway — plano hobby"
                value={form.descricao ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value, fornecedor: e.target.value }))}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={createMutation.isPending} className="w-full">
                Adicionar gasto
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Categoria</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Recorrência</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && gastos.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Nenhum gasto lançado ainda.
                </TableCell>
              </TableRow>
            )}
            {gastos.map((gasto) => (
              <TableRow key={gasto.id}>
                <TableCell>{gasto.categoria}</TableCell>
                <TableCell className="text-muted-foreground">{gasto.descricao ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline">{RECORRENCIAS.find((r) => r.value === gasto.recorrencia)?.label}</Badge>
                </TableCell>
                <TableCell className="font-numeric">{formatDate(gasto.dataInicio)}</TableCell>
                <TableCell>
                  <Badge variant={gasto.status === "pago" ? "positive" : "warning"}>{gasto.status === "pago" ? "Pago" : "Pendente"}</Badge>
                </TableCell>
                <TableCell className="text-right font-numeric text-negative">{formatMoney(gasto.valorCentavos)}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(gasto.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
