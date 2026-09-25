import type { RunEvent } from "./runner";

export const PING_INTERVAL_MS = 15_000;

export type StreamDeps = {
  after: number;
  /** Stored events with seq > after, in order. */
  loadEvents: (after: number) => Promise<RunEvent[]>;
  /** Live events; undefined if the run isn't active (already finished). */
  subscribe: (onEvent: (e: RunEvent) => void, onClose: () => void) => (() => void) | undefined;
  /** Client went away. */
  signal?: AbortSignal;
  pingIntervalMs?: number;
};

const encoder = new TextEncoder();

export function formatEvent(e: RunEvent): string {
  return `id: ${e.seq}\ndata: ${JSON.stringify(e)}\n\n`;
}

/**
 * Catch-up then live. Subscribes before reading stored events and buffers live ones meanwhile,
 * then de-duplicates by seq, so nothing is lost or repeated across the handoff.
 */
export function streamRunEvents(deps: StreamDeps): ReadableStream<Uint8Array> {
  let cleanup = () => {};
  let closed = false;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let lastSent = deps.after;
      let catchingUp = true;
      let liveEnded = false;
      const buffer: RunEvent[] = [];

      const close = () => {
        if (closed) return;
        closed = true;
        cleanup();
        try {
          controller.close();
        } catch {
          // already closed
        }
      };
      const send = (e: RunEvent) => {
        if (closed || e.seq <= lastSent) return;
        lastSent = e.seq;
        controller.enqueue(encoder.encode(formatEvent(e)));
      };

      const unsubscribe = deps.subscribe(
        (e) => (catchingUp ? buffer.push(e) : send(e)),
        () => {
          liveEnded = true;
          if (!catchingUp) close();
        },
      );
      const ping = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(": ping\n\n"));
      }, deps.pingIntervalMs ?? PING_INTERVAL_MS);
      cleanup = () => {
        clearInterval(ping);
        unsubscribe?.();
      };
      deps.signal?.addEventListener("abort", close, { once: true });

      try {
        for (const e of await deps.loadEvents(deps.after)) send(e);
      } catch (err) {
        controller.error(err);
        closed = true;
        cleanup();
        return;
      }
      for (const e of buffer.sort((a, b) => a.seq - b.seq)) send(e);
      buffer.length = 0;
      catchingUp = false;

      // Finished run (or it finished during catch-up): everything is stored, so we're done.
      if (!unsubscribe || liveEnded) close();
    },
    cancel() {
      closed = true;
      cleanup();
    },
  });
}
