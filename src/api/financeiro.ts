import { api } from "@/lib/api";

export type Recorrencia = "unico" | "mensal" | "trimestral" | "semestral" | "anual";

export interface Gasto {
  id: number;
  empresaId: string;
  projetoId: number | null;
  categoria: string;
  descricao: string | null;
  valorCentavos: number;
  fornecedor: string | null;
  formaPagamento: string | null;
  recorrencia: Recorrencia;
  dataInicio: string;
  dataFim: string | null;
  proximaOcorrencia: string | null;
  status: "pago" | "pendente";
  anexoUrl: string | null;
  /** Mensalidade de um gasto recorrente: id do gasto principal (série). */
  recorrenteOrigemId: number | null;
  /** Só no gasto recorrente principal: resumo das mensalidades. */
  serie: ResumoSerie | null;
}

/** Resumo de um gasto/receita recorrente — calculado pela API (ver docs/financeiro.md). */
export interface ResumoSerie {
  /** Mensalidades lançadas, contando a primeira (o próprio recorrente). */
  quantidade: number;
  ultima: { data: string; valorCentavos: number };
  /** Tem data de encerramento (`dataFim`). */
  encerrada: boolean;
  /** Pré-preenchimento de "Adicionar mensalidade"; `null` se cair depois do encerramento. */
  sugestao: { data: string; valorCentavos: number } | null;
}

/** "Adicionar mensalidade": tudo opcional — sem valor/data, a API usa a sugestão; status pela data. */
export interface NovaMensalidadeRequest {
  valorCentavos?: number;
  data?: string;
}

export interface CreateGastoRequest {
  projetoId?: number | null;
  categoria: string;
  descricao?: string | null;
  valorCentavos: number;
  fornecedor?: string | null;
  formaPagamento?: string | null;
  recorrencia: Recorrencia;
  dataInicio: string;
  status?: "pago" | "pendente";
  /** Encerrar a recorrência nesta data (`null` reabre). */
  dataFim?: string | null;
}

export interface Aporte {
  id: number;
  origem: "socio" | "investidor" | "outro";
  socioUsuarioId: string | null;
  valorCentavos: number;
  data: string;
  descricao: string | null;
}

export interface CreateAporteRequest {
  origem: "socio" | "investidor" | "outro";
  socioUsuarioId?: string | null;
  valorCentavos: number;
  data: string;
  descricao?: string | null;
}

export interface Retirada {
  id: number;
  subtipo: "pro_labore" | "distribuicao_lucro" | "reembolso" | "outro";
  destinatarioUsuarioId: string | null;
  destinatarioNome: string | null;
  valorCentavos: number;
  data: string;
  descricao: string | null;
}

export interface CreateRetiradaRequest {
  subtipo: "pro_labore" | "distribuicao_lucro" | "reembolso" | "outro";
  destinatarioUsuarioId?: string | null;
  destinatarioNome?: string | null;
  valorCentavos: number;
  data: string;
  descricao?: string | null;
}

export interface DashboardFinanceiro {
  saldoCentavos: number;
  gastosPorCategoria: { categoria: string; totalCentavos: number }[];
  previsaoGastosRecorrentes: Gasto[];
  /** Pendentes (inclusive vencidos) + ocorrências de recorrentes até hoje+90 — calculado na API. */
  aPagar90Dias: { totalCentavos: number; quantidade: number };
  fluxoCaixaMensal: { mes: string; entradasCentavos: number; saidasCentavos: number }[];
}

export const financeiroApi = {
  dashboard: () => api.get<DashboardFinanceiro>("/financeiro/dashboard"),

  listGastos: (projetoId?: number) => api.get<Gasto[]>(`/financeiro/gastos${projetoId ? `?projetoId=${projetoId}` : ""}`),
  createGasto: (data: CreateGastoRequest) => api.post<{ id: number }>("/financeiro/gastos", data),
  updateGasto: (id: number, data: Partial<CreateGastoRequest>) => api.patch<void>(`/financeiro/gastos/${id}`, data),
  deleteGasto: (id: number) => api.delete<void>(`/financeiro/gastos/${id}`),
  addMensalidadeGasto: (id: number, data: NovaMensalidadeRequest) => api.post<Gasto>(`/financeiro/gastos/${id}/mensalidades`, data),

  listAportes: () => api.get<Aporte[]>("/financeiro/aportes"),
  createAporte: (data: CreateAporteRequest) => api.post<{ id: number }>("/financeiro/aportes", data),
  updateAporte: (id: number, data: CreateAporteRequest) => api.patch<void>(`/financeiro/aportes/${id}`, data),
  deleteAporte: (id: number) => api.delete<void>(`/financeiro/aportes/${id}`),

  listRetiradas: () => api.get<Retirada[]>("/financeiro/retiradas"),
  createRetirada: (data: CreateRetiradaRequest) => api.post<{ id: number }>("/financeiro/retiradas", data),
  updateRetirada: (id: number, data: CreateRetiradaRequest) => api.patch<void>(`/financeiro/retiradas/${id}`, data),
  deleteRetirada: (id: number) => api.delete<void>(`/financeiro/retiradas/${id}`),
};
