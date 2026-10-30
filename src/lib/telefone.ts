/** Só os dígitos — é assim que a API grava o telefone (DDD + número). */
export function soDigitosTelefone(valor: string): string {
  return valor.replace(/\D/g, "").slice(0, 11);
}

/**
 * Máscara enquanto digita: (00) 0000-0000 ou (00) 00000-0000. Qualquer caractere que não
 * seja número é descartado, então o campo nunca aceita letras.
 */
export function mascararTelefone(valor: string): string {
  const d = soDigitosTelefone(valor);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Vazio (sem telefone) ou DDD + número com 10/11 dígitos — a API valida de novo. */
export function isTelefoneValido(valor: string): boolean {
  const d = soDigitosTelefone(valor);
  return d.length === 0 || d.length === 10 || d.length === 11;
}
