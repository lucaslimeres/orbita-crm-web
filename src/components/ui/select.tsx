import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Select nativo estilizado — v1 usa <select> do browser em vez do Radix Select para
 * manter o número de dependências/arquivos baixo. Trocar por Radix é reversível e
 * isolado a este arquivo caso a UI precise de mais controle visual no futuro.
 */
export function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
