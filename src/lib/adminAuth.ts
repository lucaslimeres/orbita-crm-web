/** Lê direto do localStorage — mesmo padrão de `lib/auth.ts`, mas na chave exclusiva do admin. */
export function getStoredAdminAccessToken(): string | null {
  try {
    const raw = localStorage.getItem("orbita-admin-auth");
    if (!raw) return null;
    return JSON.parse(raw)?.state?.accessToken ?? null;
  } catch {
    return null;
  }
}
