import { api } from "@/lib/api";
import type { AuthAssinatura, AuthEmpresa, AuthUsuario } from "@/stores/useAuthStore";

export interface SignupRequest {
  empresa: { razaoSocial: string; nomeFantasia: string; cnpj?: string | null; email: string };
  responsavel: { nome: string; cpf: string; email: string; senha: string; telefone?: string | null };
  plano: "free" | "pro";
}

export interface SignupResponse {
  empresa: AuthEmpresa;
  usuario: AuthUsuario;
  roleId: number;
  plano: "free" | "pro";
  accessToken: string;
}

export interface LoginResponse {
  usuario: AuthUsuario;
  accessToken: string;
}

export interface MeResponse {
  usuario: AuthUsuario;
  empresa: AuthEmpresa;
  assinatura: AuthAssinatura;
}

export const authApi = {
  signup: (data: SignupRequest) => api.post<SignupResponse>("/auth/signup", data),
  login: (email: string, senha: string) => api.post<LoginResponse>("/auth/login", { email, senha }),
  me: () => api.get<MeResponse>("/me"),
  forgotPassword: (email: string) => api.post<{ message: string }>("/auth/forgot-password", { email }),
  resetPassword: (token: string, novaSenha: string) => api.post<{ message: string }>("/auth/reset-password", { token, novaSenha }),
  resendVerificationCode: () => api.post<{ message: string }>("/me/email-verification/resend"),
  verifyEmailCode: (codigo: string) => api.post<{ message: string }>("/me/email-verification/confirm", { codigo }),
};
