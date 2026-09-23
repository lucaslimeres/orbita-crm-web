import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { adminPanelApi } from "@/api/admin";
import { formatDate } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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

export function AdminContasPage() {
  const [busca, setBusca] = useState("");
  const { data: empresas = [], isLoading } = useQuery({
    queryKey: ["admin", "empresas", busca],
    queryFn: () => adminPanelApi.listEmpresas(busca || undefined),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Contas</h1>
          <p className="text-sm text-muted-foreground">Todas as empresas cadastradas no Órbita.</p>
        </div>
        <Input placeholder="Buscar por nome, e-mail ou CNPJ..." value={busca} onChange={(e) => setBusca(e.target.value)} className="max-w-xs" />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Usuários</TableHead>
              <TableHead className="text-right">Projetos</TableHead>
              <TableHead>Criada em</TableHead>
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
            {!isLoading && empresas.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Nenhuma empresa encontrada.
                </TableCell>
              </TableRow>
            )}
            {empresas.map((empresa) => (
              <TableRow key={empresa.id} className="cursor-pointer">
                <TableCell>
                  <Link to="/admin/contas/$empresaId" params={{ empresaId: empresa.id }} className="font-medium hover:underline">
                    {empresa.nomeFantasia}
                  </Link>
                  <p className="text-xs text-muted-foreground">{empresa.razaoSocial}</p>
                </TableCell>
                <TableCell className="text-muted-foreground">{empresa.email}</TableCell>
                <TableCell>
                  <Badge variant={empresa.plano === "pro" ? "positive" : "outline"}>{empresa.plano === "pro" ? "PRO" : "Free"}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[empresa.status]}>{STATUS_LABEL[empresa.status] ?? empresa.status}</Badge>
                </TableCell>
                <TableCell className="text-right font-numeric">{empresa.totalUsuarios}</TableCell>
                <TableCell className="text-right font-numeric">{empresa.totalProjetos}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(empresa.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
