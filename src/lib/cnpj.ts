/**
 * Só os caracteres válidos, em maiúsculas: até 12 letras/números + 2 dígitos verificadores
 * (CNPJ alfanumérico, IN RFB nº 2.229/2024 — o só numérico continua igual). Qualquer outro
 * caractere é descartado, e letras nas 2 últimas posições também.
 */
export function limparCnpj(valor: string): string {
  let out = "";
  for (const c of valor.toUpperCase()) {
    if (out.length < 12 ? /[0-9A-Z]/.test(c) : /\d/.test(c)) out += c;
    if (out.length === 14) break;
  }
  return out;
}

/** Máscara 00.000.000/0000-00 enquanto digita (ou cola) — aceita com ou sem pontuação. */
export function mascararCnpj(valor: string): string {
  const v = limparCnpj(valor);
  const partes = [v.slice(0, 2), v.slice(2, 5), v.slice(5, 8), v.slice(8, 12), v.slice(12, 14)];
  let out = partes[0];
  if (partes[1]) out += `.${partes[1]}`;
  if (partes[2]) out += `.${partes[2]}`;
  if (partes[3]) out += `/${partes[3]}`;
  if (partes[4]) out += `-${partes[4]}`;
  return out;
}

/**
 * Dígitos verificadores (módulo 11, cada caractere vale o código ASCII − 48) — só para
 * avisar antes de enviar; a validação de verdade é da API (`cnpjSchema`).
 */
export function isCnpjValido(valor: string): boolean {
  const cnpj = limparCnpj(valor);
  if (!/^[0-9A-Z]{12}\d{2}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
  const valores = cnpj.split("").map((c) => c.charCodeAt(0) - 48);
  for (const tamanho of [12, 13]) {
    let soma = 0;
    let peso = 2;
    for (let i = tamanho - 1; i >= 0; i--) {
      soma += valores[i] * peso;
      peso = peso === 9 ? 2 : peso + 1;
    }
    const resto = soma % 11;
    if ((resto < 2 ? 0 : 11 - resto) !== valores[tamanho]) return false;
  }
  return true;
}
