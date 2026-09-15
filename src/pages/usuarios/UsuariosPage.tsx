import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { usuariosApi, type CreateUsuarioRequest } from "@/api/usuarios";
import { rolesApi } from "@/api/roles";
import { assinaturaApi } from "@/api/assinatura";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const emptyForm: CreateUsuarioRequest = { roleId: 0, nome: "", cpf: "", email: "", senha: "" };

export function UsuariosPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);

  const { data: usuarios = [] } = useQuery({ queryKey: ["usuarios"], queryFn: () => usuariosApi.list() });
  const { data: roles = [] } = useQuery({ queryKey: ["roles"], queryFn: () => rolesApi.list() });
  const { data: catalogoPermissoes = [] } = useQuery({ queryKey: ["roles", "permissoes"], queryFn: () => rolesApi.listPermissoesDisponiveis() });
  const { data: assinaturaData } = useQuery({ queryKey: ["assinatura"], queryFn: () => assinaturaApi.status() });

  const limiteUsuarios = assinaturaData?.limites.usuarios;
  const limiteAtingido = limiteUsuarios?.maximo != null && limiteUsuarios.atual >= limiteUsuarios.maximo;

  const createMutation = useMutation({
    mutationFn: (data: CreateUsuarioRequest) => usuariosApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      setForm(emptyForm);
      toast.success("Usuário criado. Repasse a senha para ele por fora do sistema.");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Não foi possível criar o usuário."),
  });

  const togglePermissionMutation = useMutation({
    mutationFn: ({ roleId, permissionCodes }: { roleId: number; permissionCodes: string[] }) => rolesApi.updatePermissions(roleId, permissionCodes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roles"] }),
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Não foi possível atualizar as permissões."),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.roleId) return toast.error("Selecione um perfil.");
    createMutation.mutate(form);
  }

  function togglePermission(roleId: number, code: string, current: string[]) {
    const next = current.includes(code) ? current.filter((c) => c !== code) : [...current, code];
    togglePermissionMutation.mutate({ roleId, permissionCodes: next });
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Usuários</h1>
          <p className="text-sm text-muted-foreground">Quem tem acesso à empresa e com qual perfil.</p>
        </div>
        {limiteUsuarios?.maximo != null && (
          <Badge variant={limiteAtingido ? "warning" : "outline"}>
            Plano Free · {limiteUsuarios.atual}/{limiteUsuarios.maximo} usuário{limiteUsuarios.maximo > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      <section className="flex flex-col gap-3">
        {limiteAtingido ? (
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
              <p className="text-sm text-muted-foreground">
                Você atingiu o limite de {limiteUsuarios?.maximo} usuário do plano Free. Faça upgrade para o PRO para adicionar mais.
              </p>
              <Button asChild>
                <Link to="/assinatura">Fazer upgrade para o PRO</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-5">
              <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 md:grid-cols-5">
                <div className="flex flex-col gap-1.5">
                  <Label>Nome</Label>
                  <Input required value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>CPF</Label>
                  <Input required value={form.cpf} onChange={(e) => setForm((f) => ({ ...f, cpf: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>E-mail</Label>
                  <Input type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Senha inicial</Label>
                  <Input type="password" required minLength={8} value={form.senha} onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Perfil</Label>
                  <Select value={form.roleId || ""} onChange={(e) => setForm((f) => ({ ...f, roleId: Number(e.target.value) }))}>
                    <option value="">Selecione</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nome}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="col-span-2 flex items-end md:col-span-5">
                  <Button type="submit" disabled={createMutation.isPending}>
                    Criar usuário
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>{roles.find((r) => r.id === u.roleId)?.nome ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={u.ativo ? "positive" : "outline"}>{u.ativo ? "Ativo" : "Inativo"}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium tracking-[0.02em] text-muted-foreground uppercase">Perfis e permissões</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {roles.map((role) => (
            <Card key={role.id}>
              <CardContent className="flex flex-col gap-3 pt-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{role.nome}</h3>
                  {role.isOwnerRole && <Badge>Acesso total</Badge>}
                </div>
                {role.isOwnerRole ? (
                  <p className="text-sm text-muted-foreground">O perfil Owner sempre tem acesso a tudo e não pode ser editado.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {catalogoPermissoes.map((perm) => (
                      <label key={perm.code} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={role.permissions.includes(perm.code)}
                          onChange={() => togglePermission(role.id, perm.code, role.permissions)}
                        />
                        {perm.descricao}
                      </label>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
