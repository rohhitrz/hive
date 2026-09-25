"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyMarkdownButton({ markdown }: { markdown: string }) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setState("copied");
    } catch {
      setState("error");
    }
    setTimeout(() => setState("idle"), 1500);
  }

  return (
    <Button variant="outline" size="sm" onClick={copy}>
      {state === "copied" ? "Copied ✓" : state === "error" ? "Copy failed" : "Copy as markdown"}
    </Button>
  );
}
