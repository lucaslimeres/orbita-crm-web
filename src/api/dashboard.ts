import { api } from "@/lib/api";

/** Espelha `DashboardGeral` da API (`GET /dashboard`). Todo número já vem calculado — o front só exibe. */
export interface FatiaValor {
  rotulo: string;
  tipo: "categoria" | "aporte" | "projeto";
  totalCentavos: number;
}

export interface MesFluxo {
  /** AAAA-MM */
  mes: string;
  entradasCentavos: number;
  saidasCentavos: number;
}

export interface MesPrevisao extends MesFluxo {
  saldoProjetadoCentavos: number;
}

export interface ContaAPagar {
  gastoId: number;
  descricao: string;
  categoria: string;
  projetoNome: string | null;
  /** AAAA-MM-DD */
  data: string;
  valorCentavos: number;
  origem: "pendente" | "recorrente";
  vencido: boolean;
}

export interface MargemProjeto {
  projetoId: number;
  nome: string;
  receitaCentavos: number;
  gastoCentavos: number;
  margemCentavos: number;
}

export interface DashboardGeral {
  referencia: string;
  /** Mês filtrado (`null` = todo o período) e os meses com movimento, para o seletor. */
  filtro: { mes: string | null; mesesDisponiveis: string[] };
  indicadores: {
    saldoCentavos: number;
    /** Do mês filtrado, ou de todo o período sem filtro. */
    entradasCentavos: number;
    saidasCentavos: number;
    resultadoCentavos: number;
    aPagarCentavos: number;
    aPagarQuantidade: number;
  };
  gastosPorCategoria: FatiaValor[];
  entradasPorOrigem: FatiaValor[];
  fluxoMensal: MesFluxo[];
  previsao: MesPrevisao[];
  aPagarProximos30Dias: ContaAPagar[];
  margemPorProjeto: MargemProjeto[];
}

export const dashboardApi = {
  geral: (mes: string | null) => api.get<DashboardGeral>(mes ? `/dashboard?mes=${mes}` : "/dashboard"),
};
