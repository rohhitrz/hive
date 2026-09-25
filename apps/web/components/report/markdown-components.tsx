import type { Citation } from "@hive/core";
import type { Components } from "react-markdown";
import { citationNumber } from "@/lib/report/citations";
import { CitationRef } from "./citation-ref";

/** Dense dark styles for report markdown; [n] links become citation hover cards. */
export function markdownComponents(citations: Map<number, Citation>): Components {
  return {
    h1: ({ children }) => <h1 className="mb-3 mt-1 text-base font-semibold text-foreground">{children}</h1>,
    h2: ({ children }) => <h2 className="mb-2 mt-5 border-b border-border pb-1 text-sm font-semibold text-foreground">{children}</h2>,
    h3: ({ children }) => <h3 className="mb-1.5 mt-4 text-[13px] font-semibold text-foreground">{children}</h3>,
    p: ({ children }) => <p className="my-2 leading-relaxed text-foreground/90">{children}</p>,
    ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5 marker:text-muted-foreground">{children}</ul>,
    ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5 marker:text-muted-foreground">{children}</ol>,
    li: ({ children }) => <li className="leading-relaxed text-foreground/90">{children}</li>,
    strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
    blockquote: ({ children }) => <blockquote className="my-2 border-l-2 border-primary/50 pl-3 text-muted-foreground">{children}</blockquote>,
    hr: () => <hr className="my-4 border-border" />,
    code: ({ children }) => <code className="rounded bg-muted px-1 py-0.5 text-[11px]">{children}</code>,
    table: ({ children }) => (
      <div className="my-3 overflow-x-auto">
        <table className="w-full border-collapse text-[11px]">{children}</table>
      </div>
    ),
    th: ({ children }) => <th className="border border-border bg-muted px-2 py-1 text-left font-medium">{children}</th>,
    td: ({ children }) => <td className="border border-border px-2 py-1 align-top">{children}</td>,
    a: ({ href, children }) => {
      const n = citationNumber(href);
      if (n !== undefined) return <CitationRef n={n} citation={citations.get(n)} />;
      return (
        <a href={href} target="_blank" rel="noreferrer noopener" className="break-all text-sky-400 hover:underline">
          {children}
        </a>
      );
    },
  };
}
