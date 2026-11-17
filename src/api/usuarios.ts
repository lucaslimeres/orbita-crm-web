import { api } from "@/lib/api";
import type { AuthUsuario } from "@/stores/useAuthStore";

export interface CreateUsuarioRequest {
  roleId: number;
  nome: string;
  cpf: string;
  email: string;
  telefone?: string | null;
}

export interface UpdateUsuarioRequest {
  nome?: string;
  roleId?: number;
  telefone?: string | null;
  ativo?: boolean;
}

/** `congelado`: plano Free acima do limite — não entra até voltar ao PRO (calculado pela API). */
export type UsuarioDaLista = AuthUsuario & { congelado?: boolean };

export const usuariosApi = {
  list: () => api.get<UsuarioDaLista[]>("/usuarios"),
  create: (data: CreateUsuarioRequest) => api.post<AuthUsuario>("/usuarios", data),
  update: (id: string, data: UpdateUsuarioRequest) => api.patch<AuthUsuario>(`/usuarios/${id}`, data),
  remove: (id: string) => api.delete<void>(`/usuarios/${id}`),
};
