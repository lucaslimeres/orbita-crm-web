import { useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminPanelApi, type AdminProjeto } from "@/api/admin";
import { AdminApiError } from "@/lib/adminApi";
import { formatDate, formatMoney } from "@/lib/format";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const STATUS_LABEL: Record<string, string> = {
  sem_assinatura: "Sem assinatura",
  ativa: "Ativa",
  atrasada: "Atrasada",
  cancelada: "Cancelada",
};

const STATUS_VARIANT: Record<string, "positive" | "warning" | "negative" | "outline"> = {
  sem_assinatura: "outline",
  ativa: "positive",
  atrasada: "warning",
  cancelada: "negative",
};

const PROJETO_STATUS_LABEL: Record<AdminProjeto["status"], string> = {
  em_desenvolvimento: "Em desenvolvimento",
  em_producao: "Em produção",
  pausado: "Pausado",
  encerrado: "Encerrado",
};

export function AdminContaDetailPage() {
  const { empresaId } = useParams({ from: "/admin/_authenticated/contas/$empresaId" });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "empresas", empresaId],
    queryFn: () => adminPanelApi.getEmpresa(empresaId),
  });

  const toggleUsuarioMutation = useMutation({
    mutationFn: ({ usuarioId, ativo }: { usuarioId: string; ativo: boolean }) => adminPanelApi.toggleUsuarioAtivo(empresaId, usuarioId, ativo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "empresas", empresaId] });
      toast.success("Usuário atualizado.");
    },
    onError: (error) => toast.error(error instanceof AdminApiError ? error.message : "Não foi possível atualizar o usuário."),
  });

  const updateProjetoMutation = useMutation({
    mutationFn: ({ projetoId, status }: { projetoId: number; status: AdminProjeto["status"] }) => adminPanelApi.updateProjetoStatus(empresaId, projetoId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "empresas", empresaId] });
      toast.success("Projeto atualizado.");
    },
    onError: (error) => toast.error(error instanceof AdminApiError ? error.message : "Não foi possível atualizar o projeto."),
  });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  const { empresa, assinatura, faturas, usuarios, projetos } = data;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">{empresa.nomeFantasia}</h1>
        <p className="text-sm text-muted-foreground">
          {empresa.razaoSocial} {empresa.cnpj && `· ${empresa.cnpj}`} · {empresa.email}
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-5">
          <div>
            <CardDescription>Plano {assinatura?.plano === "pro" ? "PRO" : "Free"}</CardDescription>
            <CardTitle className="mt-1 font-numeric text-2xl">{assinatura && assinatura.plano === "pro" ? `${formatMoney(assinatura.valorCentavos)}/mês` : "Grátis"}</CardTitle>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Badge variant={STATUS_VARIANT[assinatura?.status ?? "sem_assinatura"]}>{STATUS_LABEL[assinatura?.status ?? "sem_assinatura"]}</Badge>
            {assinatura?.formaPagamento === "cartao" && assinatura.cartaoFinal && (
              <span className="text-sm text-muted-foreground">
                {assinatura.cartaoBandeira} •••• {assinatura.cartaoFinal}
              </span>
            )}
            {assinatura?.proximaCobranca && <span className="text-xs text-muted-foreground">Próxima cobrança: {formatDate(assinatura.proximaCobranca)}</span>}
          </div>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium tracking-[0.02em] text-muted-foreground uppercase">Usuários ({usuarios.length})</h2>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map((usuario) => (
                <TableRow key={usuario.id}>
                  <TableCell>{usuario.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{usuario.email}</TableCell>
                  <TableCell>
                    <Badge variant={usuario.ativo ? "positive" : "outline"}>{usuario.ativo ? "Ativo" : "Inativo"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      type="button"
                      className="text-sm text-primary hover:underline disabled:opacity-50"
                      disabled={toggleUsuarioMutation.isPending}
                      onClick={() => toggleUsuarioMutation.mutate({ usuarioId: usuario.id, ativo: !usuario.ativo })}
                    >
                      {usuario.ativo ? "Desativar" : "Ativar"}
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium tracking-[0.02em] text-muted-foreground uppercase">Projetos ({projetos.length})</h2>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projetos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Nenhum projeto cadastrado.
                  </TableCell>
                </TableRow>
              )}
              {projetos.map((projeto) => (
                <TableRow key={projeto.id}>
                  <TableCell>{projeto.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(projeto.dataInicio)}</TableCell>
                  <TableCell>
                    <Select
                      value={projeto.status}
                      disabled={updateProjetoMutation.isPending}
                      onChange={(e) => updateProjetoMutation.mutate({ projetoId: projeto.id, status: e.target.value as AdminProjeto["status"] })}
                      className="w-auto"
                    >
                      {Object.entries(PROJETO_STATUS_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium tracking-[0.02em] text-muted-foreground uppercase">Faturas</h2>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Competência</TableHead>
                <TableHead>Forma</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {faturas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhuma fatura ainda.
                  </TableCell>
                </TableRow>
              )}
              {faturas.map((fatura) => (
                <TableRow key={fatura.id}>
                  <TableCell className="font-numeric">{fatura.competencia}</TableCell>
                  <TableCell>{fatura.formaPagamento === "cartao" ? "Cartão" : "PIX"}</TableCell>
                  <TableCell>
                    <Badge variant={fatura.status === "paga" ? "positive" : fatura.status === "falhou" ? "negative" : "warning"}>{fatura.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-numeric">{formatMoney(fatura.valorCentavos)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </section>
    </div>
  );
}
