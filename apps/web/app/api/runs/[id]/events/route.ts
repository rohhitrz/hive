import type { NextRequest } from "next/server";
import { badRequest, notFound } from "@/lib/api";
import { getRun, listEvents, markInterrupted } from "@/lib/run-store";
import { getRunner } from "@/lib/runner";
import { streamRunEvents } from "@/lib/sse";
import { AfterSeqSchema, RunIdSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = RunIdSchema.safeParse((await params).id);
  if (!id.success) return badRequest(id.error);
  const after = AfterSeqSchema.safeParse(req.headers.get("last-event-id") ?? req.nextUrl.searchParams.get("after") ?? undefined);
  if (!after.success) return badRequest(after.error);

  const runner = await getRunner();
  await runner.ensureOrphansMarked();
  const run = await getRun(id.data);
  if (!run) return notFound();
  if (run.status === "running" && !runner.isActive(id.data)) await markInterrupted(id.data);

  const stream = streamRunEvents({
    after: after.data,
    loadEvents: (a) => listEvents(id.data, a),
    subscribe: (onEvent, onClose) => runner.subscribe(id.data, onEvent, onClose),
    signal: req.signal,
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
