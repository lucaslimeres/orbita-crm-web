import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CreditCard, QrCode } from "lucide-react";
import { toast } from "sonner";
import { assinaturaApi } from "@/api/assinatura";
import { tokenizeCard } from "@/lib/pagarme";
import { useAssinaturaSocket } from "@/lib/ws";
import { ApiError } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { useAuthStore } from "@/stores/useAuthStore";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

const MAX_TENTATIVAS_FALHA_CARTAO = 3;

export function AssinaturaPage() {
  const queryClient = useQueryClient();
  const setAssinatura = useAuthStore((s) => s.setAssinatura);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [metodo, setMetodo] = useState<"cartao" | "pix" | null>(null);
  const [cardForm, setCardForm] = useState({ number: "", holderName: "", expMonth: "", expYear: "", cvv: "" });

  const { data, isLoading } = useQuery({ queryKey: ["assinatura"], queryFn: () => assinaturaApi.status() });

  // Mantém a sessão em sincronia — é o que o AppLayout/VerifyEmailCodePage usam pra
  // decidir redirecionamento sem precisar buscar de novo.
  useEffect(() => {
    if (data) setAssinatura({ plano: data.planoEfetivo, status: data.assinatura.status, bloqueada: data.bloqueada });
  }, [data, setAssinatura]);

  const faturaPixPendente = data?.faturas.find((f) => f.formaPagamento === "pix" && f.status === "pendente");

  // Sem polling: o webhook do Pagar.me confirma o PIX e empurra pra cá via socket — o
  // botão "já paguei, verificar" continua existindo como fallback. Ver lib/ws.ts.
  useAssinaturaSocket(
    (faturaId) => {
      if (faturaPixPendente?.id !== faturaId) return;
      queryClient.invalidateQueries({ queryKey: ["assinatura"] });
      toast.success("Pagamento confirmado!");
    },
    !!faturaPixPendente,
  );

  function fecharDialog(open: boolean) {
    setDialogOpen(open);
    if (!open) setMetodo(null);
  }

  function abrirDialog(presetMetodo: "cartao" | null = null) {
    setMetodo(presetMetodo);
    setDialogOpen(true);
  }

  const checkoutCartaoMutation = useMutation({
    mutationFn: async () => {
      const cardToken = await tokenizeCard(cardForm);
      return assinaturaApi.checkoutCartao(cardToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assinatura"] });
      fecharDialog(false);
      setCardForm({ number: "", holderName: "", expMonth: "", expYear: "", cvv: "" });
      toast.success("Cartão cadastrado! A cobrança recorrente já foi ativada.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível cadastrar o cartão."),
  });

  const gerarPixMutation = useMutation({
    mutationFn: () => assinaturaApi.gerarPix(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assinatura"] });
      fecharDialog(false);
    },
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

  const { assinatura, faturas, planoEfetivo, bloqueada, limites } = data;
  // Free, sem_assinatura, atrasada ou cancelada — qualquer coisa que não seja PRO pago e em dia precisa de ação aqui.
  const precisaPagar = planoEfetivo !== "pro";
  const emRiscoDeSuspensao = assinatura.tentativasFalhaCartao > 0 && !bloqueada;

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

      {bloqueada && (
        <Card className="border-negative/30 bg-negative/10">
          <CardContent className="flex items-start gap-3 pt-5 text-negative">
            <AlertTriangle className="size-5 shrink-0" />
            <p className="text-sm">
              Sua assinatura PRO venceu em <strong>{assinatura.proximaCobranca ? formatDate(assinatura.proximaCobranca) : "—"}</strong> e não foi renovada — o
              restante do sistema fica bloqueado até o pagamento ser confirmado.
            </p>
          </CardContent>
        </Card>
      )}

      {emRiscoDeSuspensao && (
        <Card className="border-warning/30 bg-warning/10">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5 text-warning">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-5 shrink-0" />
              <p className="text-sm">
                Não conseguimos cobrar seu cartão (tentativa {assinatura.tentativasFalhaCartao} de {MAX_TENTATIVAS_FALHA_CARTAO}). Atualize os dados do
                cartão para evitar a suspensão do acesso.
              </p>
            </div>
            <Button size="sm" onClick={() => abrirDialog("cartao")}>
              Trocar cartão
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-5">
          <div>
            <CardDescription>Plano {planoEfetivo === "pro" ? "PRO" : "Free"}</CardDescription>
            <CardTitle className="mt-1 font-numeric text-3xl">
              {planoEfetivo === "pro" ? `${formatMoney(assinatura.valorCentavos)}/mês` : "Grátis"}
            </CardTitle>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Badge variant={STATUS_VARIANT[assinatura.status]}>{STATUS_LABEL[assinatura.status]}</Badge>
            {assinatura.formaPagamento && (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                {assinatura.formaPagamento === "cartao" ? (
                  <>
                    <CreditCard className="size-3.5" />
                    {assinatura.cartaoFinal ? `${assinatura.cartaoBandeira ?? ""} •••• ${assinatura.cartaoFinal}` : "Cartão"}
                  </>
                ) : (
                  <>
                    <QrCode className="size-3.5" />
                    PIX
                  </>
                )}
              </span>
            )}
            {planoEfetivo === "pro" && assinatura.proximaCobranca && (
              <span className="text-xs text-muted-foreground">Próxima cobrança: {formatDate(assinatura.proximaCobranca)}</span>
            )}
          </div>
        </CardContent>
      </Card>

      {planoEfetivo === "free" && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-5">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">Limites do plano Free</p>
              <p className="text-sm text-muted-foreground">
                {limites.usuarios.atual}/{limites.usuarios.maximo} usuário{(limites.usuarios.maximo ?? 0) > 1 ? "s" : ""} ·{" "}
                {limites.projetos.atual}/{limites.projetos.maximo} projeto{(limites.projetos.maximo ?? 0) > 1 ? "s" : ""}
              </p>
            </div>
            <Button onClick={() => abrirDialog()}>Fazer upgrade para o PRO</Button>
          </CardContent>
        </Card>
      )}

      {faturaPixPendente ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 pt-5 text-center">
            <CardDescription>PIX gerado — pague para ativar a assinatura</CardDescription>
            <div className="max-w-full break-all rounded-md border border-border bg-background px-4 py-3 font-numeric text-xs">{faturaPixPendente.pixCopiaCola}</div>
            <p className="text-xs text-muted-foreground">Assim que o pagamento cair, esta tela atualiza sozinha.</p>
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
      ) : precisaPagar && planoEfetivo !== "free" ? (
        // Free já tem seu próprio card com o botão de upgrade acima — este cobre
        // sem_assinatura (PRO escolhido no cadastro mas não pago) / atrasada / cancelada.
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-5">
            <p className="text-sm text-muted-foreground">Escolha uma forma de pagamento para {bloqueada ? "reativar" : "ativar"} o plano PRO.</p>
            <Button onClick={() => abrirDialog()}>{bloqueada ? "Regularizar pagamento" : "Escolher forma de pagamento"}</Button>
          </CardContent>
        </Card>
      ) : (
        !precisaPagar &&
        assinatura.formaPagamento === "cartao" && (
          <div>
            <Button variant="secondary" onClick={() => abrirDialog("cartao")}>
              Trocar cartão
            </Button>
          </div>
        )
      )}

      <Dialog open={dialogOpen} onOpenChange={fecharDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{metodo === "cartao" ? (assinatura.cartaoFinal ? "Trocar cartão" : "Cadastrar cartão") : "Forma de pagamento"}</DialogTitle>
            {metodo === null && <DialogDescription>Como você quer pagar a mensalidade do plano PRO?</DialogDescription>}
          </DialogHeader>

          {metodo === null && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setMetodo("cartao")}
                className="flex flex-col items-start gap-2 rounded-md border border-border p-4 text-left transition-colors hover:border-primary"
              >
                <CreditCard className="size-5 text-primary" />
                <span className="text-sm font-medium">Cartão de crédito</span>
                <span className="text-xs text-muted-foreground">Cobrança automática todo mês.</span>
              </button>
              <button
                type="button"
                onClick={() => gerarPixMutation.mutate()}
                disabled={gerarPixMutation.isPending}
                className="flex flex-col items-start gap-2 rounded-md border border-border p-4 text-left transition-colors hover:border-primary disabled:opacity-50"
              >
                <QrCode className="size-5 text-primary" />
                <span className="text-sm font-medium">PIX</span>
                <span className="text-xs text-muted-foreground">QR/código válido por 1 hora. Renovação manual todo mês.</span>
              </button>
            </div>
          )}

          {metodo === "cartao" && (
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
        </DialogContent>
      </Dialog>

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
