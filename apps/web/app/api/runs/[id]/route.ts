import { NextResponse } from "next/server";
import { badRequest, notFound } from "@/lib/api";
import { getRun } from "@/lib/run-store";
import { getRunner } from "@/lib/runner";
import { RunIdSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const parsed = RunIdSchema.safeParse((await params).id);
  if (!parsed.success) return badRequest(parsed.error);

  await (await getRunner()).ensureOrphansMarked();
  const run = await getRun(parsed.data);
  return run ? NextResponse.json(run) : notFound();
}
