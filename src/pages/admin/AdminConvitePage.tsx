import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { adminPanelApi } from "@/api/admin";
import { AdminApiError } from "@/lib/adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Confirmação de convite de administrador — token próprio (`admin_invite_tokens`), nunca o de tenant. Ver docs/admin.md. */
export function AdminConvitePage() {
  const navigate = useNavigate();
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (novaSenha !== confirmarSenha) {
      toast.error("As senhas não conferem.");
      return;
    }

    setLoading(true);
    try {
      await adminPanelApi.confirmarConvite({ token, novaSenha });
      toast.success("Senha definida com sucesso. Faça login para continuar.");
      navigate({ to: "/admin/login" });
    } catch (error) {
      toast.error(error instanceof AdminApiError ? error.message : "Não foi possível confirmar o convite.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dark flex min-h-screen items-center justify-center bg-[#0b1220] px-4">
      <div className="w-full max-w-sm">
        <div className="mx-auto mb-8 flex flex-col items-center gap-2">
          <ShieldCheck className="size-8 text-[#8b77ff]" />
          <span className="text-lg font-semibold text-white">Órbita Admin</span>
        </div>

        {!token ? (
          <div className="flex flex-col gap-4 rounded-lg border border-[#1e2740] bg-[#12192b] p-6 text-center">
            <p className="text-sm text-[#d7dae2]">Link de convite inválido.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-[#1e2740] bg-[#12192b] p-6">
            <p className="text-sm text-[#9aa0b0]">Você foi convidado para o painel admin do Órbita. Defina sua senha para ativar seu acesso.</p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="novaSenha">Senha</Label>
              <Input
                id="novaSenha"
                type="password"
                required
                minLength={8}
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirmarSenha">Confirmar senha</Label>
              <Input
                id="confirmarSenha"
                type="password"
                required
                minLength={8}
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" disabled={loading} className="mt-2">
              {loading ? "Salvando..." : "Definir senha e entrar"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
