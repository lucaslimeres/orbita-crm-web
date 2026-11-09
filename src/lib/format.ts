/** Dinheiro sempre chega da API em centavos — nunca formatar float. */
export function formatMoney(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

/**
 * Datas sem horário (colunas DATE: data do gasto, aporte, retirada, receita, projeto,
 * próxima cobrança). A API devolve meia-noite UTC ("2026-11-05T00:00:00.000Z"); converter
 * para America/Sao_Paulo como em `formatDate` mostraria o dia anterior (21h do dia 04).
 * Aqui só a parte AAAA-MM-DD importa — nenhum fuso é aplicado.
 */
export function formatDateOnly(date: string): string {
  const [ano, mes, dia] = date.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

/** "AAAA-MM-DD" de hoje no fuso de quem está usando — valor inicial de `<input type="date">`. */
export function hojeIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Valor digitado em reais → centavos. Aceita "1.234,56" (vírgula decimal, ponto de milhar)
 * e "1234.56"/"59.9" (ponto decimal). `NaN` se não for número.
 */
export function reaisParaCentavos(valor: string): number {
  const texto = valor.includes(",") ? valor.replace(/\./g, "").replace(",", ".") : valor;
  return Math.round(Number(texto) * 100);
}

/** "10%" ou "R$ 10,00" — descrição curta do desconto de um cupom. */
export function formatDescontoCupom(cupom: { tipo: "valor_fixo" | "percentual"; valor: number }): string {
  return cupom.tipo === "percentual" ? `${cupom.valor}%` : formatMoney(cupom.valor);
}

/** "nas próximas 3 mensalidades" / "na próxima mensalidade" / "em todas as mensalidades". */
export function formatDuracaoCupom(usos: number | null, palavra: "próximas" | "primeiras" = "próximas"): string {
  if (usos === null) return "em todas as mensalidades";
  if (usos === 1) return palavra === "primeiras" ? "na primeira mensalidade" : "na próxima mensalidade";
  return `nas ${palavra} ${usos} mensalidades`;
}

const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "2026-11" (AAAA-MM) → "nov/26" — eixo e tabelas dos gráficos do Dashboard. */
export function rotuloMes(mes: string): string {
  const [ano, m] = mes.split("-");
  return `${MESES_CURTOS[Number(m) - 1]}/${ano.slice(2)}`;
}
