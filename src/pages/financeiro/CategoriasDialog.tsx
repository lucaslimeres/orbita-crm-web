import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Lock, Trash2 } from "lucide-react";
import { financeiroApi, type CategoriaGasto } from "@/api/financeiro";
import { ApiError } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * "Gerenciar categorias" (modal, sem página própria): as padrão aparecem travadas; a empresa
 * cria e remove as suas. Remover não muda os gastos já lançados — a categoria deles fica como
 * estava. Ver docs/financeiro.md ("Categorias").
 */
export function CategoriasDialog({ open, onOpenChange, categorias }: { open: boolean; onOpenChange: (open: boolean) => void; categorias: CategoriaGasto[] }) {
  const queryClient = useQueryClient();
  const [nome, setNome] = useState("");

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["financeiro", "categorias"] });

  const criarMutation = useMutation({
    mutationFn: (n: string) => financeiroApi.createCategoria(n),
    onSuccess: (c) => {
      invalidar();
      setNome("");
      toast.success(`Categoria "${c.nome}" criada.`);
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Não foi possível criar a categoria."),
  });

  const removerMutation = useMutation({
    mutationFn: (id: number) => financeiroApi.deleteCategoria(id),
    onSuccess: () => {
      invalidar();
      toast.success("Categoria removida.");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Não foi possível remover a categoria."),
  });

  const proprias = categorias.filter((c) => !c.padrao);
  const padrao = categorias.filter((c) => c.padrao);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Categorias de gasto</DialogTitle>
          <DialogDescription>As categorias padrão valem para todos. As que você criar ficam só para a sua empresa.</DialogDescription>
        </DialogHeader>

        <form
          noValidate
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (nome.trim().length < 2) return toast.error("O nome deve ter pelo menos 2 caracteres.");
            criarMutation.mutate(nome.trim());
          }}
        >
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="nova-categoria">Nova categoria</Label>
            <Input id="nova-categoria" placeholder="Ex.: Freelancers" maxLength={100} value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <Button type="submit" disabled={criarMutation.isPending}>
            {criarMutation.isPending ? "Criando..." : "Adicionar"}
          </Button>
        </form>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium tracking-[0.02em] text-muted-foreground uppercase">Da sua empresa</p>
            {proprias.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma categoria criada ainda.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
                {proprias.map((c) => (
                  <li key={c.id} className="flex items-center justify-between px-3 py-1.5 text-sm">
                    {c.nome}
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Remover"
                      disabled={removerMutation.isPending && removerMutation.variables === c.id}
                      onClick={() => {
                        if (window.confirm(`Remover a categoria "${c.nome}"? Gastos já lançados nela continuam com essa categoria.`)) removerMutation.mutate(c.id!);
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium tracking-[0.02em] text-muted-foreground uppercase">Padrão</p>
            <div className="flex flex-wrap gap-1.5">
              {padrao.map((c) => (
                <Badge key={c.nome} variant="outline" className="gap-1">
                  <Lock className="size-3" />
                  {c.nome}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
