import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CreditCard, QrCode, TicketPercent } from "lucide-react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { assinaturaApi, type CupomPreview } from "@/api/assinatura";
import { tokenizeCard } from "@/lib/pagarme";
import { limparNomeCartao, mascararNumeroCartao, soDigitos, validarCartao } from "@/lib/cartao";
import { useAssinaturaSocket } from "@/lib/ws";
import { ApiError } from "@/lib/api";
import { formatDateOnly, formatDescontoCupom, formatDuracaoCupom, formatMoney } from "@/lib/format";
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
  const navigate = useNavigate();
  const { pagar } = useSearch({ from: "/_authenticated/assinatura" });
  const pagarAbertoRef = useRef(false);
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
  // PRO escolhido no cadastro e ainda sem nenhum pagamento — `plano` cru é "pro", mas
  // `planoEfetivo` é "free" até o 1º pagamento (ver docs/assinatura.md).
  const proPendente = data?.assinatura.plano === "pro" && data.assinatura.status === "sem_assinatura";

  // Vindo do cadastro com PRO (`?pagar=1`), já abre o modal de pagamento uma vez — o QA
  // não percebia que precisava clicar em "upgrade" pra pagar o plano escolhido.
  useEffect(() => {
    if (!pagar || !data || pagarAbertoRef.current) return;
    pagarAbertoRef.current = true;
    if (proPendente && !faturaPixPendente) {
      setMetodo(null);
      setDialogOpen(true);
    }
    navigate({ to: "/assinatura", search: {}, replace: true });
  }, [pagar, data, proPendente, faturaPixPendente, navigate]);

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

  // Cupom digitado no modal (prévia já validada pela API) e, para o cupom já em uso, se o
  // cliente quer usá-lo nesta cobrança PIX (só desconta se marcar — ver docs/assinatura.md).
  const [cupomCodigo, setCupomCodigo] = useState("");
  const [cupomAplicado, setCupomAplicado] = useState<CupomPreview | null>(null);
  const [usarCupom, setUsarCupom] = useState(false);

  function fecharDialog(open: boolean) {
    setDialogOpen(open);
    if (!open) {
      setMetodo(null);
      setCupomCodigo("");
      setCupomAplicado(null);
      setUsarCupom(false);
    }
  }

  const validarCupomMutation = useMutation({
    mutationFn: () => assinaturaApi.validarCupom(cupomCodigo.trim()),
    onSuccess: (preview) => setCupomAplicado(preview),
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Não foi possível validar o cupom."),
  });

  function abrirDialog(presetMetodo: "cartao" | null = null) {
    setMetodo(presetMetodo);
    setDialogOpen(true);
  }

  const checkoutCartaoMutation = useMutation({
    mutationFn: async () => {
      const cardToken = await tokenizeCard(cardForm);
      return assinaturaApi.checkoutCartao(cardToken, cupomAplicado?.codigo);
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
    mutationFn: () => assinaturaApi.gerarPix({ cupom: cupomAplicado?.codigo, usarCupom }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assinatura"] });
      fecharDialog(false);
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Não foi possível gerar o PIX."),
  });

  // Cancelar o PRO: para de cobrar já; o PRO vale até o fim do período pago e depois a
  // conta volta ao Free sozinha. PRO não pago/vencido volta ao Free na hora (ver docs/assinatura.md).
  const [confirmarCancelamento, setConfirmarCancelamento] = useState(false);
  const cancelarMutation = useMutation({
    mutationFn: () => assinaturaApi.cancelarPro(),
    onSuccess: (result) => {
      queryClient.setQueryData(["assinatura"], result);
      queryClient.invalidateQueries({ queryKey: ["assinatura"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      setConfirmarCancelamento(false);
      toast.success(
        result.planoEfetivo === "pro" && result.assinatura.proximaCobranca
          ? `Plano PRO cancelado. Ele continua valendo até ${formatDateOnly(result.assinatura.proximaCobranca)}.`
          : "Pronto, sua conta voltou para o plano Free.",
      );
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Não foi possível cancelar o plano PRO."),
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

  const { assinatura, faturas, planoEfetivo, bloqueada, limites, cupom } = data;
  // Free, sem_assinatura, atrasada ou cancelada — qualquer coisa que não seja PRO pago e em dia precisa de ação aqui.
  const precisaPagar = planoEfetivo !== "pro";
  // Plano cru "pro" mas não pago/em dia (sem_assinatura, atrasada, cancelada) — o card de
  // pagamento fala em ativar/regularizar o PRO em vez de "fazer upgrade".
  const escolheuPro = assinatura.plano === "pro";
  const emRiscoDeSuspensao = assinatura.tentativasFalhaCartao > 0 && !bloqueada && assinatura.status === "ativa";
  // Cancelado pelo cliente, mas ainda dentro do período pago: PRO até `proximaCobranca`.
  const proCancelado = planoEfetivo === "pro" && assinatura.status === "cancelada";
  const proAtivo = planoEfetivo === "pro" && assinatura.status === "ativa";

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
              Sua assinatura PRO venceu em <strong>{assinatura.proximaCobranca ? formatDateOnly(assinatura.proximaCobranca) : "—"}</strong> e não foi renovada — o
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
            <CardDescription>Plano {planoEfetivo === "pro" || proPendente ? "PRO" : "Free"}</CardDescription>
            <CardTitle className="mt-1 font-numeric text-3xl">
              {planoEfetivo === "pro" || proPendente ? `${formatMoney(assinatura.valorCentavos)}/mês` : "Grátis"}
            </CardTitle>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {proPendente ? (
              <Badge variant="warning">Pagamento pendente</Badge>
            ) : (
              <Badge variant={STATUS_VARIANT[assinatura.status]}>{STATUS_LABEL[assinatura.status]}</Badge>
            )}
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
            {proAtivo && assinatura.proximaCobranca && (
              <span className="text-xs text-muted-foreground">Próxima cobrança: {formatDateOnly(assinatura.proximaCobranca)}</span>
            )}
            {proCancelado && assinatura.proximaCobranca && (
              <span className="text-xs text-muted-foreground">PRO até {formatDateOnly(assinatura.proximaCobranca)}</span>
            )}
            {cupom && (
              <span className="flex items-center gap-1.5 text-xs text-positive">
                <TicketPercent className="size-3.5" />
                Cupom {cupom.codigo}: {formatDescontoCupom(cupom)} de desconto{" "}
                {cupom.usosRestantes === null ? "em todas as mensalidades" : `· ${cupom.usosRestantes} uso${cupom.usosRestantes > 1 ? "s" : ""} restante${cupom.usosRestantes > 1 ? "s" : ""}`}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {!escolheuPro && (
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
            {/* QR gerado no navegador a partir do próprio copia-e-cola (payload EMV do PIX) —
                não depende de imagem hospedada pelo Pagar.me. */}
            {faturaPixPendente.pixCopiaCola && (
              <div className="rounded-md bg-white p-3">
                <QRCodeSVG value={faturaPixPendente.pixCopiaCola} size={192} level="M" aria-label="QR code do PIX" />
              </div>
            )}
            <p className="text-xs text-muted-foreground">Escaneie o QR code no app do seu banco ou use o código copia-e-cola abaixo.</p>
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
      ) : precisaPagar && escolheuPro ? (
        // Free já tem seu próprio card com o botão de upgrade acima — este cobre
        // sem_assinatura (PRO escolhido no cadastro mas não pago) / atrasada / cancelada.
        <Card className={proPendente ? "border-primary/40 bg-primary/5" : undefined}>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-5">
            {proPendente ? (
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">Falta só o pagamento para ativar o plano PRO</p>
                <p className="text-sm text-muted-foreground">
                  Você escolheu o PRO no cadastro. Até o pagamento ser confirmado, sua conta funciona com os limites do plano Free (
                  {limites.usuarios.maximo} usuário · {limites.projetos.maximo} projeto).
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Escolha uma forma de pagamento para {bloqueada ? "regularizar" : "reativar"} o plano PRO.</p>
            )}
            <div className="flex flex-wrap gap-2">
              {/* Desistir do PRO não pago / vencido: volta ao Free na hora (e destrava o acesso). */}
              {(proPendente || bloqueada) && (
                <Button variant="ghost" onClick={() => setConfirmarCancelamento(true)}>
                  Continuar no plano Free
                </Button>
              )}
              <Button onClick={() => abrirDialog()}>{proPendente ? "Pagar e ativar o PRO" : bloqueada ? "Regularizar pagamento" : "Reativar o PRO"}</Button>
            </div>
          </CardContent>
        </Card>
      ) : proCancelado ? (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-5">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">Plano PRO cancelado</p>
              <p className="text-sm text-muted-foreground">
                Nada mais será cobrado. O PRO continua valendo até{" "}
                <strong>{assinatura.proximaCobranca ? formatDateOnly(assinatura.proximaCobranca) : "o fim do período pago"}</strong>; depois disso a
                conta volta para o plano Free ({limites.usuarios.atual} usuário{limites.usuarios.atual === 1 ? "" : "s"} e {limites.projetos.atual} projeto
                {limites.projetos.atual === 1 ? "" : "s"} ativo{limites.projetos.atual === 1 ? "" : "s"} hoje — o Free permite 1 de cada para criar novos).
              </p>
            </div>
            <Button onClick={() => abrirDialog()}>Reativar o PRO</Button>
          </CardContent>
        </Card>
      ) : (
        proAtivo && (
          <div className="flex flex-wrap gap-2">
            {assinatura.formaPagamento === "cartao" && (
              <Button variant="secondary" onClick={() => abrirDialog("cartao")}>
                Trocar cartão
              </Button>
            )}
            <Button variant="ghost" className="text-muted-foreground" onClick={() => setConfirmarCancelamento(true)}>
              Cancelar plano PRO
            </Button>
          </div>
        )
      )}

      <Dialog open={confirmarCancelamento} onOpenChange={setConfirmarCancelamento}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{proAtivo ? "Cancelar o plano PRO?" : "Voltar para o plano Free?"}</DialogTitle>
            <DialogDescription>
              {proAtivo
                ? `Nada mais será cobrado${assinatura.formaPagamento === "cartao" ? " no seu cartão" : ""}. Você continua com o PRO até ${
                    assinatura.proximaCobranca ? formatDateOnly(assinatura.proximaCobranca) : "o fim do período pago"
                  } e depois a conta volta para o plano Free.`
                : "A conta passa a usar o plano Free agora, sem nenhuma cobrança."}
            </DialogDescription>
          </DialogHeader>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>O Free permite 1 usuário e 1 projeto ativo. Nada é apagado: usuários e projetos que já existem continuam, mas não dá para criar novos além do limite.</li>
            <li>Você pode voltar para o PRO quando quiser, pela tela de Assinatura.</li>
          </ul>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmarCancelamento(false)}>
              {proAtivo ? "Manter o PRO" : "Voltar"}
            </Button>
            <Button variant="destructive" onClick={() => cancelarMutation.mutate()} disabled={cancelarMutation.isPending}>
              {cancelarMutation.isPending ? "Cancelando..." : proAtivo ? "Cancelar o PRO" : "Usar o plano Free"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={fecharDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{metodo === "cartao" ? (assinatura.cartaoFinal ? "Trocar cartão" : "Cadastrar cartão") : "Forma de pagamento"}</DialogTitle>
            {metodo === null && <DialogDescription>Como você quer pagar a mensalidade do plano PRO?</DialogDescription>}
          </DialogHeader>

          {cupom ? (
            <div className="flex flex-col gap-2 rounded-md border border-positive/30 bg-positive/10 p-3 text-sm">
              <p className="flex items-center gap-1.5 font-medium text-positive">
                <TicketPercent className="size-4" />
                Cupom {cupom.codigo} em uso: {formatDescontoCupom(cupom)} de desconto
              </p>
              {cupom.usosRestantes === null ? (
                <p className="text-xs text-muted-foreground">Desconto aplicado automaticamente em todas as mensalidades.</p>
              ) : metodo === "cartao" ? (
                <p className="text-xs text-muted-foreground">No cartão, o desconto entra sozinho {formatDuracaoCupom(cupom.usosRestantes)}.</p>
              ) : (
                <label className="flex items-start gap-2 text-xs">
                  <input type="checkbox" className="mt-0.5" checked={usarCupom} onChange={(e) => setUsarCupom(e.target.checked)} />
                  <span>
                    Você ainda pode utilizar este cupom {cupom.usosRestantes} {cupom.usosRestantes > 1 ? "vezes" : "vez"}. Deseja utilizar nessa
                    renovação? <span className="text-muted-foreground">(vale para o PIX; no cartão o desconto é automático)</span>
                  </span>
                </label>
              )}
            </div>
          ) : cupomAplicado ? (
            <div className="flex items-start justify-between gap-3 rounded-md border border-positive/30 bg-positive/10 p-3 text-sm">
              <div className="flex flex-col gap-0.5">
                <p className="flex items-center gap-1.5 font-medium text-positive">
                  <TicketPercent className="size-4" />
                  Cupom {cupomAplicado.codigo}: {formatDescontoCupom(cupomAplicado)} de desconto
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="line-through">{formatMoney(cupomAplicado.valorOriginalCentavos)}</span>{" "}
                  <strong className="text-foreground">{formatMoney(cupomAplicado.valorComDescontoCentavos)}</strong>{" "}
                  {formatDuracaoCupom(cupomAplicado.duracaoUsos, "primeiras")}
                  {cupomAplicado.duracaoUsos !== null && `; depois, ${formatMoney(cupomAplicado.valorOriginalCentavos)}`}.
                </p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setCupomAplicado(null)}>
                Remover
              </Button>
            </div>
          ) : (
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (cupomCodigo.trim()) validarCupomMutation.mutate();
              }}
            >
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="cupom-codigo">Cupom de desconto (opcional)</Label>
                <Input
                  id="cupom-codigo"
                  placeholder="EX.: BEMVINDO10"
                  value={cupomCodigo}
                  onChange={(e) => setCupomCodigo(e.target.value.toUpperCase().replace(/\s/g, ""))}
                />
              </div>
              <Button type="submit" variant="secondary" disabled={!cupomCodigo.trim() || validarCupomMutation.isPending}>
                {validarCupomMutation.isPending ? "Validando..." : "Aplicar"}
              </Button>
            </form>
          )}

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
                const erro = validarCartao(cardForm);
                if (erro) return toast.error(erro);
                checkoutCartaoMutation.mutate();
              }}
              className="flex flex-col gap-3"
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cartao-numero">Número do cartão</Label>
                <Input
                  required
                  inputMode="numeric"
                  id="cartao-numero"
                  autoComplete="cc-number"
                  placeholder="0000 0000 0000 0000"
                  value={cardForm.number}
                  onChange={(e) => setCardForm((f) => ({ ...f, number: mascararNumeroCartao(e.target.value) }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cartao-nome">Nome impresso no cartão</Label>
                <Input
                  required
                  id="cartao-nome"
                  autoComplete="cc-name"
                  placeholder="COMO ESTÁ NO CARTÃO"
                  value={cardForm.holderName}
                  onChange={(e) => setCardForm((f) => ({ ...f, holderName: limparNomeCartao(e.target.value) }))}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cartao-mes">Mês</Label>
                  <Input
                    required
                    inputMode="numeric"
                    id="cartao-mes"
                  autoComplete="cc-exp-month"
                    placeholder="MM"
                    value={cardForm.expMonth}
                    onChange={(e) => setCardForm((f) => ({ ...f, expMonth: soDigitos(e.target.value, 2) }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cartao-ano">Ano</Label>
                  <Input
                    required
                    inputMode="numeric"
                    id="cartao-ano"
                  autoComplete="cc-exp-year"
                    placeholder="AA"
                    value={cardForm.expYear}
                    onChange={(e) => setCardForm((f) => ({ ...f, expYear: soDigitos(e.target.value, 2) }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cartao-cvv">CVV</Label>
                  <Input
                    required
                    inputMode="numeric"
                    id="cartao-cvv"
                  autoComplete="cc-csc"
                    placeholder="000"
                    value={cardForm.cvv}
                    onChange={(e) => setCardForm((f) => ({ ...f, cvv: soDigitos(e.target.value, 4) }))}
                  />
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
                <TableHead className="text-right">Desconto</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {faturas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
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
                  <TableCell className="text-right font-numeric text-positive">
                    {fatura.descontoCentavos > 0 ? `− ${formatMoney(fatura.descontoCentavos)}` : "—"}
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
