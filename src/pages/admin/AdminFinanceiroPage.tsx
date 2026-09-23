import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { adminPanelApi } from "@/api/admin";
import { formatDate, formatMoney } from "@/lib/format";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PAGE_SIZE = 50;

export function AdminFinanceiroPage() {
  const [status, setStatus] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "financeiro", status, formaPagamento, page],
    queryFn: () => adminPanelApi.listFaturas({ status: status || undefined, formaPagamento: formaPagamento || undefined, page, pageSize: PAGE_SIZE }),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const totalPago = items.filter((i) => i.status === "paga").reduce((sum, i) => sum + i.valorCentavos, 0);
  const totalCartao = items.filter((i) => i.status === "paga" && i.formaPagamento === "cartao").length;
  const totalPix = items.filter((i) => i.status === "paga" && i.formaPagamento === "pix").length;

  function atualizarFiltro(setter: (v: string) => void, valor: string) {
    setter(valor);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Financeiro</h1>
        <p className="text-sm text-muted-foreground">Todas as faturas da mensalidade do Órbita, de todas as contas.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <CardDescription>Total nesta página</CardDescription>
            <CardTitle className="mt-1 font-numeric text-2xl">{formatMoney(totalPago)}</CardTitle>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <CardDescription>Pagas via Cartão (nesta página)</CardDescription>
            <CardTitle className="mt-1 font-numeric text-2xl">{totalCartao}</CardTitle>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <CardDescription>Pagas via PIX (nesta página)</CardDescription>
            <CardTitle className="mt-1 font-numeric text-2xl">{totalPix}</CardTitle>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={status} onChange={(e) => atualizarFiltro(setStatus, e.target.value)} className="w-auto">
          <option value="">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="paga">Paga</option>
          <option value="falhou">Falhou</option>
          <option value="expirada">Expirada</option>
        </Select>
        <Select value={formaPagamento} onChange={(e) => atualizarFiltro(setFormaPagamento, e.target.value)} className="w-auto">
          <option value="">Cartão e PIX</option>
          <option value="cartao">Cartão</option>
          <option value="pix">PIX</option>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Competência</TableHead>
              <TableHead>Forma</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Pago em</TableHead>
              <TableHead className="text-right">Valor</TableHead>
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
            {!isLoading && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Nenhuma fatura encontrada.
                </TableCell>
              </TableRow>
            )}
            {items.map((fatura) => (
              <TableRow key={fatura.id}>
                <TableCell>
                  <Link to="/admin/contas/$empresaId" params={{ empresaId: fatura.empresaId }} className="hover:underline">
                    {fatura.empresaNome}
                  </Link>
                </TableCell>
                <TableCell className="font-numeric">{fatura.competencia}</TableCell>
                <TableCell>{fatura.formaPagamento === "cartao" ? "Cartão" : "PIX"}</TableCell>
                <TableCell>
                  <Badge variant={fatura.status === "paga" ? "positive" : fatura.status === "falhou" ? "negative" : "warning"}>{fatura.status}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{fatura.pagoEm ? formatDate(fatura.pagoEm) : "—"}</TableCell>
                <TableCell className="text-right font-numeric">{formatMoney(fatura.valorCentavos)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Página {page} de {totalPaginas} · {total} faturas
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </Button>
            <Button variant="secondary" size="sm" disabled={page >= totalPaginas} onClick={() => setPage((p) => p + 1)}>
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
