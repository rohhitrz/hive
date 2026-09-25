import { notFound } from "next/navigation";
import type { RunInfo } from "@/components/run/run-info";
import { RunView } from "@/components/run/run-view";
import { getRun, markInterrupted } from "@/lib/run-store";
import { getRunner } from "@/lib/runner";
import { RunIdSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const id = RunIdSchema.safeParse((await params).id);
  if (!id.success) notFound();

  const runner = await getRunner();
  await runner.ensureOrphansMarked();
  let run = await getRun(id.data);
  if (!run) notFound();
  if (run.status === "running" && !runner.isActive(run.id)) {
    await markInterrupted(run.id);
    run = { ...run, status: "interrupted" };
  }

  const info: RunInfo = {
    id: run.id,
    goal: run.goal,
    status: run.status,
    budgetUsd: run.budgetUsd,
    maxAgents: run.maxAgents,
    maxRounds: run.maxRounds,
    createdAt: run.createdAt.toISOString(),
    finishedAt: run.finishedAt?.toISOString() ?? null,
  };
  return <RunView run={info} />;
}
