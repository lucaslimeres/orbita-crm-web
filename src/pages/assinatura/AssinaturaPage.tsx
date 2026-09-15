import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { assinaturaApi } from "@/api/assinatura";
import { tokenizeCard } from "@/lib/pagarme";
import { ApiError } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

export function AssinaturaPage() {
  const queryClient = useQueryClient();
  const [metodo, setMetodo] = useState<"cartao" | "pix" | null>(null);
  const [cardForm, setCardForm] = useState({ number: "", holderName: "", expMonth: "", expYear: "", cvv: "" });

  const { data, isLoading } = useQuery({ queryKey: ["assinatura"], queryFn: () => assinaturaApi.status() });

  const checkoutCartaoMutation = useMutation({
    mutationFn: async () => {
      const cardToken = await tokenizeCard(cardForm);
      return assinaturaApi.checkoutCartao(cardToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assinatura"] });
      setMetodo(null);
      toast.success("Cartão cadastrado! A cobrança recorrente já foi ativada.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível cadastrar o cartão."),
  });

  const gerarPixMutation = useMutation({
    mutationFn: () => assinaturaApi.gerarPix(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assinatura"] }),
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Não foi possível gerar o PIX."),
  });

  const verificarMutation = useMutation({
    mutationFn: (faturaId: number) => assinaturaApi.verificarFatura(faturaId),
    onSuccess: (fatura) => {
      queryClient.invalidateQueries({ queryKey: ["assinatura"] });
      if (fatura.status === "paga") toast.success("Pagamento confirmado!");
      else toast.info("Ainda não identificamos o pagamento. Tente novamente em alguns instantes.");
    },
  });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  const { assinatura, faturas } = data;
  const faturaPixPendente = faturas.find((f) => f.formaPagamento === "pix" && f.status === "pendente");

  function copiarCodigoPix(codigo: string) {
    navigator.clipboard.writeText(codigo);
    toast.success("Código copiado.");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Assinatura</h1>
        <p className="text-sm text-muted-foreground">Plano e forma de pagamento da mensalidade do Órbita.</p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-5">
          <div>
            <CardDescription>Plano único</CardDescription>
            <CardTitle className="mt-1 font-numeric text-3xl">{formatMoney(assinatura.valorCentavos)}/mês</CardTitle>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Badge variant={STATUS_VARIANT[assinatura.status]}>{STATUS_LABEL[assinatura.status]}</Badge>
            {assinatura.formaPagamento === "cartao" && assinatura.cartaoFinal && (
              <span className="text-sm text-muted-foreground">
                {assinatura.cartaoBandeira} •••• {assinatura.cartaoFinal}
              </span>
            )}
            {assinatura.proximaCobranca && <span className="text-xs text-muted-foreground">Próxima cobrança: {formatDate(assinatura.proximaCobranca)}</span>}
          </div>
        </CardContent>
      </Card>

      {faturaPixPendente ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 pt-5 text-center">
            <CardDescription>PIX gerado — pague para ativar a assinatura</CardDescription>
            <div className="max-w-full break-all rounded-md border border-border bg-background px-4 py-3 font-numeric text-xs">{faturaPixPendente.pixCopiaCola}</div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => copiarCodigoPix(faturaPixPendente.pixCopiaCola ?? "")}>
                Copiar código
              </Button>
              <Button onClick={() => verificarMutation.mutate(faturaPixPendente.id)} disabled={verificarMutation.isPending}>
                Já paguei, verificar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card className={metodo === "cartao" ? "ring-1 ring-primary" : undefined}>
            <CardContent className="flex flex-col gap-3 pt-5">
              <CardDescription>Pagar com cartão</CardDescription>
              <p className="text-sm text-muted-foreground">Cobrança automática todo mês — sem precisar gerar nada de novo.</p>
              {metodo !== "cartao" ? (
                <Button variant="secondary" onClick={() => setMetodo("cartao")}>
                  Cadastrar cartão
                </Button>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    checkoutCartaoMutation.mutate();
                  }}
                  className="flex flex-col gap-3"
                >
                  <div className="flex flex-col gap-1.5">
                    <Label>Número do cartão</Label>
                    <Input required inputMode="numeric" placeholder="0000 0000 0000 0000" value={cardForm.number} onChange={(e) => setCardForm((f) => ({ ...f, number: e.target.value }))} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Nome impresso no cartão</Label>
                    <Input required value={cardForm.holderName} onChange={(e) => setCardForm((f) => ({ ...f, holderName: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col gap-1.5">
                      <Label>Mês</Label>
                      <Input required placeholder="MM" maxLength={2} value={cardForm.expMonth} onChange={(e) => setCardForm((f) => ({ ...f, expMonth: e.target.value }))} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>Ano</Label>
                      <Input required placeholder="AA" maxLength={2} value={cardForm.expYear} onChange={(e) => setCardForm((f) => ({ ...f, expYear: e.target.value }))} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>CVV</Label>
                      <Input required maxLength={4} value={cardForm.cvv} onChange={(e) => setCardForm((f) => ({ ...f, cvv: e.target.value }))} />
                    </div>
                  </div>
                  <Button type="submit" disabled={checkoutCartaoMutation.isPending}>
                    {checkoutCartaoMutation.isPending ? "Processando..." : "Confirmar cartão"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-3 pt-5">
              <CardDescription>Pagar com PIX</CardDescription>
              <p className="text-sm text-muted-foreground">Gera um QR/código válido por 1 hora. Renovação é manual todo mês.</p>
              <Button variant="secondary" onClick={() => gerarPixMutation.mutate()} disabled={gerarPixMutation.isPending}>
                Gerar PIX
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

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
