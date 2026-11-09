import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { financeiroApi, type CreateGastoRequest, type Gasto, type Recorrencia } from "@/api/financeiro";
import { projetosApi } from "@/api/projetos";
import { ApiError } from "@/lib/api";
import { formatDateOnly, formatMoney, hojeIso } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Trash2 } from "lucide-react";

const RECORRENCIAS: { value: Recorrencia; label: string }[] = [
  { value: "unico", label: "Único" },
  { value: "mensal", label: "Mensal" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
];

const CATEGORIAS = ["Servidor/Hosting", "Domínio", "Ferramenta/SaaS", "Marketing", "Contabilidade", "Jurídico", "Outro"];

type GastoStatus = "pago" | "pendente";

/** Estado do formulário: valor digitado em reais (string) — vira centavos só no envio. */
interface GastoFormState {
  categoria: string;
  valorReais: string;
  recorrencia: Recorrencia;
  dataInicio: string;
  status: GastoStatus;
  projetoId: number | null;
  descricao: string;
}

function formVazio(): GastoFormState {
  return { categoria: CATEGORIAS[0], valorReais: "", recorrencia: "unico", dataInicio: hojeIso(), status: "pago", projetoId: null, descricao: "" };
}

function formDoGasto(gasto: Gasto): GastoFormState {
  return {
    categoria: gasto.categoria,
    valorReais: (gasto.valorCentavos / 100).toFixed(2).replace(".", ","),
    recorrencia: gasto.recorrencia,
    dataInicio: gasto.dataInicio.slice(0, 10),
    status: gasto.status,
    projetoId: gasto.projetoId,
    descricao: gasto.descricao ?? "",
  };
}

/** `null` (com aviso) se o valor não for um número positivo. */
function paraRequest(form: GastoFormState): CreateGastoRequest | null {
  // "1.234,56" (vírgula decimal, ponto de milhar) ou "1234.56"/"100.5" (ponto decimal).
  const texto = form.valorReais.includes(",") ? form.valorReais.replace(/\./g, "").replace(",", ".") : form.valorReais;
  const valorCentavos = Math.round(Number(texto) * 100);
  if (!valorCentavos || valorCentavos < 0) {
    toast.error("Informe o valor do gasto.");
    return null;
  }
  return {
    categoria: form.categoria,
    valorCentavos,
    recorrencia: form.recorrencia,
    dataInicio: form.dataInicio,
    status: form.status,
    projetoId: form.projetoId,
    descricao: form.descricao || null,
    fornecedor: form.descricao || null,
  };
}

export function GastosSection() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<GastoFormState>(formVazio);
  const [editando, setEditando] = useState<{ id: number; form: GastoFormState } | null>(null);

  const { data: gastos = [], isLoading } = useQuery({ queryKey: ["financeiro", "gastos"], queryFn: () => financeiroApi.listGastos() });
  // Sem permissão de ver projetos, a lista vem vazia e o gasto fica "Geral da empresa".
  const { data: projetos = [] } = useQuery({ queryKey: ["projetos"], queryFn: () => projetosApi.list(), retry: false });
  const nomeProjeto = (id: number | null) => (id ? (projetos.find((p) => p.id === id)?.nome ?? `Projeto #${id}`) : null);

  const createMutation = useMutation({
    mutationFn: (data: CreateGastoRequest) => financeiroApi.createGasto(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financeiro"] });
      queryClient.invalidateQueries({ queryKey: ["projetos"] });
      setForm(formVazio());
      toast.success("Gasto registrado.");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Não foi possível registrar o gasto."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateGastoRequest }) => financeiroApi.updateGasto(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financeiro"] });
      queryClient.invalidateQueries({ queryKey: ["projetos"] });
      setEditando(null);
      toast.success("Gasto atualizado.");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Não foi possível atualizar o gasto."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => financeiroApi.deleteGasto(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financeiro"] });
      queryClient.invalidateQueries({ queryKey: ["projetos"] });
      toast.success("Gasto excluído.");
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
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <CamposGasto idPrefixo="novo" form={form} setForm={setForm} projetos={projetos} />
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
              <TableHead>Próxima</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && gastos.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Nenhum gasto lançado ainda.
                </TableCell>
              </TableRow>
            )}
            {gastos.map((gasto) => (
              <TableRow key={gasto.id}>
                <TableCell>{gasto.categoria}</TableCell>
                <TableCell className="text-muted-foreground">
                  {gasto.descricao ?? "—"}
                  {gasto.projetoId && <span className="block text-xs">Projeto: {nomeProjeto(gasto.projetoId)}</span>}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{RECORRENCIAS.find((r) => r.value === gasto.recorrencia)?.label}</Badge>
                </TableCell>
                <TableCell className="font-numeric">{formatDateOnly(gasto.dataInicio)}</TableCell>
                <TableCell className="font-numeric text-muted-foreground">
                  {gasto.proximaOcorrencia ? formatDateOnly(gasto.proximaOcorrencia) : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={gasto.status === "pago" ? "positive" : "warning"}>{gasto.status === "pago" ? "Pago" : "Pendente"}</Badge>
                </TableCell>
                <TableCell className="text-right font-numeric text-negative">{formatMoney(gasto.valorCentavos)}</TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <Button variant="ghost" size="icon" title="Editar" onClick={() => setEditando({ id: gasto.id, form: formDoGasto(gasto) })}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Excluir"
                      onClick={() => {
                        if (window.confirm("Excluir este gasto?")) deleteMutation.mutate(gasto.id);
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

      <p className="text-xs text-muted-foreground">
        <strong>Pago</strong>: o dinheiro já saiu — entra no saldo em caixa. <strong>Pendente</strong>: ainda vai ser pago — não desconta do
        saldo até ser marcado como pago (em "Editar").
      </p>

      <Dialog open={!!editando} onOpenChange={(open) => !open && setEditando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar gasto</DialogTitle>
            <DialogDescription>Mudar a data ou a recorrência recalcula a próxima ocorrência.</DialogDescription>
          </DialogHeader>
          {editando && (
            <form onSubmit={handleSalvarEdicao} className="grid grid-cols-2 gap-4">
              <CamposGasto
                idPrefixo="editar"
                form={editando.form}
                setForm={(fn) => setEditando((e) => (e ? { ...e, form: typeof fn === "function" ? fn(e.form) : fn } : e))}
                projetos={projetos}
                compacto
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

function CamposGasto({
  idPrefixo,
  form,
  setForm,
  projetos,
  compacto = false,
}: {
  idPrefixo: string;
  form: GastoFormState;
  setForm: React.Dispatch<React.SetStateAction<GastoFormState>>;
  projetos: { id: number; nome: string }[];
  compacto?: boolean;
}) {
  const id = (campo: string) => `${idPrefixo}-${campo}`;
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("categoria")}>Categoria</Label>
        <Select id={id("categoria")} value={form.categoria} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}>
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>
              {c}
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
        <Label htmlFor={id("recorrencia")}>Recorrência</Label>
        <Select id={id("recorrencia")} value={form.recorrencia} onChange={(e) => setForm((f) => ({ ...f, recorrencia: e.target.value as Recorrencia }))}>
          {RECORRENCIAS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("data")}>Data</Label>
        <Input id={id("data")} type="date" required value={form.dataInicio} onChange={(e) => setForm((f) => ({ ...f, dataInicio: e.target.value }))} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("status")}>Status</Label>
        <Select id={id("status")} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as GastoStatus }))}>
          <option value="pago">Pago</option>
          <option value="pendente">Pendente</option>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("projeto")}>Projeto</Label>
        <Select
          id={id("projeto")}
          value={form.projetoId ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, projetoId: e.target.value ? Number(e.target.value) : null }))}
        >
          <option value="">Geral da empresa</option>
          {projetos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </Select>
      </div>
      <div className={compacto ? "col-span-2 flex flex-col gap-1.5" : "col-span-2 flex flex-col gap-1.5 md:col-span-1"}>
        <Label htmlFor={id("descricao")}>Descrição / fornecedor</Label>
        <Input
          id={id("descricao")}
          placeholder="Ex.: Railway — plano hobby"
          value={form.descricao}
          onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
        />
      </div>
    </>
  );
}
