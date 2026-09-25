import { describe, expect, it } from "vitest";
import type { HiveEvent } from "@hive/core";
import type { RunEvent } from "./runner";
import { streamRunEvents, type StreamDeps } from "./sse";

const ev = (seq: number): RunEvent => ({
  runId: "r1",
  seq,
  at: new Date(0).toISOString(),
  event: { type: "budget", spentUsd: seq / 100, agentsSpawned: 0, searches: 0 } satisfies HiveEvent,
});
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => ev(from + i));

async function readAll(stream: ReadableStream<Uint8Array>) {
  const text = await new Response(stream).text();
  const seqs = [...text.matchAll(/^id: (\d+)$/gm)].map((m) => Number(m[1]));
  const data = [...text.matchAll(/^data: (.+)$/gm)].map((m) => JSON.parse(m[1]!) as RunEvent);
  return { text, seqs, data };
}

/** A fake live run: stored events + a bus we can push to. */
function fakeRun(stored: RunEvent[]) {
  let onEvent: ((e: RunEvent) => void) | undefined;
  let onClose: (() => void) | undefined;
  return {
    stored,
    push(e: RunEvent) {
      stored.push(e); // persisted before emit
      onEvent?.(e);
    },
    end: () => onClose?.(),
    subscribe: ((e, c) => {
      onEvent = e;
      onClose = c;
      return () => {
        onEvent = undefined;
        onClose = undefined;
      };
    }) satisfies StreamDeps["subscribe"],
  };
}

describe("streamRunEvents", () => {
  it("finished run: streams stored events after `after` and closes", async () => {
    const stored = range(1, 20);
    const { seqs, data } = await readAll(
      streamRunEvents({ after: 10, loadEvents: async (a) => stored.filter((e) => e.seq > a), subscribe: () => undefined }),
    );
    expect(seqs).toEqual(range(11, 20).map((e) => e.seq));
    expect(data[0]).toEqual(ev(11));
  });

  it("reconnect with Last-Event-ID 10 resumes at 11 with no gaps or repeats across the live handoff", async () => {
    const run = fakeRun(range(1, 12));
    const stream = streamRunEvents({
      after: 10,
      loadEvents: async (a) => {
        // Live events arrive while the DB read is in flight (and are also in the DB snapshot).
        run.push(ev(13));
        run.push(ev(14));
        const snapshot = run.stored.filter((e) => e.seq > a);
        await new Promise((r) => setTimeout(r, 5));
        run.push(ev(15)); // after the snapshot: only reaches us via the buffer
        return snapshot;
      },
      subscribe: run.subscribe,
    });
    setTimeout(() => {
      run.push(ev(16));
      run.push(ev(17));
      run.end();
    }, 20);

    const { seqs } = await readAll(stream);
    expect(seqs).toEqual([11, 12, 13, 14, 15, 16, 17]);
  });

  it("sends pings while idle and stops when the client disconnects", async () => {
    const run = fakeRun(range(1, 2));
    const client = new AbortController();
    const stream = streamRunEvents({
      after: 0,
      loadEvents: async () => run.stored,
      subscribe: run.subscribe,
      signal: client.signal,
      pingIntervalMs: 5,
    });
    setTimeout(() => client.abort(), 30);
    const { text, seqs } = await readAll(stream);
    expect(seqs).toEqual([1, 2]);
    expect(text).toContain(": ping\n\n");
  });

  it("closes if the run ends during catch-up", async () => {
    const run = fakeRun(range(1, 3));
    const stream = streamRunEvents({
      after: 0,
      loadEvents: async () => {
        run.push(ev(4));
        run.end();
        return run.stored.slice(0, 3);
      },
      subscribe: run.subscribe,
    });
    const { seqs } = await readAll(stream);
    expect(seqs).toEqual([1, 2, 3, 4]);
  });
});
