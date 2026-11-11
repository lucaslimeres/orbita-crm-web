import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { financeiroApi, type CreateGastoRequest, type Gasto, type NovaMensalidadeRequest, type Recorrencia } from "@/api/financeiro";
import { projetosApi } from "@/api/projetos";
import { ApiError } from "@/lib/api";
import { formatDateOnly, formatMoney, hojeIso, reaisParaCentavos } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, Pencil, Trash2 } from "lucide-react";
import { agruparMensalidades } from "@/lib/mensalidades";
import { cn } from "@/lib/utils";
import { AcoesRecorrente, EncerrarRecorrenciaDialog, NovaMensalidadeDialog, ResumoRecorrente } from "./mensalidades";

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

/** Nas rotas de gasto do projeto o projeto vem da URL — o corpo não leva `projetoId`. */
function semProjeto<T extends { projetoId?: number | null }>(data: T): Omit<T, "projetoId"> {
  const resto = { ...data };
  delete resto.projetoId;
  return resto;
}

/** `null` (com aviso) se o valor não for um número positivo. */
function paraRequest(form: GastoFormState): CreateGastoRequest | null {
  const valorCentavos = reaisParaCentavos(form.valorReais);
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

/**
 * Lista + cadastro/edição de gastos. Sem `projetoId`: gastos da empresa (Financeiro), com
 * campo para vincular a um projeto. Com `projetoId`: só os gastos daquele projeto (painel
 * do projeto), usando as rotas `/projetos/:id/gastos` — o projeto fica fixo.
 */
export function GastosSection({ projetoId }: { projetoId?: number } = {}) {
  const queryClient = useQueryClient();
  const doProjeto = projetoId !== undefined;
  const api = doProjeto
    ? {
        list: () => projetosApi.listGastos(projetoId),
        create: (data: CreateGastoRequest) => projetosApi.createGasto(projetoId, semProjeto(data)),
        update: (id: number, data: Partial<CreateGastoRequest>) => projetosApi.updateGasto(projetoId, id, semProjeto(data)),
        remove: (id: number) => projetosApi.deleteGasto(projetoId, id),
        addMensalidade: (id: number, data: NovaMensalidadeRequest) => projetosApi.addMensalidadeGasto(projetoId, id, data),
      }
    : {
        list: () => financeiroApi.listGastos(),
        create: financeiroApi.createGasto,
        update: financeiroApi.updateGasto,
        remove: financeiroApi.deleteGasto,
        addMensalidade: financeiroApi.addMensalidadeGasto,
      };
  const [form, setForm] = useState<GastoFormState>(formVazio);
  const [editando, setEditando] = useState<{ id: number; form: GastoFormState; mensalidade: boolean } | null>(null);
  const [abertos, setAbertos] = useState<Set<number>>(new Set());
  const [novaMensalidade, setNovaMensalidade] = useState<Gasto | null>(null);
  const [encerrando, setEncerrando] = useState<Gasto | null>(null);

  const { data: gastos = [], isLoading } = useQuery({
    queryKey: doProjeto ? ["projetos", projetoId, "gastos"] : ["financeiro", "gastos"],
    queryFn: api.list,
  });
  // Sem permissão de ver projetos, a lista vem vazia e o gasto fica "Geral da empresa".
  const { data: projetos = [] } = useQuery({ queryKey: ["projetos"], queryFn: () => projetosApi.list(), retry: false, enabled: !doProjeto });
  const nomeProjeto = (id: number | null) => (id ? (projetos.find((p) => p.id === id)?.nome ?? `Projeto #${id}`) : null);

  const createMutation = useMutation({
    mutationFn: (data: CreateGastoRequest) => api.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financeiro"] });
      queryClient.invalidateQueries({ queryKey: ["projetos"] });
      setForm(formVazio());
      toast.success("Gasto registrado.");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Não foi possível registrar o gasto."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateGastoRequest }) => api.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financeiro"] });
      queryClient.invalidateQueries({ queryKey: ["projetos"] });
      setEditando(null);
      toast.success("Gasto atualizado.");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Não foi possível atualizar o gasto."),
  });

  const marcarPagoMutation = useMutation({
    mutationFn: (id: number) => api.update(id, { status: "pago" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financeiro"] });
      queryClient.invalidateQueries({ queryKey: ["projetos"] });
      toast.success("Gasto marcado como pago.");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Não foi possível marcar o gasto como pago."),
  });

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ["financeiro"] });
    queryClient.invalidateQueries({ queryKey: ["projetos"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const mensalidadeMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: NovaMensalidadeRequest }) => api.addMensalidade(id, data),
    onSuccess: (_, { id }) => {
      invalidar();
      setNovaMensalidade(null);
      setAbertos((a) => new Set(a).add(id));
      toast.success("Mensalidade adicionada.");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Não foi possível adicionar a mensalidade."),
  });

  const encerrarMutation = useMutation({
    mutationFn: ({ id, dataFim }: { id: number; dataFim: string | null }) => api.update(id, { dataFim }),
    onSuccess: (_, { dataFim }) => {
      invalidar();
      setEncerrando(null);
      toast.success(dataFim ? "Recorrência encerrada." : "Recorrência reaberta.");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Não foi possível atualizar a recorrência."),
  });

  // Mensalidades aparecem agrupadas dentro do gasto recorrente (expandir pela linha dele).
  const { topo, mensalidadesDe } = agruparMensalidades(gastos);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.remove(id),
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
    // Mensalidade não muda de recorrência nem de projeto: isso fica no gasto principal.
    if (data) updateMutation.mutate({ id: editando.id, data: editando.mensalidade ? { ...data, recorrencia: "unico", projetoId: undefined } : data });
  }

  function alternar(id: number) {
    setAbertos((a) => {
      const novo = new Set(a);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function linha(gasto: Gasto, mensalidade: boolean) {
    return (
      <TableRow key={gasto.id} className={cn(mensalidade && "bg-muted/40")}>
        <TableCell className={cn(mensalidade && "pl-8 text-muted-foreground")}>{mensalidade ? "↳ Mensalidade" : gasto.categoria}</TableCell>
        <TableCell className="text-muted-foreground">
          {gasto.descricao ?? "—"}
          {!doProjeto && !mensalidade && gasto.projetoId && <span className="block text-xs">Projeto: {nomeProjeto(gasto.projetoId)}</span>}
          {gasto.serie && <ResumoRecorrente serie={gasto.serie} dataFim={gasto.dataFim} aberto={abertos.has(gasto.id)} onAlternar={() => alternar(gasto.id)} />}
        </TableCell>
        <TableCell>{!mensalidade && <Badge variant="outline">{RECORRENCIAS.find((r) => r.value === gasto.recorrencia)?.label}</Badge>}</TableCell>
        <TableCell className="font-numeric">{formatDateOnly(gasto.dataInicio)}</TableCell>
        <TableCell className="font-numeric text-muted-foreground">{gasto.proximaOcorrencia ? formatDateOnly(gasto.proximaOcorrencia) : "—"}</TableCell>
        <TableCell>
          <Badge variant={gasto.status === "pago" ? "positive" : "warning"}>{gasto.status === "pago" ? "Pago" : "Pendente"}</Badge>
        </TableCell>
        <TableCell className="text-right font-numeric text-negative">{formatMoney(gasto.valorCentavos)}</TableCell>
        <TableCell>
          <div className="flex items-center justify-end gap-1">
            {gasto.status === "pendente" && (
              <Button
                variant="secondary"
                size="sm"
                disabled={marcarPagoMutation.isPending && marcarPagoMutation.variables === gasto.id}
                onClick={() => marcarPagoMutation.mutate(gasto.id)}
              >
                <CheckCircle2 className="size-4" />
                Marcar como pago
              </Button>
            )}
            {gasto.serie && (
              <AcoesRecorrente serie={gasto.serie} dataFim={gasto.dataFim} onAdicionar={() => setNovaMensalidade(gasto)} onEncerrar={() => setEncerrando(gasto)} />
            )}
            <Button variant="ghost" size="icon" title="Editar" onClick={() => setEditando({ id: gasto.id, form: formDoGasto(gasto), mensalidade })}>
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Excluir"
              onClick={() => {
                const msg =
                  gasto.serie && gasto.serie.quantidade > 1
                    ? `Excluir este gasto recorrente e as ${gasto.serie.quantidade - 1} mensalidades lançadas nele?`
                    : "Excluir este gasto?";
                if (window.confirm(msg)) deleteMutation.mutate(gasto.id);
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardContent className="pt-5">
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <CamposGasto idPrefixo="novo" form={form} setForm={setForm} projetos={projetos} mostrarProjeto={!doProjeto} />
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
            {!isLoading && topo.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Nenhum gasto lançado ainda.
                </TableCell>
              </TableRow>
            )}
            {topo.flatMap((gasto) => [linha(gasto, false), ...(abertos.has(gasto.id) ? mensalidadesDe(gasto.id).map((m) => linha(m, true)) : [])])}
          </TableBody>
        </Table>
      </Card>

      <p className="text-xs text-muted-foreground">
        <strong>Pago</strong>: o dinheiro já saiu — entra no saldo em caixa. <strong>Pendente</strong>: ainda vai ser pago — não desconta do
        saldo até ser marcado como pago ("Marcar como pago", ou em "Editar" para voltar a pendente). Nos gastos recorrentes, cada mês é
        lançado em <strong>Mensalidade</strong> (já vem com o valor da última e o mês seguinte); a previsão repete a última mensalidade até a
        recorrência ser encerrada.
      </p>

      <NovaMensalidadeDialog
        serie={novaMensalidade?.serie ?? null}
        titulo={novaMensalidade ? `${novaMensalidade.categoria}${novaMensalidade.descricao ? ` — ${novaMensalidade.descricao}` : ""}` : ""}
        onClose={() => setNovaMensalidade(null)}
        onSalvar={(data) => novaMensalidade && mensalidadeMutation.mutate({ id: novaMensalidade.id, data })}
        salvando={mensalidadeMutation.isPending}
        rotuloPago="pago"
      />
      <EncerrarRecorrenciaDialog
        alvo={encerrando ? { dataFim: encerrando.dataFim, nome: `${encerrando.categoria}${encerrando.descricao ? ` — ${encerrando.descricao}` : ""}` } : null}
        onClose={() => setEncerrando(null)}
        onSalvar={(dataFim) => encerrando && encerrarMutation.mutate({ id: encerrando.id, dataFim })}
        salvando={encerrarMutation.isPending}
      />

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
                mostrarProjeto={!doProjeto && !editando.mensalidade}
                semRecorrencia={editando.mensalidade}
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
  mostrarProjeto,
  semRecorrencia = false,
  compacto = false,
}: {
  idPrefixo: string;
  form: GastoFormState;
  setForm: React.Dispatch<React.SetStateAction<GastoFormState>>;
  projetos: { id: number; nome: string }[];
  mostrarProjeto: boolean;
  /** Mensalidade de um recorrente: a recorrência fica no gasto principal. */
  semRecorrencia?: boolean;
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
      {!semRecorrencia && (
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
      )}
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
      {mostrarProjeto && (
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
      )}
      <div className={compacto ? "col-span-2 flex flex-col gap-1.5" : mostrarProjeto ? "col-span-2 flex flex-col gap-1.5 md:col-span-1" : "col-span-2 flex flex-col gap-1.5"}>
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
