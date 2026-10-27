import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { authApi } from "@/api/auth";
import { ApiError } from "@/lib/api";
import { useAuthStore } from "@/stores/useAuthStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function formatarCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, "");
  return d.length === 11 ? d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4") : cpf;
}

const senhaVazia = { senhaAtual: "", novaSenha: "", confirmacao: "" };

export function MinhaContaPage() {
  const usuario = useAuthStore((s) => s.usuario);
  const setUsuario = useAuthStore((s) => s.setUsuario);
  const [dados, setDados] = useState({ nome: usuario?.nome ?? "", telefone: usuario?.telefone ?? "" });
  const [senha, setSenha] = useState(senhaVazia);

  const dadosMutation = useMutation({
    mutationFn: () => authApi.updateMe({ nome: dados.nome.trim(), telefone: dados.telefone.trim() || null }),
    onSuccess: ({ usuario: atualizado }) => {
      setUsuario(atualizado);
      toast.success("Dados atualizados.");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Não foi possível salvar seus dados."),
  });

  const senhaMutation = useMutation({
    mutationFn: () => authApi.changePassword(senha.senhaAtual, senha.novaSenha),
    onSuccess: () => {
      setSenha(senhaVazia);
      toast.success("Senha alterada com sucesso.");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Não foi possível alterar a senha."),
  });

  if (!usuario) return null;

  const dadosAlterados = dados.nome.trim() !== usuario.nome || (dados.telefone.trim() || null) !== usuario.telefone;

  function handleSalvarDados(e: React.FormEvent) {
    e.preventDefault();
    dadosMutation.mutate();
  }

  function handleTrocarSenha(e: React.FormEvent) {
    e.preventDefault();
    if (senha.novaSenha.length < 8) return toast.error("A nova senha deve ter pelo menos 8 caracteres.");
    if (senha.novaSenha !== senha.confirmacao) return toast.error("A confirmação não confere com a nova senha.");
    senhaMutation.mutate();
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Minha conta</h1>
        <p className="text-sm text-muted-foreground">Seus dados de acesso ao Órbita.</p>
      </div>

      <Card>
        <CardContent className="pt-5">
          <form onSubmit={handleSalvarDados} className="flex flex-col gap-4">
            <div>
              <CardTitle className="text-base">Dados pessoais</CardTitle>
              <CardDescription>E-mail e CPF identificam sua conta e não podem ser alterados por aqui.</CardDescription>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="nome">Nome completo</Label>
                <Input id="nome" required minLength={2} value={dados.nome} onChange={(e) => setDados((d) => ({ ...d, nome: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" value={usuario.email} disabled />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cpf">CPF</Label>
                <Input id="cpf" value={formatarCpf(usuario.cpf)} disabled />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={dados.telefone}
                  onChange={(e) => setDados((d) => ({ ...d, telefone: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Button type="submit" disabled={!dadosAlterados || dadosMutation.isPending}>
                {dadosMutation.isPending ? "Salvando..." : "Salvar dados"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <form onSubmit={handleTrocarSenha} className="flex flex-col gap-4">
            <div>
              <CardTitle className="text-base">Alterar senha</CardTitle>
              <CardDescription>Informe a senha atual e escolha uma nova, com pelo menos 8 caracteres.</CardDescription>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="senhaAtual">Senha atual</Label>
                <Input
                  id="senhaAtual"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={senha.senhaAtual}
                  onChange={(e) => setSenha((s) => ({ ...s, senhaAtual: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="novaSenha">Nova senha</Label>
                <Input
                  id="novaSenha"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={senha.novaSenha}
                  onChange={(e) => setSenha((s) => ({ ...s, novaSenha: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirmacao">Confirmar nova senha</Label>
                <Input
                  id="confirmacao"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={senha.confirmacao}
                  onChange={(e) => setSenha((s) => ({ ...s, confirmacao: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Button type="submit" disabled={senhaMutation.isPending}>
                {senhaMutation.isPending ? "Alterando..." : "Alterar senha"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
