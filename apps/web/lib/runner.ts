import { EventEmitter } from "node:events";
import type { HiveEvent, HiveOptions, HiveResult } from "@hive/core";
import type { Run } from "./db/schema";
import type { CreateRunInput } from "./validation";

/** Stored + streamed envelope (ARCHITECTURE.md §3). */
export type RunEvent = { runId: string; seq: number; at: string; event: HiveEvent };

export type RunPatch = Partial<Pick<Run, "status" | "spentUsd" | "agentCount" | "reportMd" | "citations" | "error" | "finishedAt">>;

export interface RunStore {
  createRun(input: CreateRunInput): Promise<string>;
  appendEvent(runId: string, seq: number, at: Date, event: HiveEvent): Promise<void>;
  updateRun(runId: string, patch: RunPatch): Promise<void>;
  markOrphansInterrupted(): Promise<void>;
}

export type RunHiveFn = (goal: string, opts: HiveOptions) => Promise<HiveResult>;

type ActiveRun = {
  controller: AbortController;
  bus: EventEmitter;
  nextSeq: number;
  /** Serializes persistence so events are stored and emitted in seq order. */
  queue: Promise<void>;
};

function patchFor(event: HiveEvent): RunPatch | undefined {
  switch (event.type) {
    case "budget":
      return { spentUsd: event.spentUsd, agentCount: event.agentsSpawned };
    case "report":
      return { reportMd: event.markdown, citations: event.citations };
    case "run_end":
      return { status: event.status, error: event.error ?? null, finishedAt: new Date() };
    default:
      return undefined;
  }
}

export function createRunner(store: RunStore, runHive: RunHiveFn, log: (msg: string, err: unknown) => void = console.error) {
  const active = new Map<string, ActiveRun>();
  let orphansChecked: Promise<void> | undefined;

  /** On first use in this process, any "running" row belongs to a dead process. */
  function ensureOrphansMarked() {
    orphansChecked ??= store.markOrphansInterrupted().catch((err) => log("mark orphans failed", err));
    return orphansChecked;
  }

  function record(runId: string, run: ActiveRun, event: HiveEvent) {
    const seq = run.nextSeq++;
    const at = new Date();
    run.queue = run.queue.then(async () => {
      try {
        // Persist before emitting (F3).
        await store.appendEvent(runId, seq, at, event);
        const patch = patchFor(event);
        if (patch) await store.updateRun(runId, patch);
      } catch (err) {
        log(`persist event ${seq} of run ${runId} failed`, err);
      }
      run.bus.emit("event", { runId, seq, at: at.toISOString(), event } satisfies RunEvent);
    });
  }

  async function start(input: CreateRunInput): Promise<string> {
    await ensureOrphansMarked();
    const runId = await store.createRun(input);
    const run: ActiveRun = { controller: new AbortController(), bus: new EventEmitter(), nextSeq: 1, queue: Promise.resolve() };
    run.bus.setMaxListeners(0);
    active.set(runId, run);

    let ended = false;
    void runHive(input.goal, {
      budgetUsd: input.budgetUsd,
      maxAgents: input.maxAgents,
      maxRounds: input.maxRounds,
      signal: run.controller.signal,
      onEvent: (event) => {
        if (event.type === "run_end") ended = true;
        record(runId, run, event);
      },
    })
      .catch((err: unknown) => {
        if (!ended) record(runId, run, { type: "run_end", status: "failed", error: err instanceof Error ? err.message : String(err) });
      })
      .finally(async () => {
        await run.queue;
        active.delete(runId);
        run.bus.emit("close");
        run.bus.removeAllListeners();
      });

    return runId;
  }

  function cancel(runId: string): boolean {
    const run = active.get(runId);
    if (!run) return false;
    run.controller.abort();
    return true;
  }

  /** Live events for an active run. Returns undefined if the run isn't running in this process. */
  function subscribe(runId: string, onEvent: (e: RunEvent) => void, onClose?: () => void): (() => void) | undefined {
    const run = active.get(runId);
    if (!run) return undefined;
    run.bus.on("event", onEvent);
    if (onClose) run.bus.on("close", onClose);
    return () => {
      run.bus.off("event", onEvent);
      if (onClose) run.bus.off("close", onClose);
    };
  }

  return {
    start,
    cancel,
    subscribe,
    isActive: (runId: string) => active.has(runId),
    ensureOrphansMarked,
    /** Resolves once everything for this run has been persisted (tests). */
    settled: async (runId: string) => {
      const run = active.get(runId);
      if (run) await new Promise<void>((resolve) => run.bus.once("close", resolve));
    },
  };
}

export type Runner = ReturnType<typeof createRunner>;

// The registry must survive dev hot reloads.
const g = globalThis as typeof globalThis & { __hiveRunner?: Runner };

export async function getRunner(): Promise<Runner> {
  if (!g.__hiveRunner) {
    const [{ runHive }, { drizzleRunStore }] = await Promise.all([import("@hive/core"), import("./run-store")]);
    g.__hiveRunner ??= createRunner(drizzleRunStore, runHive);
  }
  return g.__hiveRunner;
}
