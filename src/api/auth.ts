import { api } from "@/lib/api";
import type { AuthEmpresa, AuthUsuario } from "@/stores/useAuthStore";

export interface SignupRequest {
  empresa: { razaoSocial: string; nomeFantasia: string; cnpj?: string | null; email: string };
  responsavel: { nome: string; cpf: string; email: string; senha: string; telefone?: string | null };
}

export interface SignupResponse {
  empresa: AuthEmpresa;
  usuario: AuthUsuario;
  roleId: number;
  accessToken: string;
}

export interface LoginResponse {
  usuario: AuthUsuario;
  accessToken: string;
}

export interface MeResponse {
  usuario: AuthUsuario;
  empresa: AuthEmpresa;
}

export const authApi = {
  signup: (data: SignupRequest) => api.post<SignupResponse>("/auth/signup", data),
  login: (email: string, senha: string) => api.post<LoginResponse>("/auth/login", { email, senha }),
  me: () => api.get<MeResponse>("/me"),
};
