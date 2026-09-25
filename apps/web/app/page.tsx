import { NewRunForm } from "@/components/new-run/new-run-form";
import { RecentRuns } from "@/components/new-run/recent-runs";
import { listRuns } from "@/lib/run-store";
import { getRunner } from "@/lib/runner";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await (await getRunner()).ensureOrphansMarked();
  const recent = await listRuns(5);

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-10">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold">
          <span className="text-primary">⬡ Hive</span> <span className="text-muted-foreground">/ new run</span>
        </h1>
        <p className="text-xs text-muted-foreground">
          A lead agent plans the research, spawns specialist agents, fact-checks every claim, and writes a cited report.
        </p>
      </header>
      <NewRunForm />
      <RecentRuns runs={recent} />
    </main>
  );
}
