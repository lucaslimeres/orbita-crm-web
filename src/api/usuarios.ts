import { api } from "@/lib/api";
import type { AuthUsuario } from "@/stores/useAuthStore";

export interface CreateUsuarioRequest {
  roleId: number;
  nome: string;
  cpf: string;
  email: string;
  senha: string;
  telefone?: string | null;
}

export interface UpdateUsuarioRequest {
  nome?: string;
  roleId?: number;
  telefone?: string | null;
  ativo?: boolean;
}

export const usuariosApi = {
  list: () => api.get<AuthUsuario[]>("/usuarios"),
  create: (data: CreateUsuarioRequest) => api.post<AuthUsuario>("/usuarios", data),
  update: (id: string, data: UpdateUsuarioRequest) => api.patch<AuthUsuario>(`/usuarios/${id}`, data),
  remove: (id: string) => api.delete<void>(`/usuarios/${id}`),
};
