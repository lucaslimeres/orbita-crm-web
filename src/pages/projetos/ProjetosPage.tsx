import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { projetosApi, type CreateProjetoRequest, type ProjetoTipo } from "@/api/projetos";
import { usuariosApi } from "@/api/usuarios";
import { assinaturaApi } from "@/api/assinatura";
import { ApiError } from "@/lib/api";
import { useAuthStore } from "@/stores/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";

const TIPOS: { value: ProjetoTipo; label: string }[] = [
  { value: "landing_page", label: "Landing Page" },
  { value: "site", label: "Site" },
  { value: "aplicativo", label: "Aplicativo" },
  { value: "api", label: "API" },
  { value: "banco_de_dados", label: "Banco de Dados" },
  { value: "sistema", label: "Sistema" },
  { value: "outro", label: "Outro" },
];

const STATUS_LABEL: Record<string, string> = {
  em_desenvolvimento: "Em desenvolvimento",
  em_producao: "Em produção",
  pausado: "Pausado",
  encerrado: "Encerrado",
};

export function ProjetosPage() {
  const queryClient = useQueryClient();
  const usuario = useAuthStore((s) => s.usuario);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<CreateProjetoRequest, "tipos" | "responsavelUsuarioId"> & { tipos: ProjetoTipo[]; responsavelUsuarioId: string }>({
    nome: "",
    descricao: "",
    cnpj: "",
    dataInicio: new Date().toISOString().slice(0, 10),
    tipos: [],
    responsavelUsuarioId: usuario?.id ?? "",
  });

  const { data: projetos = [], isLoading } = useQuery({ queryKey: ["projetos"], queryFn: () => projetosApi.list() });
  const { data: usuarios = [] } = useQuery({ queryKey: ["usuarios"], queryFn: () => usuariosApi.list() });
  const { data: assinaturaData } = useQuery({ queryKey: ["assinatura"], queryFn: () => assinaturaApi.status() });

  const limiteProjetos = assinaturaData?.limites.projetos;
  const limiteAtingido = limiteProjetos?.maximo != null && limiteProjetos.atual >= limiteProjetos.maximo;

  const createMutation = useMutation({
    mutationFn: (data: CreateProjetoRequest) => projetosApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projetos"] });
      setShowForm(false);
      toast.success("Projeto criado.");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Não foi possível criar o projeto."),
  });

  function toggleTipo(tipo: ProjetoTipo) {
    setForm((f) => ({ ...f, tipos: f.tipos.includes(tipo) ? f.tipos.filter((t) => t !== tipo) : [...f.tipos, tipo] }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.tipos.length === 0) return toast.error("Selecione ao menos um tipo de entrega.");
    if (!form.responsavelUsuarioId) return toast.error("Selecione um responsável.");
    createMutation.mutate({ ...form, cnpj: form.cnpj || null });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Projetos</h1>
          <p className="text-sm text-muted-foreground">Todos os produtos e projetos da empresa.</p>
        </div>
        <div className="flex items-center gap-2">
          {limiteProjetos?.maximo != null && (
            <Badge variant={limiteAtingido ? "warning" : "outline"}>
              Plano Free · {limiteProjetos.atual}/{limiteProjetos.maximo} projeto{limiteProjetos.maximo > 1 ? "s" : ""}
            </Badge>
          )}
          {limiteAtingido ? (
            <Button asChild>
              <Link to="/assinatura">Fazer upgrade para o PRO</Link>
            </Button>
          ) : (
            <Button onClick={() => setShowForm((v) => !v)}>
              <Plus className="size-4" /> Novo projeto
            </Button>
          )}
        </div>
      </div>

      {showForm && !limiteAtingido && (
        <Card>
          <CardContent className="pt-5">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Nome</Label>
                  <Input required value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Responsável</Label>
                  <Select value={form.responsavelUsuarioId} onChange={(e) => setForm((f) => ({ ...f, responsavelUsuarioId: e.target.value }))}>
                    <option value="">Selecione</option>
                    {usuarios.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nome}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>CNPJ (opcional — projeto autoral não precisa)</Label>
                  <Input value={form.cnpj ?? ""} onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Data de início</Label>
                  <Input type="date" value={form.dataInicio} onChange={(e) => setForm((f) => ({ ...f, dataInicio: e.target.value }))} />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Descrição</Label>
                <Input value={form.descricao ?? ""} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Tipos de entrega</Label>
                <div className="flex flex-wrap gap-2">
                  {TIPOS.map((t) => (
                    <button
                      type="button"
                      key={t.value}
                      onClick={() => toggleTipo(t.value)}
                      className={
                        form.tipos.includes(t.value)
                          ? "rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground"
                          : "rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground"
                      }
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Button type="submit" disabled={createMutation.isPending}>
                  Criar projeto
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {!isLoading && projetos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum projeto cadastrado ainda.</p>}
        {projetos.map((projeto) => (
          <Link key={projeto.id} to="/projetos/$projetoId" params={{ projetoId: String(projeto.id) }}>
            <Card className="h-full transition-colors hover:border-primary">
              <CardContent className="flex flex-col gap-3 pt-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{projeto.nome}</h3>
                  <Badge variant="outline">{STATUS_LABEL[projeto.status]}</Badge>
                </div>
                {projeto.descricao && <p className="line-clamp-2 text-sm text-muted-foreground">{projeto.descricao}</p>}
                <div className="flex flex-wrap gap-1.5">
                  {projeto.tipos.map((tipo) => (
                    <Badge key={tipo} variant="default">
                      {TIPOS.find((t) => t.value === tipo)?.label}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
