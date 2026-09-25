import "server-only";
import { and, asc, desc, eq, gt } from "drizzle-orm";
import { getDb } from "./db/client";
import { runEvents, runs, type NewRun, type Run } from "./db/schema";
import type { RunEvent, RunStore } from "./runner";

export const drizzleRunStore: RunStore = {
  async createRun(input) {
    const [row] = await getDb()
      .insert(runs)
      .values({ ...input, status: "running" } satisfies NewRun)
      .returning({ id: runs.id });
    if (!row) throw new Error("failed to create run");
    return row.id;
  },
  async appendEvent(runId, seq, at, event) {
    await getDb().insert(runEvents).values({ runId, seq, type: event.type, payload: event, at });
  },
  async updateRun(runId, patch) {
    await getDb().update(runs).set(patch).where(eq(runs.id, runId));
  },
  async markOrphansInterrupted() {
    await getDb()
      .update(runs)
      .set({ status: "interrupted", finishedAt: new Date() })
      .where(eq(runs.status, "running"));
  },
};

export async function getRun(id: string): Promise<Run | undefined> {
  const [row] = await getDb().select().from(runs).where(eq(runs.id, id));
  return row;
}

export async function listRuns(limit: number): Promise<Run[]> {
  return getDb().select().from(runs).orderBy(desc(runs.createdAt)).limit(limit);
}

export async function listEvents(runId: string, afterSeq = 0): Promise<RunEvent[]> {
  const rows = await getDb()
    .select()
    .from(runEvents)
    .where(and(eq(runEvents.runId, runId), gt(runEvents.seq, afterSeq)))
    .orderBy(asc(runEvents.seq));
  return rows.map((r) => ({ runId: r.runId, seq: r.seq, at: r.at.toISOString(), event: r.payload }));
}

/** A "running" row with no live run in this process was orphaned by a restart. */
export async function markInterrupted(runId: string): Promise<void> {
  await getDb()
    .update(runs)
    .set({ status: "interrupted", finishedAt: new Date() })
    .where(and(eq(runs.id, runId), eq(runs.status, "running")));
}
