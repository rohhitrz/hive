import { NextResponse, type NextRequest } from "next/server";
import { badRequest } from "@/lib/api";
import { listRuns } from "@/lib/run-store";
import { getRunner } from "@/lib/runner";
import { CreateRunSchema, ListRunsQuerySchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body: unknown = await req.json().catch(() => null);
  const parsed = CreateRunSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  const runner = await getRunner();
  const id = await runner.start(parsed.data);
  return NextResponse.json({ id }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const parsed = ListRunsQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return badRequest(parsed.error);

  await (await getRunner()).ensureOrphansMarked();
  return NextResponse.json(await listRuns(parsed.data.limit));
}
