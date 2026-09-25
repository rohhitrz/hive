import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { RunStatus } from "@/lib/db/schema";

const TONES: Record<RunStatus, BadgeProps["tone"]> = {
  running: "live",
  done: "ok",
  failed: "bad",
  cancelled: "warn",
  interrupted: "warn",
};

export function RunStatusBadge({ status }: { status: RunStatus }) {
  return <Badge tone={TONES[status] ?? "neutral"}>{status}</Badge>;
}
