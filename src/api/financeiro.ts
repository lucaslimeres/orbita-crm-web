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
  fluxoCaixaMensal: { mes: string; entradasCentavos: number; saidasCentavos: number }[];
}

export const financeiroApi = {
  dashboard: () => api.get<DashboardFinanceiro>("/financeiro/dashboard"),

  listGastos: (projetoId?: number) => api.get<Gasto[]>(`/financeiro/gastos${projetoId ? `?projetoId=${projetoId}` : ""}`),
  createGasto: (data: CreateGastoRequest) => api.post<{ id: number }>("/financeiro/gastos", data),
  updateGasto: (id: number, data: Partial<CreateGastoRequest>) => api.patch<void>(`/financeiro/gastos/${id}`, data),
  deleteGasto: (id: number) => api.delete<void>(`/financeiro/gastos/${id}`),

  listAportes: () => api.get<Aporte[]>("/financeiro/aportes"),
  createAporte: (data: CreateAporteRequest) => api.post<{ id: number }>("/financeiro/aportes", data),
  deleteAporte: (id: number) => api.delete<void>(`/financeiro/aportes/${id}`),

  listRetiradas: () => api.get<Retirada[]>("/financeiro/retiradas"),
  createRetirada: (data: CreateRetiradaRequest) => api.post<{ id: number }>("/financeiro/retiradas", data),
  deleteRetirada: (id: number) => api.delete<void>(`/financeiro/retiradas/${id}`),
};
