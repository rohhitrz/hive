import Link from "next/link";
import { RunsTable, type RunRow } from "@/components/history/runs-table";
import { listRuns } from "@/lib/run-store";
import { getRunner } from "@/lib/runner";

export const dynamic = "force-dynamic";

const HISTORY_LIMIT = 100;

export default async function HistoryPage() {
  await (await getRunner()).ensureOrphansMarked();
  const runs = await listRuns(HISTORY_LIMIT);
  const rows: RunRow[] = runs.map((r) => ({
    id: r.id,
    goal: r.goal,
    status: r.status,
    agentCount: r.agentCount,
    maxAgents: r.maxAgents,
    spentUsd: r.spentUsd,
    createdAt: r.createdAt.toISOString(),
    finishedAt: r.finishedAt?.toISOString() ?? null,
  }));
  const total = rows.reduce((sum, r) => sum + r.spentUsd, 0);

  return (
    <main className="mx-auto max-w-5xl space-y-5 px-6 py-10">
      <header className="flex items-baseline justify-between">
        <h1 className="text-lg font-semibold">
          <Link href="/" className="text-primary">
            ⬡ Hive
          </Link>{" "}
          <span className="text-muted-foreground">/ runs</span>
        </h1>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {rows.length} runs · ${total.toFixed(3)} total
        </span>
      </header>
      <RunsTable runs={rows} />
    </main>
  );
}
