import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { GastosSection } from "@/pages/financeiro/GastosSection";
import { ReceitasSection } from "./ReceitasSection";
import { projetosApi, type Projeto, type ProjetoStatus } from "@/api/projetos";
import { ApiError } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const STATUS: { value: ProjetoStatus; label: string }[] = [
  { value: "em_desenvolvimento", label: "Em desenvolvimento" },
  { value: "em_producao", label: "Em produção" },
  { value: "pausado", label: "Pausado" },
  { value: "encerrado", label: "Encerrado" },
];

/** Mesmo padrão de abas do Financeiro (Gastos / Aportes / Retiradas). */
const TABS = [
  { key: "receitas", label: "Receitas" },
  { key: "gastos", label: "Gastos" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function ProjetoDetailPage() {
  const { projetoId } = useParams({ from: "/_authenticated/projetos/$projetoId" });
  const id = Number(projetoId);
  const [tab, setTab] = useState<TabKey>("receitas");
  const [editando, setEditando] = useState(false);

  const { data: projeto } = useQuery({ queryKey: ["projetos", id], queryFn: () => projetosApi.get(id) });
  const { data: dashboard } = useQuery({ queryKey: ["projetos", id, "dashboard"], queryFn: () => projetosApi.dashboard(id) });

  if (!projeto) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-[-0.02em]">{projeto.nome}</h1>
            <Badge variant="outline">{STATUS.find((s) => s.value === projeto.status)?.label}</Badge>
          </div>
          {projeto.descricao && <p className="text-sm text-muted-foreground">{projeto.descricao}</p>}
        </div>
        <Button variant="secondary" onClick={() => setEditando(true)}>
          <Pencil className="size-4" />
          Editar projeto
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
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

      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn("px-3 py-2 text-sm font-medium text-muted-foreground transition-colors", tab === t.key && "border-b-2 border-primary text-foreground")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "receitas" && <ReceitasSection projetoId={id} />}
      {tab === "gastos" && <GastosSection projetoId={id} />}

      <EditarProjetoDialog projeto={projeto} open={editando} onOpenChange={setEditando} />
    </div>
  );
}

/** Editar nome, descrição e status do projeto (PATCH /projetos/:id — permissão `projetos.manage`). */
function EditarProjetoDialog({ projeto, open, onOpenChange }: { projeto: Projeto; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar projeto</DialogTitle>
          <DialogDescription>Nome, descrição e status. Projeto encerrado não conta no limite de projetos ativos do plano Free.</DialogDescription>
        </DialogHeader>
        {/* `key` recria o formulário com os dados atuais a cada abertura. */}
        {open && <FormProjeto key={`${projeto.id}-${projeto.nome}-${projeto.status}`} projeto={projeto} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function FormProjeto({ projeto, onClose }: { projeto: Projeto; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [nome, setNome] = useState(projeto.nome);
  const [descricao, setDescricao] = useState(projeto.descricao ?? "");
  const [status, setStatus] = useState<ProjetoStatus>(projeto.status);

  const mutation = useMutation({
    mutationFn: () => projetosApi.update(projeto.id, { nome: nome.trim(), descricao: descricao.trim() || null, status }),
    onSuccess: (atualizado) => {
      queryClient.setQueryData(["projetos", projeto.id], atualizado);
      queryClient.invalidateQueries({ queryKey: ["projetos"] });
      // Status muda o contador de projetos ativos (limite do Free) e a margem no Dashboard.
      queryClient.invalidateQueries({ queryKey: ["assinatura"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Projeto atualizado.");
      onClose();
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Não foi possível atualizar o projeto."),
  });

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (nome.trim().length < 2) return toast.error("O nome deve ter pelo menos 2 caracteres.");
        mutation.mutate();
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="projeto-nome">Nome</Label>
        <Input id="projeto-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="projeto-descricao">Descrição</Label>
        <Input id="projeto-descricao" placeholder="Opcional" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="projeto-status">Status</Label>
        <Select id="projeto-status" value={status} onChange={(e) => setStatus(e.target.value as ProjetoStatus)}>
          {STATUS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
