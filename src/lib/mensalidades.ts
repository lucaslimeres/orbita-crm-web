/**
 * Separa lançamentos avulsos/recorrentes (topo da lista) das mensalidades lançadas dentro
 * de um recorrente (`recorrenteOrigemId`), que a tela mostra agrupadas nele.
 */
export function agruparMensalidades<T extends { id: number; recorrenteOrigemId: number | null }>(itens: T[]) {
  const porSerie = new Map<number, T[]>();
  for (const item of itens) {
    if (item.recorrenteOrigemId) porSerie.set(item.recorrenteOrigemId, [...(porSerie.get(item.recorrenteOrigemId) ?? []), item]);
  }
  const ids = new Set(itens.map((i) => i.id));
  // Mensalidade cujo recorrente não veio na lista (não deveria acontecer) aparece solta.
  const topo = itens.filter((i) => !i.recorrenteOrigemId || !ids.has(i.recorrenteOrigemId));
  return { topo, mensalidadesDe: (id: number) => porSerie.get(id) ?? [] };
}

/** Mais recente primeiro (data; empate: o lançado por último). */
export function ordenarRecentes<T extends { id: number; dataInicio: string }>(itens: T[], data: (i: T) => string = (i) => i.dataInicio): T[] {
  return [...itens].sort((a, b) => data(b).slice(0, 10).localeCompare(data(a).slice(0, 10)) || b.id - a.id);
}
