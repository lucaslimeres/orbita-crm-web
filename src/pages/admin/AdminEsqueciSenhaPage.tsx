import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { adminPanelApi } from "@/api/admin";
import { AdminApiError } from "@/lib/adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * "Esqueci minha senha" do painel admin — fluxo e token próprios (`admin_invite_tokens`),
 * nunca os do login de usuário comum. Ver docs/admin.md.
 */
export function AdminEsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await adminPanelApi.esqueciSenha(email);
      // A API responde igual exista ou não o e-mail — não revela quem é administrador.
      setEnviado(true);
    } catch (error) {
      toast.error(error instanceof AdminApiError ? error.message : "Não foi possível enviar o e-mail de redefinição.");
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

        {enviado ? (
          <div className="flex flex-col gap-4 rounded-lg border border-[#1e2740] bg-[#12192b] p-6 text-center">
            <p className="text-sm text-[#d7dae2]">
              Se <strong className="text-white">{email}</strong> for de um administrador, você vai receber um e-mail com um link para
              redefinir a senha.
            </p>
            <p className="text-xs text-[#9aa0b0]">O link vale por 1 hora. Não recebeu? Verifique a caixa de spam ou tente novamente.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-[#1e2740] bg-[#12192b] p-6">
            <p className="text-sm text-[#9aa0b0]">Informe o e-mail de administrador para receber um link de redefinição de senha.</p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <Button type="submit" disabled={loading} className="mt-2">
              {loading ? "Enviando..." : "Enviar link de redefinição"}
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
