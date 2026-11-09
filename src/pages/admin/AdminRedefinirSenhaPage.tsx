import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { adminPanelApi } from "@/api/admin";
import { AdminApiError } from "@/lib/adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Nova senha do admin a partir do link do e-mail (`?token=`) — uso único, vale 1 hora. */
export function AdminRedefinirSenhaPage() {
  const navigate = useNavigate();
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [linkInvalido, setLinkInvalido] = useState(!token);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (novaSenha.length < 8) return toast.error("A senha deve ter pelo menos 8 caracteres.");
    if (novaSenha !== confirmarSenha) return toast.error("As senhas não conferem.");

    setLoading(true);
    try {
      await adminPanelApi.redefinirSenha(token, novaSenha);
      toast.success("Senha redefinida. Faça login com a nova senha.");
      navigate({ to: "/admin/login" });
    } catch (error) {
      const mensagem = error instanceof AdminApiError ? error.message : "Não foi possível redefinir a senha.";
      toast.error(mensagem);
      if (mensagem.includes("inválido ou expirado")) setLinkInvalido(true);
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

        {linkInvalido ? (
          <div className="flex flex-col gap-4 rounded-lg border border-[#1e2740] bg-[#12192b] p-6 text-center">
            <p className="text-sm text-[#d7dae2]">Link inválido ou expirado.</p>
            <Button asChild>
              <Link to="/admin/esqueci-senha">Pedir um novo link</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-[#1e2740] bg-[#12192b] p-6">
            <p className="text-sm text-[#9aa0b0]">Escolha uma nova senha para o painel admin (mínimo de 8 caracteres).</p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="novaSenha">Nova senha</Label>
              <Input id="novaSenha" type="password" required value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} autoComplete="new-password" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirmarSenha">Confirmar nova senha</Label>
              <Input
                id="confirmarSenha"
                type="password"
                required
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" disabled={loading} className="mt-2">
              {loading ? "Salvando..." : "Redefinir senha"}
            </Button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-[#9aa0b0]">
          <Link to="/admin/login" className="text-[#8b77ff] hover:underline">
            Voltar ao login
          </Link>
        </p>
      </div>
    </div>
  );
}
