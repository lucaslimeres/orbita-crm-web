import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", {
  variants: {
    variant: {
      default: "bg-accent text-accent-foreground",
      positive: "bg-[color-mix(in_srgb,var(--positive)_15%,transparent)] text-positive",
      negative: "bg-[color-mix(in_srgb,var(--negative)_15%,transparent)] text-negative",
      warning: "bg-[color-mix(in_srgb,var(--warning)_15%,transparent)] text-warning",
      outline: "border border-border text-muted-foreground",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface BadgeProps extends React.ComponentProps<"span">, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
