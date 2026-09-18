import { useAuthStore } from "@/stores/useAuthStore";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function getAccessToken(): string | null {
  try {
    const raw = localStorage.getItem("orbita-auth");
    if (!raw) return null;
    return JSON.parse(raw)?.state?.accessToken ?? null;
  } catch {
    return null;
  }
}

/**
 * Sem refresh token na v1 (ver api/README.md — "Simplificações desta v1"): um 401 aqui
 * significa sessão expirada/inválida, então só desloga.
 */
async function request<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 401 && !path.startsWith("/auth/")) {
    useAuthStore.getState().logout();
  }

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    let data: unknown;
    try {
      data = await res.json();
      // Erro de negócio (`throw new Error(...)` nos services): `{ message }`.
      // Falha de validação Zod (`schema.parse`): `{ errors: [{ message, path, ... }] }`,
      // sem `message` no topo — sem isso, cai no fallback genérico "HTTP 400".
      const body = data as { message?: string; errors?: Array<{ message?: string; path?: (string | number)[] }> };
      if (body?.message) {
        message = body.message;
      } else if (Array.isArray(body?.errors) && body.errors.length > 0) {
        message = body.errors
          .map((e) => (e.path?.length ? `${e.path.join(".")}: ${e.message}` : e.message))
          .filter(Boolean)
          .join(" | ");
      }
    } catch {
      // corpo vazio ou não-JSON
    }
    throw new ApiError(res.status, message, data);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};
