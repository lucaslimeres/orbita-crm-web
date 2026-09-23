import { useEffect, useRef } from "react";
import { getStoredAccessToken } from "@/lib/auth";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const WS_BASE_URL = API_URL.replace(/^http/, "ws");

interface AssinaturaEvento {
  type: "fatura.paga";
  faturaId: number;
}

/**
 * Conecta em `/ws/assinatura` (autenticado via JWT na query string — o `WebSocket`
 * nativo não permite header `Authorization` no handshake) só enquanto `enabled` for
 * true, e chama `onFaturaPaga` quando o webhook do Pagar.me confirma um PIX. Sem
 * reconexão automática — se a conexão cair, o botão "Já paguei, verificar" continua
 * funcionando como fallback. Ver docs/assinatura.md.
 */
export function useAssinaturaSocket(onFaturaPaga: (faturaId: number) => void, enabled: boolean): void {
  const callbackRef = useRef(onFaturaPaga);
  callbackRef.current = onFaturaPaga;

  useEffect(() => {
    if (!enabled) return;
    const token = getStoredAccessToken();
    if (!token) return;

    const socket = new WebSocket(`${WS_BASE_URL}/ws/assinatura?token=${encodeURIComponent(token)}`);

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as AssinaturaEvento;
        if (data.type === "fatura.paga") callbackRef.current(data.faturaId);
      } catch {
        // mensagem inesperada — ignora
      }
    };

    return () => socket.close();
  }, [enabled]);
}
