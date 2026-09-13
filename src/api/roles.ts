import { api } from "@/lib/api";

export interface Permission {
  id: number;
  code: string;
  modulo: string;
  descricao: string;
}

export interface Role {
  id: number;
  empresaId: string;
  nome: string;
  isOwnerRole: boolean;
  permissions: string[];
}

export const rolesApi = {
  list: () => api.get<Role[]>("/roles"),
  listPermissoesDisponiveis: () => api.get<Permission[]>("/roles/permissoes-disponiveis"),
  updatePermissions: (roleId: number, permissionCodes: string[]) =>
    api.patch<Role>(`/roles/${roleId}/permissions`, { permissionCodes }),
};
