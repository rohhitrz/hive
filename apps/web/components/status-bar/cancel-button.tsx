"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CancelButton({ runId }: { runId: string }) {
  const [state, setState] = useState<"idle" | "cancelling" | "error">("idle");

  async function cancel() {
    setState("cancelling");
    const res = await fetch(`/api/runs/${runId}/cancel`, { method: "POST" }).catch(() => null);
    if (!res?.ok) setState("error");
  }

  return (
    <Button variant="outline" size="sm" onClick={cancel} disabled={state === "cancelling"} className="border-red-500/40 text-red-300 hover:bg-red-500/10">
      {state === "cancelling" ? "Cancelling…" : state === "error" ? "Retry cancel" : "Cancel"}
    </Button>
  );
}
