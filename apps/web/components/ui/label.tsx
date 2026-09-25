import { cn } from "@/lib/utils";

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("text-[11px] uppercase tracking-wider text-muted-foreground", className)} {...props} />;
}
