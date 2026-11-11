import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Trash2 } from "lucide-react";
import { projetosApi, type CreateReceitaRequest, type Receita } from "@/api/projetos";
import type { NovaMensalidadeRequest } from "@/api/financeiro";
import { ApiError } from "@/lib/api";
import { formatDateOnly, formatMoney, hojeIso, reaisParaCentavos } from "@/lib/format";
import { agruparMensalidades } from "@/lib/mensalidades";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AcoesRecorrente, EncerrarRecorrenciaDialog, NovaMensalidadeDialog, ResumoRecorrente } from "@/pages/financeiro/mensalidades";

const STATUS: Record<Receita["status"], { label: string; variant: "positive" | "warning" | "negative" }> = {
  recebido: { label: "Recebido", variant: "positive" },
  pendente: { label: "Pendente", variant: "warning" },
  atrasado: { label: "Atrasado", variant: "negative" },
};

interface ReceitaForm {
  descricao: string;
  tipo: CreateReceitaRequest["tipo"];
  valorReais: string;
  dataInicio: string;
}

function formVazio(): ReceitaForm {
  return {
    descricao: "",
    tipo: "pagamento_unico",
    valorReais: "",
    dataInicio: hojeIso(),
  };
}

/** Receitas legadas tinham só o cliente; as novas, só a descrição. */
function nomeReceita(r: Receita): string {
  return r.descricao || r.clienteNome || "—";
}

/**
 * Receitas do projeto. Status pela data (decidido pela API): até hoje já entra como
 * "Recebido"; data futura entra "Pendente", com o botão "Marcar como recebido". Mensalidade
 * é recorrente: cada mês seguinte é lançado em "+ Mensalidade" (ver docs/financeiro.md).
 */
export function ReceitasSection({ projetoId }: { projetoId: number }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ReceitaForm>(formVazio);
  const [abertos, setAbertos] = useState<Set<number>>(new Set());
  const [novaMensalidade, setNovaMensalidade] = useState<Receita | null>(null);
  const [encerrando, setEncerrando] = useState<Receita | null>(null);

  const { data: receitas = [], isLoading } = useQuery({
    queryKey: ["projetos", projetoId, "receitas"],
    queryFn: () => projetosApi.listReceitas(projetoId),
  });
  const { topo, mensalidadesDe } = agruparMensalidades(receitas);

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ["projetos", projetoId] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateReceitaRequest) => projetosApi.createReceita(projetoId, data),
    onSuccess: (receita) => {
      invalidar();
      setForm(formVazio());
      toast.success(receita.status === "recebido" ? "Receita lançada como recebida." : "Receita lançada como pendente.");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Não foi possível lançar a receita."),
  });

  const recebidoMutation = useMutation({
    mutationFn: (id: number) => projetosApi.updateReceita(id, { status: "recebido" }),
    onSuccess: () => {
      invalidar();
      toast.success("Receita marcada como recebida.");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Não foi possível atualizar a receita."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => projetosApi.deleteReceita(id),
    onSuccess: () => {
      invalidar();
      toast.success("Receita excluída.");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Não foi possível excluir a receita."),
  });

  const mensalidadeMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: NovaMensalidadeRequest }) => projetosApi.addMensalidadeReceita(projetoId, id, data),
    onSuccess: (_, { id }) => {
      invalidar();
      setNovaMensalidade(null);
      setAbertos((a) => new Set(a).add(id));
      toast.success("Mensalidade adicionada.");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Não foi possível adicionar a mensalidade."),
  });

  const encerrarMutation = useMutation({
    mutationFn: ({ id, dataFim }: { id: number; dataFim: string | null }) => projetosApi.updateReceita(id, { dataFim }),
    onSuccess: (_, { dataFim }) => {
      invalidar();
      setEncerrando(null);
      toast.success(dataFim ? "Recorrência encerrada." : "Recorrência reaberta.");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Não foi possível atualizar a recorrência."),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valorCentavos = reaisParaCentavos(form.valorReais);
    if (!form.descricao.trim()) return toast.error("Informe a descrição da receita.");
    if (!(valorCentavos > 0)) return toast.error("O valor deve ser maior que zero.");
    if (!form.dataInicio) return toast.error("Informe a data.");
    createMutation.mutate({
      descricao: form.descricao.trim(),
      tipo: form.tipo,
      valorCentavos,
      dataInicio: form.dataInicio,
      recorrencia: form.tipo === "mensalidade" ? "mensal" : null,
    });
  }

  function alternar(id: number) {
    setAbertos((a) => {
      const novo = new Set(a);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function linha(receita: Receita, mensalidade: boolean) {
    const status = STATUS[receita.status];
    return (
      <TableRow key={receita.id} className={cn(mensalidade && "bg-muted/40")}>
        <TableCell className={cn(mensalidade && "pl-8 text-muted-foreground")}>
          {mensalidade ? "↳ Mensalidade" : nomeReceita(receita)}
          {receita.serie && (
            <ResumoRecorrente
              serie={receita.serie}
              dataFim={receita.dataFim}
              aberto={abertos.has(receita.id)}
              onAlternar={() => alternar(receita.id)}
            />
          )}
        </TableCell>
        <TableCell>{mensalidade ? "" : receita.tipo === "mensalidade" ? "Mensalidade" : "Pagamento único"}</TableCell>
        <TableCell className="font-numeric">{formatDateOnly(receita.dataInicio)}</TableCell>
        <TableCell className="font-numeric text-muted-foreground">
          {receita.proximaOcorrencia ? formatDateOnly(receita.proximaOcorrencia) : "—"}
        </TableCell>
        <TableCell>
          <Badge variant={status.variant}>{status.label}</Badge>
        </TableCell>
        <TableCell className="text-right font-numeric text-positive">{formatMoney(receita.valorCentavos)}</TableCell>
        <TableCell>
          <div className="flex items-center justify-end gap-1">
            {receita.status !== "recebido" && (
              <Button
                variant="secondary"
                size="sm"
                disabled={recebidoMutation.isPending && recebidoMutation.variables === receita.id}
                onClick={() => recebidoMutation.mutate(receita.id)}
              >
                <CheckCircle2 className="size-4" />
                Marcar como recebido
              </Button>
            )}
            {receita.serie && (
              <AcoesRecorrente
                serie={receita.serie}
                dataFim={receita.dataFim}
                onAdicionar={() => setNovaMensalidade(receita)}
                onEncerrar={() => setEncerrando(receita)}
              />
            )}
            <Button
              variant="ghost"
              size="icon"
              title="Excluir"
              onClick={() => {
                const msg =
                  receita.serie && receita.serie.quantidade > 1
                    ? `Excluir esta receita recorrente e as ${receita.serie.quantidade - 1} mensalidades lançadas nela?`
                    : "Excluir esta receita?";
                if (window.confirm(msg)) deleteMutation.mutate(receita.id);
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
          <form onSubmit={handleSubmit} noValidate className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="receita-descricao">Descrição</Label>
              <Input
                id="receita-descricao"
                placeholder="Ex.: Manutenção mensal do site"
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="receita-tipo">Tipo</Label>
              <Select
                id="receita-tipo"
                value={form.tipo}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    tipo: e.target.value as ReceitaForm["tipo"],
                  }))
                }
              >
                <option value="pagamento_unico">Pagamento único</option>
                <option value="mensalidade">Mensalidade (recorrente)</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="receita-valor">Valor (R$)</Label>
              <Input
                id="receita-valor"
                inputMode="decimal"
                placeholder="0,00"
                value={form.valorReais}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    valorReais: e.target.value.replace(/[^\d.,]/g, ""),
                  }))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="receita-data">Data</Label>
              <Input id="receita-data" type="date" value={form.dataInicio} onChange={(e) => setForm((f) => ({ ...f, dataInicio: e.target.value }))} />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={createMutation.isPending} className="w-full">
                Lançar receita
              </Button>
            </div>
            <p className="col-span-2 self-end text-xs text-muted-foreground md:col-span-2">
              Data até hoje entra como <strong>recebida</strong>; data futura entra como <strong>pendente</strong>.
            </p>
          </form>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Tipo</TableHead>
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
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && topo.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Nenhuma receita lançada ainda.
                </TableCell>
              </TableRow>
            )}
            {topo.flatMap((r) => [linha(r, false), ...(abertos.has(r.id) ? mensalidadesDe(r.id).map((m) => linha(m, true)) : [])])}
          </TableBody>
        </Table>
      </Card>

      <NovaMensalidadeDialog
        serie={novaMensalidade?.serie ?? null}
        titulo={novaMensalidade ? nomeReceita(novaMensalidade) : ""}
        onClose={() => setNovaMensalidade(null)}
        onSalvar={(data) => novaMensalidade && mensalidadeMutation.mutate({ id: novaMensalidade.id, data })}
        salvando={mensalidadeMutation.isPending}
        rotuloPago="recebida"
      />
      <EncerrarRecorrenciaDialog
        alvo={encerrando ? { dataFim: encerrando.dataFim, nome: nomeReceita(encerrando) } : null}
        onClose={() => setEncerrando(null)}
        onSalvar={(dataFim) => encerrando && encerrarMutation.mutate({ id: encerrando.id, dataFim })}
        salvando={encerrarMutation.isPending}
      />
    </div>
  );
}
