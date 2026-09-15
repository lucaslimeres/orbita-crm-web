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
}

export interface Fatura {
  id: number;
  competencia: string;
  valorCentavos: number;
  formaPagamento: FormaPagamento;
  status: FaturaStatus;
  pixQrCode: string | null;
  pixCopiaCola: string | null;
  pixExpiraEm: string | null;
  pagoEm: string | null;
  createdAt: string;
}

export interface AssinaturaComFaturas {
  assinatura: Assinatura;
  faturas: Fatura[];
}

export const assinaturaApi = {
  status: () => api.get<AssinaturaComFaturas>("/assinatura"),
  checkoutCartao: (cardToken: string) => api.post<Assinatura>("/assinatura/cartao", { cardToken }),
  gerarPix: () => api.post<Fatura>("/assinatura/pix"),
  verificarFatura: (id: number) => api.post<Fatura>(`/assinatura/faturas/${id}/verificar`),
};
