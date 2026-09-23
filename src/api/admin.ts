import { adminApi } from "@/lib/adminApi";
import type { AdminAuth } from "@/stores/useAdminAuthStore";

export interface AdminLoginResponse {
  admin: AdminAuth;
  accessToken: string;
}

export interface DashboardStats {
  totalEmpresas: number;
  novasContasUltimos30Dias: number;
  empresasPorPlano: { plano: string; total: number }[];
  empresasPorStatus: { status: string; total: number }[];
  totalUsuarios: number;
  totalProjetos: number;
  mrrCentavos: number;
  faturamentoTotalCentavos: number;
  faturamentoMesAtualCentavos: number;
  faturasPagasPorFormaPagamento: { formaPagamento: string; total: number; valorCentavos: number }[];
}

export interface EmpresaResumo {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  email: string;
  cnpj: string | null;
  plano: string;
  status: string;
  totalUsuarios: number;
  totalProjetos: number;
  createdAt: string;
}

export interface AdminUsuario {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  telefone: string | null;
  roleId: number;
  ativo: boolean;
  emailVerificadoEm: string | null;
}

export interface AdminProjeto {
  id: number;
  nome: string;
  status: "em_desenvolvimento" | "em_producao" | "pausado" | "encerrado";
  dataInicio: string;
  tipos: string[];
}

export interface AdminAssinatura {
  plano: string;
  valorCentavos: number;
  formaPagamento: "cartao" | "pix" | null;
  status: string;
  cartaoFinal: string | null;
  cartaoBandeira: string | null;
  proximaCobranca: string | null;
  tentativasFalhaCartao: number;
}

export interface AdminFatura {
  id: number;
  competencia: string;
  valorCentavos: number;
  formaPagamento: "cartao" | "pix";
  status: string;
  pagoEm: string | null;
  createdAt: string;
}

export interface EmpresaDetalhe {
  empresa: { id: string; razaoSocial: string; nomeFantasia: string; cnpj: string | null; email: string; telefone: string | null; endereco: string | null; createdAt: string };
  assinatura: AdminAssinatura | null;
  faturas: AdminFatura[];
  usuarios: AdminUsuario[];
  projetos: AdminProjeto[];
}

export interface FaturaComEmpresa {
  id: number;
  empresaId: string;
  empresaNome: string;
  competencia: string;
  valorCentavos: number;
  formaPagamento: "cartao" | "pix";
  status: string;
  pagoEm: string | null;
  createdAt: string;
}

export interface ListFaturasFiltros {
  status?: string;
  formaPagamento?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminAccount {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  confirmado: boolean;
  createdAt: string;
}

export interface CreateAdminAccountInput {
  nome: string;
  email: string;
}

export interface ConfirmarConviteAdminInput {
  token: string;
  novaSenha: string;
}

export interface UpdateAdminAccountInput {
  nome?: string;
  email?: string;
  ativo?: boolean;
  senha?: string;
}

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}

export const adminPanelApi = {
  login: (email: string, senha: string) => adminApi.post<AdminLoginResponse>("/admin/login", { email, senha }),
  me: () => adminApi.get<{ admin: AdminAuth }>("/admin/me"),
  dashboard: () => adminApi.get<DashboardStats>("/admin/dashboard"),
  listEmpresas: (busca?: string) => adminApi.get<EmpresaResumo[]>(`/admin/empresas${query({ busca })}`),
  getEmpresa: (id: string) => adminApi.get<EmpresaDetalhe>(`/admin/empresas/${id}`),
  toggleUsuarioAtivo: (empresaId: string, usuarioId: string, ativo: boolean) =>
    adminApi.patch<void>(`/admin/empresas/${empresaId}/usuarios/${usuarioId}`, { ativo }),
  updateProjetoStatus: (empresaId: string, projetoId: number, status: AdminProjeto["status"]) =>
    adminApi.patch<void>(`/admin/empresas/${empresaId}/projetos/${projetoId}`, { status }),
  listFaturas: (filtros: ListFaturasFiltros) =>
    adminApi.get<{ items: FaturaComEmpresa[]; total: number }>(`/admin/financeiro/faturas${query({ ...filtros })}`),
  listAdmins: () => adminApi.get<AdminAccount[]>("/admin/administradores"),
  createAdmin: (data: CreateAdminAccountInput) => adminApi.post<AdminAccount>("/admin/administradores", data),
  updateAdmin: (id: string, data: UpdateAdminAccountInput) => adminApi.patch<AdminAccount>(`/admin/administradores/${id}`, data),
  deleteAdmin: (id: string) => adminApi.delete<void>(`/admin/administradores/${id}`),
  confirmarConvite: (data: ConfirmarConviteAdminInput) => adminApi.post<{ message: string }>("/admin/confirmar-convite", data),
};
