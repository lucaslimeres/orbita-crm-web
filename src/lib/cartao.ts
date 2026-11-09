/**
 * Máscaras e validação do formulário de cartão. Tudo isso roda só no navegador: o cartão
 * vai direto para o Pagar.me (lib/pagarme.ts) e nunca passa pela nossa API. Servem para
 * barrar erro de digitação antes de gastar uma tokenização — quem decide se o cartão é
 * válido de verdade é o Pagar.me.
 */

/** Só dígitos, até 19 (cartões vão de 13 a 19), em grupos de 4: "0000 0000 0000 0000". */
export function mascararNumeroCartao(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 19);
  return d.replace(/(\d{4})(?=\d)/g, "$1 ");
}

/** Nome impresso: só letras (com acento) e espaços, em maiúsculas, até 26 caracteres. */
export function limparNomeCartao(valor: string): string {
  return valor.replace(/[^A-Za-zÀ-ÿ\s]/g, "").replace(/\s{2,}/g, " ").toUpperCase().slice(0, 26);
}

/** Só dígitos, com limite de tamanho (mês/ano: 2, CVV: 4). */
export function soDigitos(valor: string, max: number): string {
  return valor.replace(/\D/g, "").slice(0, max);
}

/** Dígito verificador do número do cartão (algoritmo de Luhn). */
function luhnValido(numero: string): boolean {
  let soma = 0;
  let dobrar = false;
  for (let i = numero.length - 1; i >= 0; i--) {
    let d = Number(numero[i]);
    if (dobrar) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    soma += d;
    dobrar = !dobrar;
  }
  return soma % 10 === 0;
}

export interface CartaoForm {
  number: string;
  holderName: string;
  expMonth: string;
  expYear: string;
  cvv: string;
}

/** Primeira mensagem de erro do formulário, ou `null` se estiver tudo certo. */
export function validarCartao(cartao: CartaoForm, hoje: Date = new Date()): string | null {
  const numero = cartao.number.replace(/\D/g, "");
  if (numero.length < 13 || numero.length > 19) return "Número do cartão incompleto.";
  if (!luhnValido(numero)) return "Número do cartão inválido. Confira os dígitos.";

  if (cartao.holderName.trim().length < 2) return "Informe o nome impresso no cartão.";

  const mes = Number(cartao.expMonth);
  if (cartao.expMonth.length !== 2 || mes < 1 || mes > 12) return "Mês de validade inválido (01 a 12).";
  if (cartao.expYear.length !== 2) return "Ano de validade inválido (use 2 dígitos, ex.: 30).";
  const ano = 2000 + Number(cartao.expYear);
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth() + 1;
  if (ano < anoAtual || (ano === anoAtual && mes < mesAtual)) return "Cartão vencido.";

  if (cartao.cvv.length < 3) return "CVV inválido (3 ou 4 dígitos).";
  return null;
}
