/** Lê direto do localStorage — não depende do timing de hidratação do Zustand. */
export function getStoredAccessToken(): string | null {
  try {
    const raw = localStorage.getItem("orbita-auth");
    if (!raw) return null;
    return JSON.parse(raw)?.state?.accessToken ?? null;
  } catch {
    return null;
  }
}
