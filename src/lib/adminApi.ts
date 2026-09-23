import { useAdminAuthStore } from "@/stores/useAdminAuthStore";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export class AdminApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

/**
 * Client HTTP próprio do painel admin — lê o token de `orbita-admin-auth`, nunca de
 * `orbita-auth` (sessão de usuário comum, ver `lib/api.ts`). Deliberadamente um arquivo
 * separado, não uma opção no client existente, pra não ter nenhum caminho de código
 * onde os dois tokens possam se misturar por engano. Ver docs/admin.md.
 */
function getAdminAccessToken(): string | null {
  try {
    const raw = localStorage.getItem("orbita-admin-auth");
    if (!raw) return null;
    return JSON.parse(raw)?.state?.accessToken ?? null;
  } catch {
    return null;
  }
}

async function request<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
  const token = getAdminAccessToken();
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 401 && !path.startsWith("/admin/login")) {
    useAdminAuthStore.getState().logout();
  }

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    let data: unknown;
    try {
      data = await res.json();
      const body = data as { message?: string; errors?: Array<{ message?: string; path?: (string | number)[] }> };
      if (body?.message) {
        message = body.message;
      } else if (Array.isArray(body?.errors) && body.errors.length > 0) {
        message = body.errors.map((e) => (e.path?.length ? `${e.path.join(".")}: ${e.message}` : e.message)).filter(Boolean).join(" | ");
      }
    } catch {
      // corpo vazio ou não-JSON
    }
    throw new AdminApiError(res.status, message, data);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const adminApi = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};
