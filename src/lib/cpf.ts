/** Máscara 000.000.000-00 enquanto digita — a API aceita com ou sem máscara e grava só os dígitos. */
export function mascararCpf(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}

/**
 * Dígitos verificadores do CPF — só pra avisar antes de enviar o formulário. A validação
 * de verdade é da API (`cpfSchema`), que recusa CPF inválido de qualquer jeito.
 */
export function isCpfValido(valor: string): boolean {
  const cpf = valor.replace(/\D/g, "");
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const digitos = cpf.split("").map(Number);
  for (const tamanho of [9, 10]) {
    const soma = digitos.slice(0, tamanho).reduce((acc, d, i) => acc + d * (tamanho + 1 - i), 0);
    const resto = (soma * 10) % 11;
    if ((resto === 10 ? 0 : resto) !== digitos[tamanho]) return false;
  }
  return true;
}
