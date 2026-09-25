import { bannerFor } from "@/lib/run-state/banner";
import type { RunState } from "@/lib/run-state/reducer";

const STYLES = {
  failed: "border-red-500/30 bg-red-500/10 text-red-300",
  warn: "border-amber-500/30 bg-amber-500/10 text-amber-200",
} as const;

/** Explains how a run ended when it didn't simply finish. */
export function RunBanner({ state }: { state: RunState }) {
  const banner = bannerFor(state);
  if (!banner) return null;
  return (
    <div role="status" className={`shrink-0 border-b px-4 py-1.5 text-xs ${STYLES[banner.tone]}`}>
      {banner.text}
    </div>
  );
}
