import { api } from "@/lib/api";
import type { CreateGastoRequest, Gasto, NovaMensalidadeRequest, ResumoSerie } from "@/api/financeiro";
import type { Recorrencia } from "./financeiro";

export type ProjetoStatus = "em_desenvolvimento" | "em_producao" | "pausado" | "encerrado";
export type ProjetoTipo = "landing_page" | "site" | "aplicativo" | "api" | "banco_de_dados" | "sistema" | "outro";

export interface Projeto {
  id: number;
  empresaId: string;
  nome: string;
  logoUrl: string | null;
  responsavelUsuarioId: string;
  descricao: string | null;
  cnpj: string | null;
  status: ProjetoStatus;
  dataInicio: string;
  tipos: ProjetoTipo[];
}

export interface CreateProjetoRequest {
  nome: string;
  logoUrl?: string | null;
  responsavelUsuarioId: string;
  descricao?: string | null;
  cnpj?: string | null;
  status?: ProjetoStatus;
  dataInicio: string;
  tipos: ProjetoTipo[];
}

export interface ProjetoDashboard {
  receitaTotalCentavos: number;
  receitaRecorrenteAtivaCentavos: number;
  gastoTotalCentavos: number;
  margemCentavos: number;
}

export interface Receita {
  id: number;
  projetoId: number;
  /** Legado — receitas novas usam só a descrição. */
  clienteNome: string | null;
  tipo: "pagamento_unico" | "mensalidade";
  valorCentavos: number;
  recorrencia: Recorrencia | null;
  dataInicio: string;
  dataFim: string | null;
  proximaOcorrencia: string | null;
  status: "recebido" | "pendente" | "atrasado";
  descricao: string | null;
  /** Mensalidade de uma receita recorrente: id da receita principal. */
  recorrenteOrigemId: number | null;
  serie: ResumoSerie | null;
}

/** Sem `status`: a API decide pela data (até hoje = recebido; futura = pendente). */
export interface CreateReceitaRequest {
  descricao: string;
  tipo: "pagamento_unico" | "mensalidade";
  valorCentavos: number;
  recorrencia?: Recorrencia | null;
  dataInicio: string;
}

export const projetosApi = {
  list: () => api.get<Projeto[]>("/projetos"),
  get: (id: number) => api.get<Projeto>(`/projetos/${id}`),
  create: (data: CreateProjetoRequest) => api.post<Projeto>("/projetos", data),
  update: (id: number, data: Partial<CreateProjetoRequest>) => api.patch<Projeto>(`/projetos/${id}`, data),
  remove: (id: number) => api.delete<void>(`/projetos/${id}`),
  dashboard: (id: number) => api.get<ProjetoDashboard>(`/projetos/${id}/dashboard`),

  listReceitas: (id: number) => api.get<Receita[]>(`/projetos/${id}/receitas`),
  createReceita: (id: number, data: CreateReceitaRequest) => api.post<Receita>(`/projetos/${id}/receitas`, data),
  updateReceita: (receitaId: number, data: { status?: string; descricao?: string | null; dataFim?: string | null }) =>
    api.patch<void>(`/projetos/receitas/${receitaId}`, data),
  addMensalidadeReceita: (id: number, receitaId: number, data: NovaMensalidadeRequest) =>
    api.post<Receita>(`/projetos/${id}/receitas/${receitaId}/mensalidades`, data),
  deleteReceita: (receitaId: number) => api.delete<void>(`/projetos/receitas/${receitaId}`),

  // Gastos do projeto: mesma tabela dos gastos da empresa, rotas com o projeto na URL
  // (permissões `projetos.financeiro.*`).
  listGastos: (id: number) => api.get<Gasto[]>(`/projetos/${id}/gastos`),
  createGasto: (id: number, data: Omit<CreateGastoRequest, "projetoId">) => api.post<Gasto>(`/projetos/${id}/gastos`, data),
  updateGasto: (id: number, gastoId: number, data: Partial<Omit<CreateGastoRequest, "projetoId">>) =>
    api.patch<void>(`/projetos/${id}/gastos/${gastoId}`, data),
  deleteGasto: (id: number, gastoId: number) => api.delete<void>(`/projetos/${id}/gastos/${gastoId}`),
  addMensalidadeGasto: (id: number, gastoId: number, data: NovaMensalidadeRequest) =>
    api.post<Gasto>(`/projetos/${id}/gastos/${gastoId}/mensalidades`, data),
};
