import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { financeiroApi, type CreateRetiradaRequest, type Retirada } from "@/api/financeiro";
import { usuariosApi } from "@/api/usuarios";
import { ApiError } from "@/lib/api";
import { formatDateOnly, formatMoney, hojeIso, reaisParaCentavos } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Trash2 } from "lucide-react";

type Subtipo = CreateRetiradaRequest["subtipo"];

const SUBTIPOS: { value: Subtipo; label: string }[] = [
  { value: "pro_labore", label: "Pró-labore" },
  { value: "distribuicao_lucro", label: "Distribuição de lucro" },
  { value: "reembolso", label: "Reembolso" },
  { value: "outro", label: "Outro" },
];

/** Valor do select de destinatário para "não é usuário do sistema — digitar o nome". */
const OUTRA_PESSOA = "__outra_pessoa__";

interface RetiradaFormState {
  subtipo: Subtipo;
  /** id de um usuário da empresa, `OUTRA_PESSOA`, ou "" (nada escolhido ainda). */
  destinatario: string;
  destinatarioNome: string;
  descricao: string;
  data: string;
  valorReais: string;
}

function formVazio(): RetiradaFormState {
  return { subtipo: "pro_labore", destinatario: "", destinatarioNome: "", descricao: "", data: hojeIso(), valorReais: "" };
}

function formDaRetirada(r: Retirada): RetiradaFormState {
  return {
    subtipo: r.subtipo,
    destinatario: r.destinatarioUsuarioId ?? OUTRA_PESSOA,
    destinatarioNome: r.destinatarioNome ?? "",
    descricao: r.descricao ?? "",
    data: r.data.slice(0, 10),
    valorReais: (r.valorCentavos / 100).toFixed(2).replace(".", ","),
  };
}

/** Valida como a API (valor > 0, data, destinatário, descrição); `null` com aviso se faltar algo. */
function paraRequest(form: RetiradaFormState): CreateRetiradaRequest | null {
  const valorCentavos = reaisParaCentavos(form.valorReais);
  const erro = !form.valorReais.trim()
    ? "Informe o valor da retirada."
    : !(valorCentavos > 0)
      ? "O valor deve ser maior que zero."
      : !form.data
        ? "Informe a data da retirada."
        : !form.destinatario || (form.destinatario === OUTRA_PESSOA && !form.destinatarioNome.trim())
          ? "Informe o destinatário."
          : !form.descricao.trim()
            ? "Informe a descrição."
            : null;
  if (erro) {
    toast.error(erro);
    return null;
  }
  const outraPessoa = form.destinatario === OUTRA_PESSOA;
  return {
    subtipo: form.subtipo,
    data: form.data,
    valorCentavos,
    descricao: form.descricao.trim(),
    destinatarioUsuarioId: outraPessoa ? null : form.destinatario,
    destinatarioNome: outraPessoa ? form.destinatarioNome.trim() : null,
  };
}

export function RetiradasSection() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<RetiradaFormState>(formVazio);
  const [editando, setEditando] = useState<{ id: number; form: RetiradaFormState } | null>(null);

  const { data: retiradas = [], isLoading } = useQuery({ queryKey: ["financeiro", "retiradas"], queryFn: () => financeiroApi.listRetiradas() });
  const { data: usuarios = [] } = useQuery({ queryKey: ["usuarios"], queryFn: () => usuariosApi.list(), retry: false });
  const nomeDestinatario = (r: Retirada) =>
    r.destinatarioUsuarioId ? (usuarios.find((u) => u.id === r.destinatarioUsuarioId)?.nome ?? "Usuário removido") : (r.destinatarioNome ?? "—");

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["financeiro"] });

  const createMutation = useMutation({
    mutationFn: (data: CreateRetiradaRequest) => financeiroApi.createRetirada(data),
    onSuccess: () => {
      invalidar();
      setForm(formVazio());
      toast.success("Retirada registrada.");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Não foi possível registrar a retirada."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateRetiradaRequest }) => financeiroApi.updateRetirada(id, data),
    onSuccess: () => {
      invalidar();
      setEditando(null);
      toast.success("Retirada atualizada.");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Não foi possível atualizar a retirada."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => financeiroApi.deleteRetirada(id),
    onSuccess: () => {
      invalidar();
      toast.success("Retirada excluída.");
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
            <CamposRetirada idPrefixo="nova" form={form} setForm={setForm} usuarios={usuarios} />
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
              <TableHead>Descrição</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && retiradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Nenhuma retirada registrada ainda.
                </TableCell>
              </TableRow>
            )}
            {retiradas.map((retirada) => (
              <TableRow key={retirada.id}>
                <TableCell>
                  <Badge variant="outline">{SUBTIPOS.find((s) => s.value === retirada.subtipo)?.label}</Badge>
                </TableCell>
                <TableCell>{nomeDestinatario(retirada)}</TableCell>
                <TableCell className="text-muted-foreground">{retirada.descricao ?? "—"}</TableCell>
                <TableCell className="font-numeric">{formatDateOnly(retirada.data)}</TableCell>
                <TableCell className="text-right font-numeric text-negative">{formatMoney(retirada.valorCentavos)}</TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <Button variant="ghost" size="icon" title="Editar" onClick={() => setEditando({ id: retirada.id, form: formDaRetirada(retirada) })}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Excluir"
                      onClick={() => {
                        if (window.confirm("Excluir esta retirada?")) deleteMutation.mutate(retirada.id);
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
            <DialogTitle>Editar retirada</DialogTitle>
          </DialogHeader>
          {editando && (
            <form onSubmit={handleSalvarEdicao} noValidate className="grid grid-cols-2 gap-4">
              <CamposRetirada
                idPrefixo="editar"
                form={editando.form}
                setForm={(fn) => setEditando((e) => (e ? { ...e, form: typeof fn === "function" ? fn(e.form) : fn } : e))}
                usuarios={usuarios}
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

function CamposRetirada({
  idPrefixo,
  form,
  setForm,
  usuarios,
  compacto = false,
}: {
  idPrefixo: string;
  form: RetiradaFormState;
  setForm: React.Dispatch<React.SetStateAction<RetiradaFormState>>;
  usuarios: { id: string; nome: string }[];
  compacto?: boolean;
}) {
  const id = (campo: string) => `${idPrefixo}-${campo}`;
  const outraPessoa = form.destinatario === OUTRA_PESSOA;
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("tipo")}>Tipo</Label>
        <Select id={id("tipo")} value={form.subtipo} onChange={(e) => setForm((f) => ({ ...f, subtipo: e.target.value as Subtipo }))}>
          {SUBTIPOS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("valor")}>Valor (R$) *</Label>
        <Input
          id={id("valor")}
          inputMode="decimal"
          placeholder="0,00"
          value={form.valorReais}
          onChange={(e) => setForm((f) => ({ ...f, valorReais: e.target.value.replace(/[^\d.,]/g, "") }))}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("data")}>Data *</Label>
        <Input id={id("data")} type="date" value={form.data} onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("destinatario")}>Destinatário *</Label>
        <Select id={id("destinatario")} value={form.destinatario} onChange={(e) => setForm((f) => ({ ...f, destinatario: e.target.value }))}>
          <option value="">Selecione</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nome}
            </option>
          ))}
          <option value={OUTRA_PESSOA}>Outra pessoa (digitar nome)</option>
        </Select>
      </div>
      {outraPessoa && (
        <div className={compacto ? "col-span-2 flex flex-col gap-1.5" : "flex flex-col gap-1.5"}>
          <Label htmlFor={id("destinatario-nome")}>Nome do destinatário *</Label>
          <Input
            id={id("destinatario-nome")}
            placeholder="Ex.: prestador sem login no Órbita"
            value={form.destinatarioNome}
            onChange={(e) => setForm((f) => ({ ...f, destinatarioNome: e.target.value }))}
          />
        </div>
      )}
      <div className={compacto ? "col-span-2 flex flex-col gap-1.5" : outraPessoa ? "col-span-2 flex flex-col gap-1.5" : "col-span-2 flex flex-col gap-1.5 md:col-span-3"}>
        <Label htmlFor={id("descricao")}>Descrição *</Label>
        <Input
          id={id("descricao")}
          placeholder="Ex.: pró-labore de novembro"
          value={form.descricao}
          onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
        />
      </div>
    </>
  );
}
