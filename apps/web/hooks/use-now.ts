"use client";

import { useEffect, useState } from "react";

/** Current time, ticking every `intervalMs` while `active`. Null until mounted (avoids hydration mismatch). */
export function useNow(active: boolean, intervalMs = 1000): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [active, intervalMs]);
  return now;
}
