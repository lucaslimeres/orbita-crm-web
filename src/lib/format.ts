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
