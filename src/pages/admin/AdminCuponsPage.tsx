import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { adminPanelApi, type CupomAdmin, type CupomAdminInput } from "@/api/admin";
import { AdminApiError } from "@/lib/adminApi";
import { formatDateOnly, formatDescontoCupom, reaisParaCentavos } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/** Estado do formulário — números como texto, convertidos só no envio. */
interface CupomForm {
  codigo: string;
  tipo: CupomAdmin["tipo"];
  /** Reais ("10,00") para valor fixo; inteiro ("10") para percentual. */
  valor: string;
  paraSempre: boolean;
  duracaoUsos: string;
  expiraEm: string;
  limiteClientes: string;
  ativo: boolean;
}

const FORM_VAZIO: CupomForm = {
  codigo: "",
  tipo: "percentual",
  valor: "",
  paraSempre: false,
  duracaoUsos: "1",
  expiraEm: "",
  limiteClientes: "",
  ativo: true,
};

function formDoCupom(c: CupomAdmin): CupomForm {
  return {
    codigo: c.codigo,
    tipo: c.tipo,
    valor: c.tipo === "valor_fixo" ? (c.valor / 100).toFixed(2).replace(".", ",") : String(c.valor),
    paraSempre: c.duracaoUsos === null,
    duracaoUsos: c.duracaoUsos === null ? "1" : String(c.duracaoUsos),
    expiraEm: c.expiraEm ? c.expiraEm.slice(0, 10) : "",
    limiteClientes: c.limiteClientes === null ? "" : String(c.limiteClientes),
    ativo: c.ativo,
  };
}

/** `null` (com aviso) se algo estiver inválido; a API valida de novo. */
function paraInput(form: CupomForm): CupomAdminInput | null {
  const erro = (msg: string) => (toast.error(msg), null);
  if (!/^[A-Z0-9_-]{3,40}$/.test(form.codigo)) return erro("Código: de 3 a 40 letras, números, hífen ou sublinhado.");
  const valor = form.tipo === "valor_fixo" ? reaisParaCentavos(form.valor) : Number(form.valor);
  if (!Number.isInteger(valor) || valor <= 0) return erro("Informe o valor do desconto.");
  if (form.tipo === "percentual" && valor > 100) return erro("O desconto percentual deve ser de 1% a 100%.");
  const duracaoUsos = form.paraSempre ? null : Number(form.duracaoUsos);
  if (duracaoUsos !== null && (!Number.isInteger(duracaoUsos) || duracaoUsos < 1)) return erro("A quantidade de usos deve ser pelo menos 1.");
  const limiteClientes = form.limiteClientes.trim() ? Number(form.limiteClientes) : null;
  if (limiteClientes !== null && (!Number.isInteger(limiteClientes) || limiteClientes < 1)) return erro("O limite de clientes deve ser pelo menos 1.");
  return { codigo: form.codigo, tipo: form.tipo, valor, duracaoUsos, expiraEm: form.expiraEm || null, limiteClientes, ativo: form.ativo };
}

/** Cupons de desconto da mensalidade PRO — ver docs/assinatura.md ("Cupom de desconto"). */
export function AdminCuponsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<CupomAdmin | null>(null);
  const [form, setForm] = useState<CupomForm>(FORM_VAZIO);

  const { data: cupons = [], isLoading } = useQuery({ queryKey: ["admin", "cupons"], queryFn: () => adminPanelApi.listCupons() });
  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["admin", "cupons"] });

  const salvarMutation = useMutation({
    mutationFn: (data: CupomAdminInput) => (editando ? adminPanelApi.updateCupom(editando.id, data) : adminPanelApi.createCupom(data)),
    onSuccess: () => {
      invalidar();
      setDialogOpen(false);
      toast.success(editando ? "Cupom atualizado." : "Cupom criado.");
    },
    onError: (error) => toast.error(error instanceof AdminApiError ? error.message : "Não foi possível salvar o cupom."),
  });

  const toggleMutation = useMutation({
    mutationFn: (c: CupomAdmin) => adminPanelApi.updateCupom(c.id, { ativo: !c.ativo }),
    onSuccess: (c) => {
      invalidar();
      toast.success(c.ativo ? "Cupom ativado." : "Cupom desativado.");
    },
    onError: (error) => toast.error(error instanceof AdminApiError ? error.message : "Não foi possível alterar o cupom."),
  });

  function abrir(cupom: CupomAdmin | null) {
    setEditando(cupom);
    setForm(cupom ? formDoCupom(cupom) : FORM_VAZIO);
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = paraInput(form);
    if (data) salvarMutation.mutate(data);
  }

  function desativar(c: CupomAdmin) {
    const aviso =
      c.duracaoUsos === null
        ? `Desativar ${c.codigo}? É um cupom "para sempre": quem usa perde o desconto já na próxima mensalidade.`
        : `Desativar ${c.codigo}? Novos clientes não poderão aplicar; quem já aplicou continua com os usos restantes.`;
    if (window.confirm(aviso)) toggleMutation.mutate(c);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Cupons de desconto</h1>
          <p className="text-sm text-muted-foreground">Desconto na mensalidade do PRO, aplicado pelo cliente ao assinar ou regularizar.</p>
        </div>
        <Button onClick={() => abrir(null)}>
          <Plus className="size-4" /> Novo cupom
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Desconto</TableHead>
              <TableHead>Duração</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead>Clientes</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && cupons.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Nenhum cupom criado ainda.
                </TableCell>
              </TableRow>
            )}
            {cupons.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-numeric font-medium">{c.codigo}</TableCell>
                <TableCell>{formatDescontoCupom(c)}</TableCell>
                <TableCell>{c.duracaoUsos === null ? "Para sempre" : `${c.duracaoUsos} mensalidade${c.duracaoUsos > 1 ? "s" : ""}`}</TableCell>
                <TableCell className="text-muted-foreground">{c.expiraEm ? `até ${formatDateOnly(c.expiraEm)}` : "Sem data"}</TableCell>
                <TableCell className="font-numeric">
                  {c.clientes}
                  {c.limiteClientes !== null && ` / ${c.limiteClientes}`}
                </TableCell>
                <TableCell>
                  <Badge variant={c.ativo ? "positive" : "outline"}>{c.ativo ? "Ativo" : "Inativo"}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" title="Editar" onClick={() => abrir(c)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={toggleMutation.isPending}
                      onClick={() => (c.ativo ? desativar(c) : toggleMutation.mutate(c))}
                    >
                      {c.ativo ? "Desativar" : "Ativar"}
                    </Button>
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
            <DialogTitle>{editando ? `Editar ${editando.codigo}` : "Novo cupom"}</DialogTitle>
            {editando && editando.clientes > 0 && (
              <DialogDescription>
                Mudanças de desconto e duração valem só para quem aplicar daqui em diante — os {editando.clientes} cliente(s) que já
                aplicaram mantêm o que receberam.
              </DialogDescription>
            )}
          </DialogHeader>
          <form onSubmit={handleSubmit} noValidate className="grid grid-cols-2 gap-4">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="cupom-codigo">Código</Label>
              <Input
                id="cupom-codigo"
                placeholder="EX.: BEMVINDO10"
                value={form.codigo}
                onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cupom-tipo">Tipo</Label>
              <Select id="cupom-tipo" value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as CupomForm["tipo"], valor: "" }))}>
                <option value="percentual">Porcentagem (%)</option>
                <option value="valor_fixo">Valor fixo (R$)</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cupom-valor">{form.tipo === "percentual" ? "Desconto (%)" : "Desconto (R$)"}</Label>
              <Input
                id="cupom-valor"
                inputMode={form.tipo === "percentual" ? "numeric" : "decimal"}
                placeholder={form.tipo === "percentual" ? "10" : "10,00"}
                value={form.valor}
                onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value.replace(f.tipo === "percentual" ? /\D/g : /[^\d.,]/g, "") }))}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-2">
              <Label>Duração</Label>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input type="radio" name="duracao" checked={!form.paraSempre} onChange={() => setForm((f) => ({ ...f, paraSempre: false }))} />
                  <Input
                    aria-label="Quantidade de mensalidades"
                    className="w-20"
                    inputMode="numeric"
                    value={form.duracaoUsos}
                    disabled={form.paraSempre}
                    onChange={(e) => setForm((f) => ({ ...f, duracaoUsos: e.target.value.replace(/\D/g, "") }))}
                  />
                  mensalidade(s)
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="duracao" checked={form.paraSempre} onChange={() => setForm((f) => ({ ...f, paraSempre: true }))} />
                  Para sempre
                </label>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cupom-expira">Válido até (opcional)</Label>
              <Input id="cupom-expira" type="date" value={form.expiraEm} onChange={(e) => setForm((f) => ({ ...f, expiraEm: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cupom-limite">Limite de clientes (opcional)</Label>
              <Input
                id="cupom-limite"
                inputMode="numeric"
                placeholder="Sem limite"
                value={form.limiteClientes}
                onChange={(e) => setForm((f) => ({ ...f, limiteClientes: e.target.value.replace(/\D/g, "") }))}
              />
            </div>
            <p className="col-span-2 text-xs text-muted-foreground">
              Data e limite só barram novos clientes. Desativar um cupom com número de mensalidades mantém os usos de quem já aplicou; um
              cupom "para sempre" desativado acaba na próxima mensalidade.
            </p>
            <div className="col-span-2 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvarMutation.isPending}>
                {salvarMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
