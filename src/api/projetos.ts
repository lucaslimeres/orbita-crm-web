import { api } from "@/lib/api";
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
  clienteNome: string;
  tipo: "pagamento_unico" | "mensalidade";
  valorCentavos: number;
  recorrencia: Recorrencia | null;
  dataInicio: string;
  status: "recebido" | "pendente" | "atrasado";
  descricao: string | null;
}

export interface CreateReceitaRequest {
  clienteNome: string;
  tipo: "pagamento_unico" | "mensalidade";
  valorCentavos: number;
  recorrencia?: Recorrencia | null;
  dataInicio: string;
  status?: "recebido" | "pendente" | "atrasado";
  descricao?: string | null;
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
  updateReceita: (receitaId: number, data: { status?: string; descricao?: string | null }) =>
    api.patch<void>(`/projetos/receitas/${receitaId}`, data),
  deleteReceita: (receitaId: number) => api.delete<void>(`/projetos/receitas/${receitaId}`),
};
