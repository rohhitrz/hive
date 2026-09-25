import type { Citation } from "@hive/core";

export const CITE_PREFIX = "#cite-";

/**
 * Turns "[n]" citation markers into "[n](#cite-n)" links so the renderer can swap in hover cards.
 * Leaves markdown links "[x](url)", reference definitions "[1]: url", and code untouched.
 */
export function linkCitations(markdown: string): string {
  let inFence = false;
  return markdown
    .split("\n")
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        inFence = !inFence;
        return line;
      }
      if (inFence) return line;
      // Odd segments are inside inline code.
      return line
        .split("`")
        .map((seg, i) => (i % 2 === 1 ? seg : seg.replace(/\[(\d+)\](?![(:])/g, (_m, n: string) => `[${n}](${CITE_PREFIX}${n})`)))
        .join("`");
    })
    .join("\n");
}

export function citationNumber(href: string | undefined): number | undefined {
  if (!href?.startsWith(CITE_PREFIX)) return undefined;
  const n = Number(href.slice(CITE_PREFIX.length));
  return Number.isInteger(n) ? n : undefined;
}

export function citationMap(citations: Citation[]): Map<number, Citation> {
  return new Map(citations.map((c) => [c.n, c]));
}
