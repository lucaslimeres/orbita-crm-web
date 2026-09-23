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
  confirmado: boolean;
}

export interface AuthEmpresa {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string | null;
  email: string;
}

export interface AuthAssinatura {
  /** Já é o plano *efetivo* — PRO só aparece aqui quando pago e em dia, ver docs/assinatura.md. */
  plano: "free" | "pro";
  status: string;
  /** PRO vencido sem renovar — bloqueia tudo exceto a tela de assinatura. */
  bloqueada: boolean;
}

interface AuthState {
  usuario: AuthUsuario | null;
  empresa: AuthEmpresa | null;
  assinatura: AuthAssinatura | null;
  accessToken: string | null;
  setSession: (data: { usuario: AuthUsuario; empresa?: AuthEmpresa; assinatura?: AuthAssinatura; accessToken: string }) => void;
  setAssinatura: (assinatura: AuthAssinatura) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      usuario: null,
      empresa: null,
      assinatura: null,
      accessToken: null,

      setSession: ({ usuario, empresa, assinatura, accessToken }) => {
        set({ usuario, empresa: empresa ?? get().empresa, assinatura: assinatura ?? get().assinatura, accessToken });
      },

      setAssinatura: (assinatura) => set({ assinatura }),

      logout: () => {
        set({ usuario: null, empresa: null, assinatura: null, accessToken: null });
      },
    }),
    {
      name: "orbita-auth",
    },
  ),
);
