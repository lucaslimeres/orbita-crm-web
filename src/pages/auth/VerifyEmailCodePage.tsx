import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { authApi } from "@/api/auth";
import { ApiError } from "@/lib/api";
import { useAuthStore } from "@/stores/useAuthStore";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/orbita-lockup-branco.svg";

export function VerifyEmailCodePage() {
  const navigate = useNavigate();
  const usuario = useAuthStore((s) => s.usuario);
  const assinatura = useAuthStore((s) => s.assinatura);
  const logout = useAuthStore((s) => s.logout);
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);
  const [reenviando, setReenviando] = useState(false);

  // PRO escolhido no cadastro mas ainda não pago vai direto pra tela de assinatura;
  // o resto (Free, ou PRO já ativo) vai pro dashboard normalmente.
  const irParaDestino = () =>
    assinatura?.plano === "pro" && assinatura.status !== "ativa"
      ? navigate({ to: "/assinatura", search: { pagar: true } })
      : navigate({ to: "/financeiro" });

  // Quem já confirmou o e-mail (ex.: voltou pra esta URL) segue direto.
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => authApi.me() });
  const jaVerificado = !!me?.usuario.emailVerificadoEm;
  useEffect(() => {
    if (jaVerificado) irParaDestino();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reage à verificação
  }, [jaVerificado]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.verifyEmailCode(codigo);
      // Descarta (não só invalida) o `/me` em cache: invalidar mantém o dado antigo até o
      // refetch, e o AppLayout veria "e-mail pendente" e mandaria de volta pra cá.
      queryClient.removeQueries({ queryKey: ["me"] });
      toast.success("E-mail verificado com sucesso!");
      irParaDestino();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Código inválido.");
    } finally {
      setLoading(false);
    }
  }

  function handleSair() {
    logout();
    queryClient.clear();
    navigate({ to: "/login" });
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
            sua conta e liberar o acesso ao Órbita.
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

        {/* Sem "verificar depois": o sistema fica bloqueado até confirmar o e-mail. "Sair"
            evita deixar quem não tem acesso ao e-mail preso nesta tela. */}
        <p className="mt-2 text-center text-sm text-[#9aa0b0]">
          <button type="button" onClick={handleSair} className="hover:underline">
            Sair
          </button>
        </p>
      </div>
    </div>
  );
}
