import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { financeiroApi, type Aporte, type CreateAporteRequest } from "@/api/financeiro";
import { ApiError } from "@/lib/api";
import { formatDateOnly, formatMoney, hojeIso, reaisParaCentavos } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Trash2 } from "lucide-react";

type Origem = CreateAporteRequest["origem"];

const ORIGENS: { value: Origem; label: string }[] = [
  { value: "socio", label: "Sócio" },
  { value: "investidor", label: "Investidor" },
  { value: "outro", label: "Outro" },
];

interface AporteFormState {
  origem: Origem;
  descricao: string;
  data: string;
  valorReais: string;
}

function formVazio(): AporteFormState {
  return { origem: "socio", descricao: "", data: hojeIso(), valorReais: "" };
}

function formDoAporte(a: Aporte): AporteFormState {
  return {
    origem: a.origem,
    descricao: a.descricao ?? "",
    data: a.data.slice(0, 10),
    valorReais: (a.valorCentavos / 100).toFixed(2).replace(".", ","),
  };
}

/** Valida como a API (valor > 0, data); `null` com aviso amigável se faltar algo. */
function paraRequest(form: AporteFormState): CreateAporteRequest | null {
  const valorCentavos = reaisParaCentavos(form.valorReais);
  const erro = !form.valorReais.trim()
    ? "Informe o valor do aporte."
    : Number.isNaN(valorCentavos)
      ? "Valor inválido — use só números, por exemplo 1.500,00."
      : !(valorCentavos > 0)
        ? "O valor do aporte deve ser maior que zero."
        : !form.data
          ? "Informe a data do aporte."
          : null;
  if (erro) {
    toast.error(erro);
    return null;
  }
  return { origem: form.origem, data: form.data, descricao: form.descricao.trim() || null, valorCentavos };
}

export function AportesSection() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<AporteFormState>(formVazio);
  const [editando, setEditando] = useState<{ id: number; form: AporteFormState } | null>(null);

  const { data: aportes = [], isLoading } = useQuery({ queryKey: ["financeiro", "aportes"], queryFn: () => financeiroApi.listAportes() });

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ["financeiro"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateAporteRequest) => financeiroApi.createAporte(data),
    onSuccess: () => {
      invalidar();
      setForm(formVazio());
      toast.success("Aporte registrado.");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Não foi possível registrar o aporte."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateAporteRequest }) => financeiroApi.updateAporte(id, data),
    onSuccess: () => {
      invalidar();
      setEditando(null);
      toast.success("Aporte atualizado.");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Não foi possível atualizar o aporte."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => financeiroApi.deleteAporte(id),
    onSuccess: () => {
      invalidar();
      toast.success("Aporte excluído.");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = paraRequest(form);
    if (data) createMutation.mutate(data);
  }

  function handleSalvarEdicao(e: React.FormEvent) {
    e.preventDefault();
    if (!editando) return;
    const data = paraRequest(editando.form);
    if (data) updateMutation.mutate({ id: editando.id, data });
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardContent className="pt-5">
          <form onSubmit={handleSubmit} noValidate className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <CamposAporte idPrefixo="novo" form={form} setForm={setForm} />
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
                <TableCell className="text-muted-foreground">{aporte.descricao || "—"}</TableCell>
                <TableCell className="font-numeric">{formatDateOnly(aporte.data)}</TableCell>
                <TableCell className="text-right font-numeric text-positive">{formatMoney(aporte.valorCentavos)}</TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <Button variant="ghost" size="icon" title="Editar" onClick={() => setEditando({ id: aporte.id, form: formDoAporte(aporte) })}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Excluir"
                      onClick={() => {
                        if (window.confirm("Excluir este aporte?")) deleteMutation.mutate(aporte.id);
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!editando} onOpenChange={(open) => !open && setEditando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar aporte</DialogTitle>
          </DialogHeader>
          {editando && (
            <form onSubmit={handleSalvarEdicao} noValidate className="grid grid-cols-2 gap-4">
              <CamposAporte
                idPrefixo="editar"
                form={editando.form}
                setForm={(fn) => setEditando((e) => (e ? { ...e, form: typeof fn === "function" ? fn(e.form) : fn } : e))}
              />
              <div className="col-span-2 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setEditando(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CamposAporte({
  idPrefixo,
  form,
  setForm,
}: {
  idPrefixo: string;
  form: AporteFormState;
  setForm: React.Dispatch<React.SetStateAction<AporteFormState>>;
}) {
  const id = (campo: string) => `${idPrefixo}-aporte-${campo}`;
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("origem")}>Origem</Label>
        <Select id={id("origem")} value={form.origem} onChange={(e) => setForm((f) => ({ ...f, origem: e.target.value as Origem }))}>
          {ORIGENS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("valor")}>Valor (R$)</Label>
        <Input
          id={id("valor")}
          inputMode="decimal"
          placeholder="0,00"
          value={form.valorReais}
          onChange={(e) => setForm((f) => ({ ...f, valorReais: e.target.value.replace(/[^\d.,]/g, "") }))}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("data")}>Data</Label>
        <Input id={id("data")} type="date" value={form.data} onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("descricao")}>Descrição</Label>
        <Input id={id("descricao")} value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} />
      </div>
    </>
  );
}
