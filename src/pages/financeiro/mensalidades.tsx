import { useState } from "react";
import { CalendarPlus, ChevronDown, ChevronRight, CircleStop, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { ResumoSerie } from "@/api/financeiro";
import { formatDateOnly, formatMoney, hojeIso, reaisParaCentavos } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/*
 * Mensalidades de gastos/receitas recorrentes (ver docs/financeiro.md). O lançamento
 * recorrente é a 1ª mensalidade; cada mês seguinte é um lançamento próprio, adicionado
 * aqui com o valor e a data já sugeridos pela API (último valor, mês seguinte ao último).
 */

/** Linha-resumo do recorrente: "3 mensalidades · última 10/11/2026 · R$ 600,00", com o botão de expandir. */
export function ResumoRecorrente({
  serie,
  dataFim,
  aberto,
  onAlternar,
  semUltima = false,
}: {
  serie: ResumoSerie;
  dataFim: string | null;
  aberto: boolean;
  onAlternar: () => void;
  /** A linha já mostra a última mensalidade (data/valor) — o resumo fica só com a contagem. */
  semUltima?: boolean;
}) {
  return (
    <button type="button" onClick={onAlternar} className="mt-0.5 flex items-start gap-1 text-left text-xs text-muted-foreground hover:text-foreground">
      {aberto ? <ChevronDown className="mt-px size-3.5 shrink-0" /> : <ChevronRight className="mt-px size-3.5 shrink-0" />}
      <span>
        {serie.quantidade} mensalidade{serie.quantidade === 1 ? "" : "s"}
        {!semUltima && ` · última ${formatDateOnly(serie.ultima.data)} (${formatMoney(serie.ultima.valorCentavos)})`}
        {dataFim && <span className="text-warning"> · encerrada em {formatDateOnly(dataFim)}</span>}
      </span>
    </button>
  );
}

/** Botões do recorrente: adicionar mensalidade e encerrar/reabrir a recorrência. */
export function AcoesRecorrente({
  serie,
  dataFim,
  onAdicionar,
  onEncerrar,
}: {
  serie: ResumoSerie;
  dataFim: string | null;
  onAdicionar: () => void;
  onEncerrar: () => void;
}) {
  return (
    <>
      {serie.sugestao && (
        <Button variant="secondary" size="icon" onClick={onAdicionar} title="Adicionar mensalidade" aria-label="Adicionar mensalidade">
          <CalendarPlus className="size-4" />
        </Button>
      )}
      <Button variant="ghost" size="icon" title={dataFim ? "Reabrir ou mudar o encerramento" : "Encerrar recorrência"} onClick={onEncerrar}>
        {dataFim ? <RotateCcw className="size-4" /> : <CircleStop className="size-4" />}
      </Button>
    </>
  );
}

/** "Adicionar mensalidade": valor e data já preenchidos com a sugestão, editáveis. */
export function NovaMensalidadeDialog({
  serie,
  titulo,
  onClose,
  onSalvar,
  salvando,
  rotuloPago,
}: {
  serie: ResumoSerie | null;
  titulo: string;
  onClose: () => void;
  onSalvar: (dados: { valorCentavos: number; data: string }) => void;
  salvando: boolean;
  /** "pago" (gasto) ou "recebido" (receita). */
  rotuloPago: string;
}) {
  return (
    <Dialog open={!!serie} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar mensalidade</DialogTitle>
          <DialogDescription>{titulo}</DialogDescription>
        </DialogHeader>
        {serie?.sugestao && (
          <FormMensalidade
            key={serie.sugestao.data}
            sugestao={serie.sugestao}
            onClose={onClose}
            onSalvar={onSalvar}
            salvando={salvando}
            rotuloPago={rotuloPago}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function FormMensalidade({
  sugestao,
  onClose,
  onSalvar,
  salvando,
  rotuloPago,
}: {
  sugestao: { data: string; valorCentavos: number };
  onClose: () => void;
  onSalvar: (dados: { valorCentavos: number; data: string }) => void;
  salvando: boolean;
  rotuloPago: string;
}) {
  const [valorReais, setValorReais] = useState((sugestao.valorCentavos / 100).toFixed(2).replace(".", ","));
  const [data, setData] = useState(sugestao.data.slice(0, 10));
  const futura = data > hojeIso();

  return (
    <form
      noValidate
      className="grid grid-cols-2 gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const valorCentavos = reaisParaCentavos(valorReais);
        if (!(valorCentavos > 0)) return toast.error("O valor deve ser maior que zero.");
        if (!data) return toast.error("Informe a data.");
        onSalvar({ valorCentavos, data });
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="mensalidade-valor">Valor (R$)</Label>
        <Input
          id="mensalidade-valor"
          inputMode="decimal"
          value={valorReais}
          onChange={(e) => setValorReais(e.target.value.replace(/[^\d.,]/g, ""))}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="mensalidade-data">Data</Label>
        <Input id="mensalidade-data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
      </div>
      <p className="col-span-2 text-xs text-muted-foreground">
        Valor e data vêm da última mensalidade (mês seguinte) — ajuste se precisar. Entra como <strong>{futura ? "pendente" : rotuloPago}</strong>{" "}
        {futura ? "(data futura)" : "(data até hoje)"}.
      </p>
      <div className="col-span-2 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={salvando}>
          {salvando ? "Salvando..." : "Adicionar"}
        </Button>
      </div>
    </form>
  );
}

/** Encerrar a recorrência (some das previsões depois da data) — ou reabrir, se já encerrada. */
export function EncerrarRecorrenciaDialog({
  alvo,
  onClose,
  onSalvar,
  salvando,
}: {
  alvo: { dataFim: string | null; nome: string } | null;
  onClose: () => void;
  onSalvar: (dataFim: string | null) => void;
  salvando: boolean;
}) {
  return (
    <Dialog open={!!alvo} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{alvo?.dataFim ? "Recorrência encerrada" : "Encerrar recorrência"}</DialogTitle>
          <DialogDescription>{alvo?.nome}</DialogDescription>
        </DialogHeader>
        {alvo && <FormEncerrar key={alvo.dataFim ?? "aberta"} dataFim={alvo.dataFim} onClose={onClose} onSalvar={onSalvar} salvando={salvando} />}
      </DialogContent>
    </Dialog>
  );
}

function FormEncerrar({
  dataFim,
  onClose,
  onSalvar,
  salvando,
}: {
  dataFim: string | null;
  onClose: () => void;
  onSalvar: (dataFim: string | null) => void;
  salvando: boolean;
}) {
  const [data, setData] = useState(dataFim ? dataFim.slice(0, 10) : hojeIso());
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!data) return toast.error("Informe a data de encerramento.");
        onSalvar(data);
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="encerrar-data">Encerrada em</Label>
        <Input id="encerrar-data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
      </div>
      <p className="text-xs text-muted-foreground">
        Depois desta data a recorrência não entra mais nas previsões do Dashboard nem em "a pagar". As mensalidades já lançadas continuam.
      </p>
      <div className="flex flex-wrap justify-end gap-2">
        {dataFim && (
          <Button type="button" variant="secondary" disabled={salvando} onClick={() => onSalvar(null)}>
            Reabrir recorrência
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={salvando}>
          {dataFim ? "Mudar data" : "Encerrar"}
        </Button>
      </div>
    </form>
  );
}
