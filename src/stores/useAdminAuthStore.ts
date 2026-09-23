import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AdminAuth {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
}

interface AdminAuthState {
  admin: AdminAuth | null;
  accessToken: string | null;
  setSession: (data: { admin: AdminAuth; accessToken: string }) => void;
  logout: () => void;
}

/**
 * Store separada da sessão de usuário comum (`useAuthStore`) de propósito — chave de
 * localStorage própria (`orbita-admin-auth`), nunca a mesma (`orbita-auth`). Login
 * exclusivo do painel admin, ver docs/admin.md.
 */
export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set) => ({
      admin: null,
      accessToken: null,

      setSession: ({ admin, accessToken }) => set({ admin, accessToken }),

      logout: () => set({ admin: null, accessToken: null }),
    }),
    {
      name: "orbita-admin-auth",
    },
  ),
);
