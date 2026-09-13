import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { authApi } from "@/api/auth";
import { ApiError } from "@/lib/api";
import { useAuthStore } from "@/stores/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/orbita-lockup-branco.svg";

export function SignupPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    razaoSocial: "",
    nomeFantasia: "",
    cnpj: "",
    empresaEmail: "",
    nome: "",
    cpf: "",
    email: "",
    senha: "",
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await authApi.signup({
        empresa: {
          razaoSocial: form.razaoSocial,
          nomeFantasia: form.nomeFantasia,
          cnpj: form.cnpj || null,
          email: form.empresaEmail,
        },
        responsavel: { nome: form.nome, cpf: form.cpf, email: form.email, senha: form.senha },
      });
      setSession({ usuario: result.usuario, empresa: result.empresa, accessToken: result.accessToken });
      toast.success("Empresa criada com sucesso!");
      navigate({ to: "/financeiro" });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível criar a conta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b1220] px-4 py-10">
      <div className="w-full max-w-md">
        <img src={logo} alt="Órbita" className="mx-auto mb-8 h-7 w-auto" />

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 rounded-lg border border-[#1e2740] bg-[#12192b] p-6">
          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium tracking-[0.12em] text-[#9aa0b0] uppercase">Empresa</p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="razaoSocial">Razão social</Label>
              <Input id="razaoSocial" required value={form.razaoSocial} onChange={(e) => set("razaoSocial", e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nomeFantasia">Nome fantasia</Label>
              <Input id="nomeFantasia" required value={form.nomeFantasia} onChange={(e) => set("nomeFantasia", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cnpj">CNPJ (opcional)</Label>
                <Input id="cnpj" value={form.cnpj} onChange={(e) => set("cnpj", e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="empresaEmail">E-mail da empresa</Label>
                <Input id="empresaEmail" type="email" required value={form.empresaEmail} onChange={(e) => set("empresaEmail", e.target.value)} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-[#1e2740] pt-4">
            <p className="text-xs font-medium tracking-[0.12em] text-[#9aa0b0] uppercase">Responsável (você)</p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nome">Nome completo</Label>
              <Input id="nome" required value={form.nome} onChange={(e) => set("nome", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cpf">CPF</Label>
                <Input id="cpf" required value={form.cpf} onChange={(e) => set("cpf", e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="senha">Senha</Label>
              <Input id="senha" type="password" required minLength={8} value={form.senha} onChange={(e) => set("senha", e.target.value)} />
            </div>
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? "Criando..." : "Criar empresa"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-[#9aa0b0]">
          Já tem conta?{" "}
          <Link to="/login" className="text-[#8b77ff] hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
