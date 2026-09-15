/**
 * Tokenização de cartão direto no navegador — o número/CVV vão para o Pagar.me, nunca
 * para a nossa API. Ver docs/assinatura.md (repo de contexto) para o fluxo completo.
 * Token tem 60s de validade e uso único.
 */
export interface CardInput {
  number: string;
  holderName: string;
  expMonth: string;
  expYear: string;
  cvv: string;
}

export async function tokenizeCard(card: CardInput): Promise<string> {
  const publicKey = import.meta.env.VITE_PAGARME_PUBLIC_KEY;
  if (!publicKey) throw new Error("VITE_PAGARME_PUBLIC_KEY não configurada.");

  const res = await fetch(`https://api.pagar.me/core/v5/tokens?appId=${publicKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "card",
      card: {
        number: card.number.replace(/\s/g, ""),
        holder_name: card.holderName,
        exp_month: card.expMonth,
        exp_year: card.expYear,
        cvv: card.cvv,
      },
    }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.message ?? "Não foi possível validar o cartão.");
  }

  const data = await res.json();
  return data.id as string;
}
