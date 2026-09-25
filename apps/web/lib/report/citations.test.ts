import { describe, expect, it } from "vitest";
import fixture from "../../test/fixtures/run.json";
import type { RunEvent } from "../runner";
import { reduceAll } from "../run-state/reducer";
import { citationMap, citationNumber, linkCitations } from "./citations";

describe("linkCitations", () => {
  it("links bare and consecutive markers", () => {
    expect(linkCitations("Grew 12% [1][3]. Costs [2].")).toBe("Grew 12% [1](#cite-1)[3](#cite-3). Costs [2](#cite-2).");
  });

  it("leaves links, reference definitions and code alone", () => {
    const md = "See [docs](https://x.com) and [1](https://y.com).\n[2]: https://z.com\nUse `arr[0]` here [4].\n```\nx = a[1]\n```";
    expect(linkCitations(md)).toBe(
      "See [docs](https://x.com) and [1](https://y.com).\n[2]: https://z.com\nUse `arr[0]` here [4](#cite-4).\n```\nx = a[1]\n```",
    );
  });

  it("parses citation hrefs", () => {
    expect(citationNumber("#cite-7")).toBe(7);
    expect(citationNumber("https://x.com")).toBeUndefined();
  });
});

describe("report citations on the recorded fixture", () => {
  const state = reduceAll(fixture as unknown as RunEvent[]);
  const report = state.report!;
  const map = citationMap(report.citations);
  const linked = linkCitations(report.markdown);

  it("every linked [n] resolves to a citation with its finding's claim and URL", () => {
    const ns = [...linked.matchAll(/\]\(#cite-(\d+)\)/g)].map((m) => Number(m[1]));
    expect(ns.length).toBeGreaterThan(0);
    for (const n of ns) {
      const c = map.get(n);
      expect(c, `citation ${n}`).toBeDefined();
      const finding = state.board.find((e) => e.id === c!.findingId);
      expect(finding?.type === "finding" && finding.finding.claim).toBe(c!.claim);
      expect(finding?.type === "finding" && finding.finding.sourceUrl).toBe(c!.url);
    }
  });

  it("never cites a disputed finding", () => {
    for (const c of report.citations) expect(state.disputes[c.findingId]).toBeUndefined();
  });
});
