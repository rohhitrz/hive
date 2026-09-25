import { NextResponse } from "next/server";
import { badRequest, notFound } from "@/lib/api";
import { getRun } from "@/lib/run-store";
import { getRunner } from "@/lib/runner";
import { RunIdSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const parsed = RunIdSchema.safeParse((await params).id);
  if (!parsed.success) return badRequest(parsed.error);

  const runner = await getRunner();
  if (runner.cancel(parsed.data)) return NextResponse.json({ ok: true });
  // Not running here: fine if it exists (already finished), 404 otherwise.
  return (await getRun(parsed.data)) ? NextResponse.json({ ok: true }) : notFound();
}
