import type { ModelMessage } from "ai";
import { describe, expect, it } from "vitest";
import { pruneToolResults } from "../src/prune.js";

const page = (url: string) => `<untrusted_page url="${url}">\n${"lorem ipsum ".repeat(700)}\n</untrusted_page>`;

const toolMsg = (toolName: string, output: Extract<ModelMessage, { role: "tool" }>["content"][number]["output"]): ModelMessage => ({
  role: "tool",
  content: [{ type: "tool-result", toolCallId: `c-${toolName}`, toolName, output }],
});

describe("pruneToolResults", () => {
  const messages: ModelMessage[] = [
    { role: "user", content: "goal" },
    toolMsg("web_search", { type: "json", value: [{ title: "A", url: "https://a.com", snippet: "long snippet ".repeat(50) }] }),
    toolMsg("read_page", { type: "text", value: page("https://a.com/x") }),
    toolMsg("read_page", { type: "error-text", value: "read failed: 403" }),
    toolMsg("read_page", { type: "text", value: page("https://b.com/y") }),
  ];
  const out = pruneToolResults(messages);
  const output = (i: number) => {
    const m = out[i]!;
    if (m.role !== "tool") throw new Error("not a tool message");
    return m.content[0]!.output;
  };

  it("replaces older page bodies with a stub naming the URL", () => {
    expect(output(2)).toEqual({ type: "text", value: expect.stringContaining("page already read: https://a.com/x") });
    expect(JSON.stringify(output(2)).length).toBeLessThan(200);
  });

  it("slims older search results to title + url", () => {
    expect(output(1)).toEqual({ type: "json", value: [{ title: "A", url: "https://a.com" }] });
  });

  it("keeps the newest tool message and errors intact, and never mutates input", () => {
    expect(out[4]).toBe(messages[4]);
    expect(output(3)).toEqual({ type: "error-text", value: "read failed: 403" });
    expect(JSON.stringify(messages).length - JSON.stringify(out).length).toBeGreaterThan(8000);
    const original = messages[2];
    expect(original?.role === "tool" && original.content[0]!.output.type === "text" && original.content[0]!.output.value.length).toBeGreaterThan(5000);
  });
});
