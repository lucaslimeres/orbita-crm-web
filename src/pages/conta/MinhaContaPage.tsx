import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { authApi } from "@/api/auth";
import { ApiError } from "@/lib/api";
import { useAuthStore } from "@/stores/useAuthStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mascararCpf } from "@/lib/cpf";
import { isTelefoneValido, mascararTelefone, soDigitosTelefone } from "@/lib/telefone";

function formatarCnpj(cnpj: string): string {
  const d = cnpj.replace(/\D/g, "");
  return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : cnpj;
}

/** Telefone gravado antes da validação pode ter texto livre — aí mostra como está. */
function formatarTelefone(telefone: string | null | undefined): string {
  if (!telefone) return "";
  return /^\d{10,11}$/.test(telefone) ? mascararTelefone(telefone) : telefone;
}

const senhaVazia = { senhaAtual: "", novaSenha: "", confirmacao: "" };

export function MinhaContaPage() {
  const usuario = useAuthStore((s) => s.usuario);
  const setUsuario = useAuthStore((s) => s.setUsuario);
  const [dados, setDados] = useState({ nome: usuario?.nome ?? "", telefone: formatarTelefone(usuario?.telefone) });

  // Mesma query do AppLayout — traz a empresa completa (a sessão salva no login nem sempre tem).
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => authApi.me(), staleTime: 30_000 });
  const empresa = me?.empresa;
  const [senha, setSenha] = useState(senhaVazia);

  const dadosMutation = useMutation({
    mutationFn: () => authApi.updateMe({ nome: dados.nome.trim(), telefone: soDigitosTelefone(dados.telefone) || null }),
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

  const dadosAlterados =
    dados.nome.trim() !== usuario.nome || (soDigitosTelefone(dados.telefone) || null) !== (soDigitosTelefone(usuario.telefone ?? "") || null);

  function handleSalvarDados(e: React.FormEvent) {
    e.preventDefault();
    if (!isTelefoneValido(dados.telefone)) return toast.error("Telefone inválido — informe DDD + número.");
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
                <Input id="cpf" value={mascararCpf(usuario.cpf)} disabled />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="(00) 00000-0000"
                  value={dados.telefone}
                  onChange={(e) => setDados((d) => ({ ...d, telefone: mascararTelefone(e.target.value) }))}
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

      {empresa && (
        <Card>
          <CardContent className="flex flex-col gap-4 pt-5">
            <div>
              <CardTitle className="text-base">Empresa</CardTitle>
              <CardDescription>Dados da empresa vinculada à sua conta.</CardDescription>
            </div>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
              <CampoEmpresa label="Razão social" valor={empresa.razaoSocial} />
              <CampoEmpresa label="Nome fantasia" valor={empresa.nomeFantasia} />
              <CampoEmpresa label="CNPJ" valor={empresa.cnpj ? formatarCnpj(empresa.cnpj) : null} />
              <CampoEmpresa label="E-mail" valor={empresa.email} />
              <CampoEmpresa label="Telefone" valor={formatarTelefone(empresa.telefone) || null} />
              <CampoEmpresa label="Endereço" valor={empresa.endereco} />
            </dl>
          </CardContent>
        </Card>
      )}

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

function CampoEmpresa({ label, valor }: { label: string; valor: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={valor ? "" : "text-muted-foreground"}>{valor || "Não informado"}</dd>
    </div>
  );
}
