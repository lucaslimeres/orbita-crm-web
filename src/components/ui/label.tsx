import * as React from "react";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("text-xs font-medium tracking-[0.02em] text-muted-foreground", className)} {...props} />;
}
