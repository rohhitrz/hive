"use client";

import type { Citation } from "@hive/core";
import { useState } from "react";
import { sourceDomain } from "@/lib/run-state/labels";
import { cn } from "@/lib/utils";

const CARD_ROOM_PX = 200;

/** Inline [n]: opens the source in a new tab; hover or focus shows the claim and URL. */
export function CitationRef({ n, citation }: { n: number; citation?: Citation }) {
  // Keep the card inside the scrolling report: open below when there's no room above, and grow
  // away from the nearer side edge.
  const [placement, setPlacement] = useState({ below: false, alignRight: false });
  const place = (e: React.SyntheticEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const box = e.currentTarget.closest("article")?.getBoundingClientRect();
    const mid = box ? box.left + box.width / 2 : window.innerWidth / 2;
    setPlacement({ below: rect.top < CARD_ROOM_PX, alignRight: rect.left > mid });
  };
  const { below, alignRight } = placement;

  if (!citation) return <span className="text-muted-foreground">[{n}]</span>;
  return (
    <span className="group relative inline-block" onMouseEnter={place} onFocus={place}>
      <a
        href={citation.url}
        target="_blank"
        rel="noreferrer noopener"
        data-citation={n}
        data-finding={citation.findingId}
        aria-describedby={`cite-card-${n}`}
        className="mx-px rounded bg-primary/15 px-1 align-super text-[10px] font-medium text-primary no-underline hover:bg-primary/30 focus-visible:outline-1 focus-visible:outline-primary"
      >
        {n}
      </a>
      <span
        id={`cite-card-${n}`}
        role="tooltip"
        data-placement={below ? "below" : "above"}
        className={cn(
          "pointer-events-none invisible absolute z-30 w-72 rounded-md border border-border bg-card p-2.5 text-left text-[11px] leading-snug text-foreground opacity-0 shadow-xl transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100",
          below ? "top-full mt-1.5" : "bottom-full mb-1.5",
          alignRight ? "right-0" : "left-0",
        )}
      >
        <span className="block">{citation.claim}</span>
        <span className="mt-1.5 block truncate text-sky-400">{sourceDomain(citation.url)}</span>
        <span className="block truncate text-[10px] text-muted-foreground">{citation.url}</span>
      </span>
    </span>
  );
}
