import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney, rotuloMes } from "@/lib/format";
import { cn } from "@/lib/utils";

/*
 * Gráficos da tela Dashboard — SVG/HTML feito à mão, sem biblioteca de charting.
 * Regras (skill dataviz): cor por função (entradas = --chart-in, saídas = --chart-out,
 * saldo = --chart-balance, margem negativa = --chart-neg), texto sempre nos tokens de
 * texto, barras finas com ponta arredondada de 4px, linhas de 2px, grade discreta,
 * tooltip em hover/foco, legenda para 2+ séries e tabela alternativa em todo gráfico.
 * Nenhum número é calculado aqui — tudo vem pronto de GET /dashboard.
 */

const compacto = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 });

/** Eixo: "R$ 1,2 mil" — só para ticks; valores exatos ficam no tooltip/tabela. */
function formatEixo(centavos: number): string {
  return compacto.format(centavos / 100);
}

/** Ticks "redondos" cobrindo [min, max] (min ≤ 0 ≤ max garantido pelo chamador). */
function niceTicks(min: number, max: number, alvo = 4): number[] {
  const span = max - min || 1;
  const bruto = span / alvo;
  const mag = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((p) => span / p <= alvo) ?? 10 * mag;
  const ticks: number[] = [];
  for (let v = Math.floor(min / passo) * passo; v <= max + passo * 0.001; v += passo) ticks.push(Math.round(v));
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + passo);
  return ticks;
}

function useLargura<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [largura, setLargura] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setLargura(el.clientWidth);
    const ro = new ResizeObserver(([entry]) => setLargura(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, largura] as const;
}

/* ───────────────────────── Moldura: título, legenda, tabela ───────────────────────── */

export interface Serie {
  nome: string;
  cor: string;
}

export function Legenda({ series }: { series: Serie[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {series.map((s) => (
        <li key={s.nome} className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-sm" style={{ background: s.cor }} aria-hidden />
          {s.nome}
        </li>
      ))}
    </ul>
  );
}

export interface ColunaTabela<T> {
  titulo: string;
  valor: (linha: T) => ReactNode;
  numerica?: boolean;
}

export function ChartCard<T>({
  titulo,
  descricao,
  legenda,
  vazio,
  linhas,
  colunas,
  children,
  className,
}: {
  titulo: string;
  descricao?: string;
  legenda?: Serie[];
  /** Mensagem quando não há dado — substitui gráfico e tabela. */
  vazio?: string | false;
  linhas: T[];
  colunas: ColunaTabela<T>[];
  children: ReactNode;
  className?: string;
}) {
  const [verTabela, setVerTabela] = useState(false);

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <CardTitle>{titulo}</CardTitle>
          {descricao && <CardDescription>{descricao}</CardDescription>}
        </div>
        {!vazio && (
          <button
            type="button"
            onClick={() => setVerTabela((v) => !v)}
            className="shrink-0 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            {verTabela ? "Ver gráfico" : "Ver tabela"}
          </button>
        )}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        {vazio ? (
          <p className="flex flex-1 items-center justify-center py-10 text-center text-sm text-muted-foreground">{vazio}</p>
        ) : verTabela ? (
          <Table>
            <TableHeader>
              <TableRow>
                {colunas.map((c) => (
                  <TableHead key={c.titulo} className={cn(c.numerica && "text-right")}>
                    {c.titulo}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map((linha, i) => (
                <TableRow key={i}>
                  {colunas.map((c) => (
                    <TableCell key={c.titulo} className={cn(c.numerica && "text-right font-numeric")}>
                      {c.valor(linha)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <>
            {legenda && legenda.length > 1 && <Legenda series={legenda} />}
            {children}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ───────────────────────── Tooltip ───────────────────────── */

interface TooltipInfo {
  x: number;
  y: number;
  titulo: string;
  linhas: { nome: string; cor?: string; valor: string }[];
}

function Tooltip({ info, largura }: { info: TooltipInfo | null; largura: number }) {
  if (!info) return null;
  const esquerda = Math.min(Math.max(info.x, 80), Math.max(largura - 80, 80));
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 min-w-36 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md"
      style={{ left: esquerda, top: info.y - 8 }}
    >
      <p className="mb-1 font-medium text-foreground">{info.titulo}</p>
      {info.linhas.map((l) => (
        <p key={l.nome} className="flex items-center justify-between gap-3 text-muted-foreground">
          <span className="flex items-center gap-1.5">
            {l.cor && <span className="inline-block size-2 rounded-sm" style={{ background: l.cor }} aria-hidden />}
            {l.nome}
          </span>
          <span className="font-numeric text-foreground">{l.valor}</span>
        </p>
      ))}
    </div>
  );
}

/* ───────────────────────── Barras horizontais ranqueadas ───────────────────────── */

/** Parte-do-todo ranqueado, um único tom. Ordem vem da API (maior primeiro). */
export function BarrasRanqueadas({ itens, cor }: { itens: { rotulo: string; detalhe?: string; totalCentavos: number }[]; cor: string }) {
  const max = Math.max(...itens.map((i) => i.totalCentavos), 1);
  return (
    <ul className="flex flex-col gap-3">
      {itens.map((item) => (
        <li key={`${item.detalhe ?? ""}${item.rotulo}`} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate">
              {item.rotulo}
              {item.detalhe && <span className="ml-1.5 text-xs text-muted-foreground">{item.detalhe}</span>}
            </span>
            <span className="shrink-0 font-numeric text-muted-foreground">{formatMoney(item.totalCentavos)}</span>
          </div>
          <div className="h-3 w-full" title={`${item.rotulo}: ${formatMoney(item.totalCentavos)}`}>
            <div
              className="h-full rounded-r-[4px]"
              style={{ width: `${Math.max((item.totalCentavos / max) * 100, 1)}%`, background: cor }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ───────────────────────── Colunas agrupadas (mês a mês) ───────────────────────── */

const ALTURA = 220;
const MARGEM = { topo: 12, base: 24, esquerda: 64, direita: 8 };

export function ColunasAgrupadas<T extends { mes: string }>({
  dados,
  series,
  destaqueIndice,
}: {
  dados: T[];
  series: (Serie & { valor: (d: T) => number })[];
  /** Mês com contorno tracejado (ex.: mês atual parcial). */
  destaqueIndice?: number;
}) {
  const [ref, largura] = useLargura<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const max = Math.max(...dados.flatMap((d) => series.map((s) => s.valor(d))), 0);
  const ticks = niceTicks(0, max || 100_00);
  const topo = ticks[ticks.length - 1];
  const areaW = Math.max(largura - MARGEM.esquerda - MARGEM.direita, 0);
  const areaH = ALTURA - MARGEM.topo - MARGEM.base;
  const banda = dados.length ? areaW / dados.length : 0;
  const gap = 2;
  const barraW = Math.max(Math.min(24, (banda * 0.7 - gap * (series.length - 1)) / series.length), 2);
  const grupoW = barraW * series.length + gap * (series.length - 1);
  const y = (v: number) => MARGEM.topo + areaH - (v / topo) * areaH;
  const mostrarRotulo = (i: number) => banda >= 44 || i % 2 === dados.length % 2 || i === dados.length - 1;

  const info: TooltipInfo | null =
    hover === null
      ? null
      : {
          x: MARGEM.esquerda + banda * hover + banda / 2,
          y: y(Math.max(...series.map((s) => s.valor(dados[hover])))),
          titulo: rotuloMes(dados[hover].mes),
          linhas: series.map((s) => ({ nome: s.nome, cor: s.cor, valor: formatMoney(s.valor(dados[hover])) })),
        };

  return (
    <div ref={ref} className="relative w-full">
      {largura > 0 && (
        <svg width={largura} height={ALTURA} role="img" aria-label={series.map((s) => s.nome).join(" e ") + " por mês"}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={MARGEM.esquerda} x2={largura - MARGEM.direita} y1={y(t)} y2={y(t)} stroke={t === 0 ? "var(--chart-axis)" : "var(--chart-grid)"} />
              <text x={MARGEM.esquerda - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px]">
                {formatEixo(t)}
              </text>
            </g>
          ))}
          {dados.map((d, i) => {
            const x0 = MARGEM.esquerda + banda * i + (banda - grupoW) / 2;
            return (
              <g
                key={d.mes}
                tabIndex={0}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                className="outline-none"
                aria-label={`${rotuloMes(d.mes)}: ${series.map((s) => `${s.nome} ${formatMoney(s.valor(d))}`).join(", ")}`}
              >
                <rect
                  x={MARGEM.esquerda + banda * i}
                  y={MARGEM.topo}
                  width={banda}
                  height={areaH}
                  fill={hover === i ? "var(--chart-grid)" : "transparent"}
                  opacity={0.6}
                />
                {destaqueIndice === i && (
                  <rect
                    x={MARGEM.esquerda + banda * i + 1}
                    y={MARGEM.topo}
                    width={banda - 2}
                    height={areaH}
                    fill="none"
                    stroke="var(--chart-axis)"
                    strokeDasharray="3 3"
                    rx={4}
                  />
                )}
                {series.map((s, si) => {
                  const v = s.valor(d);
                  if (v <= 0) return null;
                  const h = Math.max(areaH - (y(v) - MARGEM.topo), 1);
                  return <BarraVertical key={s.nome} x={x0 + si * (barraW + gap)} y={y(v)} w={barraW} h={h} cor={s.cor} />;
                })}
                {mostrarRotulo(i) && (
                  <text x={MARGEM.esquerda + banda * i + banda / 2} y={ALTURA - 6} textAnchor="middle" className="fill-muted-foreground text-[11px]">
                    {rotuloMes(d.mes)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      <Tooltip info={info} largura={largura} />
    </div>
  );
}

/** Coluna com só a ponta de cima arredondada (4px) — ancorada na linha de base. */
function BarraVertical({ x, y, w, h, cor }: { x: number; y: number; w: number; h: number; cor: string }) {
  const r = Math.min(4, w / 2, h);
  const d = `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
  return <path d={d} fill={cor} />;
}

/* ───────────────────────── Linha (saldo projetado) ───────────────────────── */

export function Linha<T extends { mes: string }>({ dados, serie }: { dados: T[]; serie: Serie & { valor: (d: T) => number } }) {
  const [ref, largura] = useLargura<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const valores = dados.map(serie.valor);
  const ticks = niceTicks(Math.min(0, ...valores), Math.max(0, ...valores, 1));
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];
  const areaW = Math.max(largura - MARGEM.esquerda - MARGEM.direita, 0);
  const areaH = ALTURA - MARGEM.topo - MARGEM.base;
  const banda = dados.length ? areaW / dados.length : 0;
  const x = (i: number) => MARGEM.esquerda + banda * i + banda / 2;
  const y = (v: number) => MARGEM.topo + areaH - ((v - lo) / (hi - lo || 1)) * areaH;
  const caminho = valores.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");

  const info: TooltipInfo | null =
    hover === null
      ? null
      : {
          x: x(hover),
          y: y(valores[hover]),
          titulo: rotuloMes(dados[hover].mes),
          linhas: [{ nome: serie.nome, cor: serie.cor, valor: formatMoney(valores[hover]) }],
        };

  return (
    <div ref={ref} className="relative w-full">
      {largura > 0 && (
        <svg width={largura} height={ALTURA} role="img" aria-label={`${serie.nome} por mês`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={MARGEM.esquerda} x2={largura - MARGEM.direita} y1={y(t)} y2={y(t)} stroke={t === 0 ? "var(--chart-axis)" : "var(--chart-grid)"} />
              <text x={MARGEM.esquerda - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px]">
                {formatEixo(t)}
              </text>
            </g>
          ))}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={MARGEM.topo} y2={MARGEM.topo + areaH} stroke="var(--chart-axis)" />}
          <path d={caminho} fill="none" stroke={serie.cor} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {dados.map((d, i) => (
            <g
              key={d.mes}
              tabIndex={0}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className="outline-none"
              aria-label={`${rotuloMes(d.mes)}: ${serie.nome} ${formatMoney(valores[i])}`}
            >
              <rect x={MARGEM.esquerda + banda * i} y={MARGEM.topo} width={banda} height={areaH} fill="transparent" />
              <circle
                cx={x(i)}
                cy={y(valores[i])}
                r={hover === i ? 5 : 4}
                fill={valores[i] < 0 ? "var(--chart-neg)" : serie.cor}
                stroke="var(--surface)"
                strokeWidth={2}
              />
              <text x={x(i)} y={ALTURA - 6} textAnchor="middle" className="fill-muted-foreground text-[11px]">
                {rotuloMes(d.mes)}
              </text>
            </g>
          ))}
        </svg>
      )}
      <Tooltip info={info} largura={largura} />
    </div>
  );
}

/* ───────────────────────── Barras divergentes (margem) ───────────────────────── */

/** Positivo para a direita (azul), negativo para a esquerda (vermelho), zero no meio do domínio. */
export function BarrasDivergentes({ itens }: { itens: { rotulo: string; valorCentavos: number; detalhe: string }[] }) {
  const min = Math.min(0, ...itens.map((i) => i.valorCentavos));
  const max = Math.max(0, ...itens.map((i) => i.valorCentavos));
  const span = max - min || 1;
  const zero = (-min / span) * 100;

  return (
    <ul className="flex flex-col gap-3">
      {itens.map((item) => {
        const negativo = item.valorCentavos < 0;
        const largura = Math.max((Math.abs(item.valorCentavos) / span) * 100, item.valorCentavos === 0 ? 0 : 0.8);
        return (
          <li key={item.rotulo} className="flex flex-col gap-1" title={item.detalhe}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate">{item.rotulo}</span>
              <span className={cn("shrink-0 font-numeric", negativo ? "text-negative" : "text-muted-foreground")}>
                {formatMoney(item.valorCentavos)}
              </span>
            </div>
            <div className="relative h-3 w-full">
              <span className="absolute inset-y-[-3px] w-px bg-[var(--chart-axis)]" style={{ left: `${zero}%` }} aria-hidden />
              <div
                className={cn("absolute inset-y-0", negativo ? "rounded-l-[4px]" : "rounded-r-[4px]")}
                style={{
                  left: negativo ? `${zero - largura}%` : `${zero}%`,
                  width: `${largura}%`,
                  background: negativo ? "var(--chart-neg)" : "var(--chart-in)",
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
