import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { authApi } from "@/api/auth";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/orbita-lockup-branco.svg";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      // A API sempre responde com sucesso genérico, exista ou não o e-mail — evita
      // revelar quais endereços estão cadastrados.
      setEnviado(true);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível enviar o e-mail de recuperação.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b1220] px-4">
      <div className="w-full max-w-sm">
        <img src={logo} alt="Órbita" className="mx-auto mb-8 h-7 w-auto" />

        {enviado ? (
          <div className="flex flex-col gap-4 rounded-lg border border-[#1e2740] bg-[#12192b] p-6 text-center">
            <p className="text-sm text-[#d7dae2]">
              Se <strong className="text-white">{email}</strong> estiver cadastrado, você vai receber um e-mail com um link para
              redefinir sua senha.
            </p>
            <p className="text-xs text-[#9aa0b0]">Não recebeu? Verifique a caixa de spam ou tente novamente em alguns minutos.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-[#1e2740] bg-[#12192b] p-6">
            <p className="text-sm text-[#9aa0b0]">
              Informe o e-mail cadastrado para receber um link de redefinição de senha.
            </p>
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
          Lembrou a senha?{" "}
          <Link to="/login" className="text-[#8b77ff] hover:underline">
            Voltar para o login
          </Link>
        </p>
      </div>
    </div>
  );
}
