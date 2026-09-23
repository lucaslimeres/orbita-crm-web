import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { adminPanelApi } from "@/api/admin";
import { AdminApiError } from "@/lib/adminApi";
import { useAdminAuthStore } from "@/stores/useAdminAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const setSession = useAdminAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { admin, accessToken } = await adminPanelApi.login(email, senha);
      setSession({ admin, accessToken });
      navigate({ to: "/admin" });
    } catch (error) {
      toast.error(error instanceof AdminApiError ? error.message : "Não foi possível entrar.");
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-[#1e2740] bg-[#12192b] p-6">
          <p className="text-center text-xs text-[#9aa0b0]">Painel interno — acesso restrito à equipe Órbita.</p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="senha">Senha</Label>
            <Input id="senha" type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" />
          </div>
          <Button type="submit" disabled={loading} className="mt-2">
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
