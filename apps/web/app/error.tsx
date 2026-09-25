"use client";

import Link from "next/link";

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-lg space-y-3 px-6 py-16 text-xs">
      <h1 className="text-sm font-semibold text-red-300">Something went wrong</h1>
      <p className="break-words text-muted-foreground">{error.message || "Unexpected error."}</p>
      <div className="flex gap-3">
        <button onClick={reset} className="rounded border border-border px-3 py-1 hover:bg-muted">
          Try again
        </button>
        <Link href="/" className="rounded border border-border px-3 py-1 hover:bg-muted">
          New run
        </Link>
      </div>
    </main>
  );
}
