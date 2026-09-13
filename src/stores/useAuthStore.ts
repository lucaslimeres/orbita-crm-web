import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUsuario {
  id: string;
  empresaId: string;
  roleId: number;
  nome: string;
  email: string;
  cpf: string;
  telefone: string | null;
  ativo: boolean;
}

export interface AuthEmpresa {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string | null;
  email: string;
}

interface AuthState {
  usuario: AuthUsuario | null;
  empresa: AuthEmpresa | null;
  accessToken: string | null;
  setSession: (data: { usuario: AuthUsuario; empresa?: AuthEmpresa; accessToken: string }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      usuario: null,
      empresa: null,
      accessToken: null,

      setSession: ({ usuario, empresa, accessToken }) => {
        set({ usuario, empresa: empresa ?? get().empresa, accessToken });
      },

      logout: () => {
        set({ usuario: null, empresa: null, accessToken: null });
      },
    }),
    {
      name: "orbita-auth",
    },
  ),
);
