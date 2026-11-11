import { api } from "@/lib/api";

export type AssinaturaStatus = "sem_assinatura" | "ativa" | "atrasada" | "cancelada";
export type FormaPagamento = "cartao" | "pix";
export type FaturaStatus = "pendente" | "paga" | "falhou" | "expirada";

export interface Assinatura {
  id: number;
  plano: string;
  valorCentavos: number;
  formaPagamento: FormaPagamento | null;
  status: AssinaturaStatus;
  cartaoFinal: string | null;
  cartaoBandeira: string | null;
  proximaCobranca: string | null;
  /** Falhas consecutivas de cobrança no cartão desde o último pagamento confirmado — zera a cada sucesso. */
  tentativasFalhaCartao: number;
}

export interface Fatura {
  id: number;
  competencia: string;
  /** Valor cobrado, já com o desconto do cupom. */
  valorCentavos: number;
  descontoCentavos: number;
  formaPagamento: FormaPagamento;
  status: FaturaStatus;
  pixQrCode: string | null;
  pixCopiaCola: string | null;
  pixExpiraEm: string | null;
  pagoEm: string | null;
  createdAt: string;
}

export interface LimiteUso {
  atual: number;
  /** `null` = ilimitado (PRO ativo). */
  maximo: number | null;
}

export interface AssinaturaComFaturas {
  assinatura: Assinatura;
  faturas: Fatura[];
  planoEfetivo: "free" | "pro";
  bloqueada: boolean;
  limites: {
    usuarios: LimiteUso;
    projetos: LimiteUso;
  };
  /** Cupom de desconto em uso pela empresa, se houver. */
  cupom: CupomAtivo | null;
}

export type CupomTipo = "valor_fixo" | "percentual";

export interface CupomAtivo {
  codigo: string;
  tipo: CupomTipo;
  /** valor_fixo: centavos; percentual: 1 a 99. */
  valor: number;
  /** `null` = para sempre. */
  usosRestantes: number | null;
}

export interface CupomPreview {
  codigo: string;
  tipo: CupomTipo;
  valor: number;
  /** `null` = para sempre. */
  duracaoUsos: number | null;
  valorOriginalCentavos: number;
  descontoCentavos: number;
  valorComDescontoCentavos: number;
}

export const assinaturaApi = {
  status: () => api.get<AssinaturaComFaturas>("/assinatura"),
  checkoutCartao: (cardToken: string, cupom?: string) => api.post<Assinatura>("/assinatura/cartao", { cardToken, cupom }),
  /** `cupom`: cupom novo nesta cobrança; `usarCupom`: usar o cupom já em uso nesta renovação. */
  gerarPix: (opcoes: { cupom?: string; usarCupom?: boolean } = {}) => api.post<Fatura>("/assinatura/pix", opcoes),
  validarCupom: (codigo: string) => api.post<CupomPreview>("/assinatura/cupom/validar", { codigo }),
  cancelarPro: () => api.post<AssinaturaComFaturas>("/assinatura/cancelar"),
  verificarFatura: (id: number) => api.post<Fatura>(`/assinatura/faturas/${id}/verificar`),
};
