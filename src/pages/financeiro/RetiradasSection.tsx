import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { financeiroApi, type CreateRetiradaRequest } from "@/api/financeiro";
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

const SUBTIPOS: { value: CreateRetiradaRequest["subtipo"]; label: string }[] = [
  { value: "pro_labore", label: "Pró-labore" },
  { value: "distribuicao_lucro", label: "Distribuição de lucro" },
  { value: "reembolso", label: "Reembolso" },
  { value: "outro", label: "Outro" },
];

interface RetiradaFormState {
  subtipo: CreateRetiradaRequest["subtipo"];
  destinatarioNome: string;
  descricao: string;
  data: string;
  valorReais: string;
}

const emptyForm: RetiradaFormState = {
  subtipo: "pro_labore",
  destinatarioNome: "",
  descricao: "",
  data: new Date().toISOString().slice(0, 10),
  valorReais: "",
};

export function RetiradasSection() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<RetiradaFormState>(emptyForm);

  const { data: retiradas = [], isLoading } = useQuery({ queryKey: ["financeiro", "retiradas"], queryFn: () => financeiroApi.listRetiradas() });

  const createMutation = useMutation({
    mutationFn: (data: CreateRetiradaRequest) => financeiroApi.createRetirada(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financeiro"] });
      setForm(emptyForm);
      toast.success("Retirada registrada.");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Não foi possível registrar a retirada."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => financeiroApi.deleteRetirada(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["financeiro"] }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valorCentavos = Math.round(Number(form.valorReais.replace(",", ".")) * 100);
    if (!valorCentavos) return toast.error("Informe um valor válido.");
    createMutation.mutate({
      subtipo: form.subtipo,
      data: form.data,
      descricao: form.descricao,
      destinatarioNome: form.destinatarioNome,
      valorCentavos,
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardContent className="pt-5">
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <Label>Tipo</Label>
              <Select value={form.subtipo} onChange={(e) => setForm((f) => ({ ...f, subtipo: e.target.value as CreateRetiradaRequest["subtipo"] }))}>
                {SUBTIPOS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Valor (R$)</Label>
              <Input inputMode="decimal" placeholder="0,00" value={form.valorReais} onChange={(e) => setForm((f) => ({ ...f, valorReais: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Data</Label>
              <Input type="date" value={form.data} onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Destinatário</Label>
              <Input placeholder="Nome do sócio/funcionário" value={form.destinatarioNome} onChange={(e) => setForm((f) => ({ ...f, destinatarioNome: e.target.value }))} />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5 md:col-span-3">
              <Label>Descrição</Label>
              <Input value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={createMutation.isPending} className="w-full">
                Registrar retirada
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Destinatário</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && retiradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Nenhuma retirada registrada ainda.
                </TableCell>
              </TableRow>
            )}
            {retiradas.map((retirada) => (
              <TableRow key={retirada.id}>
                <TableCell>
                  <Badge variant="outline">{SUBTIPOS.find((s) => s.value === retirada.subtipo)?.label}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{retirada.destinatarioNome ?? "—"}</TableCell>
                <TableCell className="font-numeric">{formatDate(retirada.data)}</TableCell>
                <TableCell className="text-right font-numeric text-negative">{formatMoney(retirada.valorCentavos)}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(retirada.id)}>
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
