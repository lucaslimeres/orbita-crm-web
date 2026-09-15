import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { authApi } from "@/api/auth";
import { ApiError } from "@/lib/api";
import { useAuthStore } from "@/stores/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/orbita-lockup-branco.svg";

export function VerifyEmailCodePage() {
  const navigate = useNavigate();
  const usuario = useAuthStore((s) => s.usuario);
  const assinatura = useAuthStore((s) => s.assinatura);
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);
  const [reenviando, setReenviando] = useState(false);

  // PRO escolhido no cadastro mas ainda não pago vai direto pra tela de assinatura;
  // o resto (Free, ou PRO já ativo) vai pro dashboard normalmente.
  const destino = assinatura?.plano === "pro" && assinatura.status !== "ativa" ? "/assinatura" : "/financeiro";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.verifyEmailCode(codigo);
      toast.success("E-mail verificado com sucesso!");
      navigate({ to: destino });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Código inválido.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReenviar() {
    setReenviando(true);
    try {
      await authApi.resendVerificationCode();
      toast.success("Enviamos um novo código para o seu e-mail.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível reenviar o código.");
    } finally {
      setReenviando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b1220] px-4">
      <div className="w-full max-w-sm">
        <img src={logo} alt="Órbita" className="mx-auto mb-8 h-7 w-auto" />

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-[#1e2740] bg-[#12192b] p-6">
          <p className="text-sm text-[#9aa0b0]">
            Enviamos um código de verificação para{" "}
            {usuario ? <strong className="text-white">{usuario.email}</strong> : "o seu e-mail"}. Digite-o abaixo para confirmar
            sua conta.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="codigo">Código de verificação</Label>
            <Input
              id="codigo"
              required
              minLength={6}
              maxLength={8}
              autoComplete="one-time-code"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              className="text-center font-mono text-lg tracking-[0.4em] uppercase"
            />
          </div>
          <Button type="submit" disabled={loading} className="mt-2">
            {loading ? "Verificando..." : "Confirmar e-mail"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-[#9aa0b0]">
          Não recebeu o código?{" "}
          <button type="button" onClick={handleReenviar} disabled={reenviando} className="text-[#8b77ff] hover:underline disabled:opacity-50">
            {reenviando ? "Enviando..." : "Reenviar código"}
          </button>
        </p>

        <p className="mt-2 text-center text-sm text-[#9aa0b0]">
          <button type="button" onClick={() => navigate({ to: destino })} className="hover:underline">
            Verificar depois
          </button>
        </p>
      </div>
    </div>
  );
}
