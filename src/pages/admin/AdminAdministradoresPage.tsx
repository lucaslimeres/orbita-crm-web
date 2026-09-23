import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { adminPanelApi, type AdminAccount } from "@/api/admin";
import { AdminApiError } from "@/lib/adminApi";
import { useAdminAuthStore } from "@/stores/useAdminAuthStore";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const EMPTY_FORM = { nome: "", email: "", senha: "" };

export function AdminAdministradoresPage() {
  const queryClient = useQueryClient();
  const admin = useAdminAuthStore((s) => s.admin);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<AdminAccount | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: admins = [], isLoading } = useQuery({ queryKey: ["admin", "administradores"], queryFn: () => adminPanelApi.listAdmins() });

  function abrirCriacao() {
    setEditando(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function abrirEdicao(conta: AdminAccount) {
    setEditando(conta);
    setForm({ nome: conta.nome, email: conta.email, senha: "" });
    setDialogOpen(true);
  }

  const createMutation = useMutation({
    mutationFn: () => adminPanelApi.createAdmin({ nome: form.nome, email: form.email }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "administradores"] });
      setDialogOpen(false);
      toast.success("Administrador criado. Um e-mail de convite foi enviado para ele definir a senha.");
    },
    onError: (error) => toast.error(error instanceof AdminApiError ? error.message : "Não foi possível criar o administrador."),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editando) throw new Error("Nenhum administrador selecionado.");
      return adminPanelApi.updateAdmin(editando.id, {
        nome: form.nome,
        email: form.email,
        ...(form.senha ? { senha: form.senha } : {}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "administradores"] });
      setDialogOpen(false);
      toast.success("Administrador atualizado.");
    },
    onError: (error) => toast.error(error instanceof AdminApiError ? error.message : "Não foi possível atualizar o administrador."),
  });

  const toggleAtivoMutation = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => adminPanelApi.updateAdmin(id, { ativo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "administradores"] });
      toast.success("Status atualizado.");
    },
    onError: (error) => toast.error(error instanceof AdminApiError ? error.message : "Não foi possível atualizar o status."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminPanelApi.deleteAdmin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "administradores"] });
      toast.success("Administrador excluído.");
    },
    onError: (error) => toast.error(error instanceof AdminApiError ? error.message : "Não foi possível excluir o administrador."),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editando) updateMutation.mutate();
    else createMutation.mutate();
  }

  function handleDelete(conta: AdminAccount) {
    if (window.confirm(`Excluir o administrador "${conta.nome}"? Essa ação não pode ser desfeita.`)) {
      deleteMutation.mutate(conta.id);
    }
  }

  const salvando = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Administradores</h1>
          <p className="text-sm text-muted-foreground">Quem tem acesso a este painel. Sem hierarquia — todo admin tem acesso total.</p>
        </div>
        <Button onClick={abrirCriacao}>
          <Plus className="size-4" /> Novo administrador
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && admins.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Nenhum administrador cadastrado.
                </TableCell>
              </TableRow>
            )}
            {admins.map((conta) => (
              <TableRow key={conta.id}>
                <TableCell>
                  {conta.nome}
                  {conta.id === admin?.id && <span className="ml-1.5 text-xs text-muted-foreground">(você)</span>}
                </TableCell>
                <TableCell className="text-muted-foreground">{conta.email}</TableCell>
                <TableCell>
                  {!conta.confirmado ? (
                    <Badge variant="warning">Convidado</Badge>
                  ) : (
                    <Badge variant={conta.ativo ? "positive" : "outline"}>{conta.ativo ? "Ativo" : "Inativo"}</Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(conta.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-3">
                    <button type="button" className="text-sm text-primary hover:underline" onClick={() => abrirEdicao(conta)}>
                      Editar
                    </button>
                    <button
                      type="button"
                      className="text-sm text-primary hover:underline disabled:opacity-50"
                      disabled={toggleAtivoMutation.isPending}
                      onClick={() => toggleAtivoMutation.mutate({ id: conta.id, ativo: !conta.ativo })}
                    >
                      {conta.ativo ? "Desativar" : "Ativar"}
                    </button>
                    <button
                      type="button"
                      className="text-sm text-negative hover:underline disabled:opacity-50"
                      disabled={deleteMutation.isPending}
                      onClick={() => handleDelete(conta)}
                    >
                      Excluir
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando ? "Editar administrador" : "Novo administrador"}</DialogTitle>
            <DialogDescription>
              {editando ? "Deixe a senha em branco para manter a atual." : "Um e-mail de convite será enviado para ele definir a própria senha."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" required value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            {editando && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="senha">Nova senha (opcional)</Label>
                <Input
                  id="senha"
                  type="password"
                  minLength={8}
                  value={form.senha}
                  onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
                />
              </div>
            )}
            <Button type="submit" disabled={salvando} className="mt-2">
              {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Criar administrador"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
