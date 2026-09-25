import type { ModelMessage } from "ai";

type ToolOutput = Extract<Extract<ModelMessage, { role: "tool" }>["content"][number], { type: "tool-result" }>["output"];

const PAGE_URL = /<untrusted_page url="([^"]*)">/;

function pruneOutput(toolName: string, output: ToolOutput): ToolOutput {
  if (toolName === "read_page") {
    const raw = output.type === "text" || output.type === "error-text" ? output.value : JSON.stringify(output.value);
    if (output.type.startsWith("error")) return output;
    const url = PAGE_URL.exec(raw)?.[1] ?? "unknown";
    return { type: "text", value: `[page already read: ${url}. Content removed to save tokens; findings you posted are on the board.]` };
  }
  if (toolName === "web_search" && output.type === "json" && Array.isArray(output.value)) {
    const slim = output.value.map((r) =>
      r && typeof r === "object" && !Array.isArray(r) ? { title: r.title ?? null, url: r.url ?? null } : r,
    );
    return { type: "json", value: slim };
  }
  return output;
}

/**
 * Agents resend their whole history every step, so page bodies from earlier steps pile up
 * (tens of thousands of tokens) and trip provider tokens-per-minute limits. Keep the most
 * recent tool message intact and shrink older page reads and search results.
 */
export function pruneToolResults(messages: ModelMessage[]): ModelMessage[] {
  let lastTool = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]!.role === "tool") {
      lastTool = i;
      break;
    }
  }
  return messages.map((m, i) => {
    if (m.role !== "tool" || i === lastTool) return m;
    return {
      ...m,
      content: m.content.map((part) =>
        part.type === "tool-result" ? { ...part, output: pruneOutput(part.toolName, part.output) } : part,
      ),
    };
  });
}
