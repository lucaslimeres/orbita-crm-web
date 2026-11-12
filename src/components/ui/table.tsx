import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Tabela padrão. No celular e no tablet (< 1024px), vira uma lista de cartões: cada linha é um bloco e cada
 * célula mostra "rótulo · valor", com o rótulo vindo do cabeçalho da coluna (CSS
 * `.tabela-cartoes` em index.css). Os rótulos são aplicados aqui, lendo os <th> e marcando
 * cada <td> com `data-label` — assim nenhuma tela precisa repetir o nome da coluna em cada
 * célula. `cartoes={false}` mantém a tabela com rolagem lateral.
 */
export function Table({ className, cartoes = true, ...props }: React.ComponentProps<"table"> & { cartoes?: boolean }) {
  const ref = React.useRef<HTMLTableElement>(null);

  React.useLayoutEffect(() => {
    const tabela = ref.current;
    if (!tabela || !cartoes) return;
    const rotular = () => {
      const cabecalhos: string[] = [];
      tabela.querySelectorAll("thead tr:first-child th").forEach((th) => {
        const span = (th as HTMLTableCellElement).colSpan || 1;
        for (let i = 0; i < span; i++) cabecalhos.push(th.textContent?.trim() ?? "");
      });
      tabela.querySelectorAll("tbody tr").forEach((tr) => {
        let coluna = 0;
        Array.from((tr as HTMLTableRowElement).cells).forEach((td) => {
          const span = td.colSpan || 1;
          const rotulo = span >= cabecalhos.length ? "" : (cabecalhos[coluna] ?? "");
          if (td.getAttribute("data-label") !== rotulo) td.setAttribute("data-label", rotulo);
          if (span >= cabecalhos.length) td.setAttribute("data-linha-inteira", "");
          coluna += span;
        });
      });
    };
    rotular();
    const observer = new MutationObserver(rotular);
    observer.observe(tabela, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [cartoes]);

  return (
    <div className="w-full overflow-x-auto">
      <table ref={ref} className={cn("w-full caption-bottom text-sm", cartoes && "tabela-cartoes", className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead className={cn("[&_tr]:border-b [&_tr]:border-border", className)} {...props} />;
}

export function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

export function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return <tr className={cn("border-b border-border transition-colors hover:bg-card", className)} {...props} />;
}

export function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      className={cn("h-10 px-3 text-left align-middle text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase", className)}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return <td className={cn("p-3 align-middle", className)} {...props} />;
}
