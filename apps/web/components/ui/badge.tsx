import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider", {
  variants: {
    tone: {
      neutral: "bg-muted text-muted-foreground",
      live: "bg-sky-500/15 text-sky-300",
      ok: "bg-emerald-500/15 text-emerald-300",
      warn: "bg-amber-500/15 text-amber-300",
      bad: "bg-red-500/15 text-red-300",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export type BadgeProps = React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
