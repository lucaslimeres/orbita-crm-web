import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { financeiroApi, type CreateAporteRequest } from "@/api/financeiro";
import { ApiError } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2 } from "lucide-react";

const ORIGENS: { value: CreateAporteRequest["origem"]; label: string }[] = [
  { value: "socio", label: "Sócio" },
  { value: "investidor", label: "Investidor" },
  { value: "outro", label: "Outro" },
];

interface AporteFormState {
  origem: CreateAporteRequest["origem"];
  descricao: string;
  data: string;
  valorReais: string;
}

const emptyForm: AporteFormState = { origem: "socio", descricao: "", data: new Date().toISOString().slice(0, 10), valorReais: "" };

export function AportesSection() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<AporteFormState>(emptyForm);

  const { data: aportes = [], isLoading } = useQuery({ queryKey: ["financeiro", "aportes"], queryFn: () => financeiroApi.listAportes() });

  const createMutation = useMutation({
    mutationFn: (data: CreateAporteRequest) => financeiroApi.createAporte(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financeiro"] });
      setForm(emptyForm);
      toast.success("Aporte registrado.");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Não foi possível registrar o aporte."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => financeiroApi.deleteAporte(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["financeiro"] }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valorCentavos = Math.round(Number(form.valorReais.replace(",", ".")) * 100);
    if (!valorCentavos) return toast.error("Informe um valor válido.");
    createMutation.mutate({ origem: form.origem, data: form.data, descricao: form.descricao, valorCentavos });
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardContent className="pt-5">
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <Label>Origem</Label>
              <Select value={form.origem} onChange={(e) => setForm((f) => ({ ...f, origem: e.target.value as CreateAporteRequest["origem"] }))}>
                {ORIGENS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
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
              <Label>Descrição</Label>
              <Input value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} />
            </div>
            <div className="col-span-2 flex items-end md:col-span-4">
              <Button type="submit" disabled={createMutation.isPending}>
                Registrar aporte
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Origem</TableHead>
              <TableHead>Descrição</TableHead>
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
            {!isLoading && aportes.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Nenhum aporte registrado ainda.
                </TableCell>
              </TableRow>
            )}
            {aportes.map((aporte) => (
              <TableRow key={aporte.id}>
                <TableCell>{ORIGENS.find((o) => o.value === aporte.origem)?.label}</TableCell>
                <TableCell className="text-muted-foreground">{aporte.descricao ?? "—"}</TableCell>
                <TableCell className="font-numeric">{formatDate(aporte.data)}</TableCell>
                <TableCell className="text-right font-numeric text-positive">{formatMoney(aporte.valorCentavos)}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(aporte.id)}>
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
