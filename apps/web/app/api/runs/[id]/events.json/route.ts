import { NextResponse } from "next/server";
import { badRequest, notFound } from "@/lib/api";
import { getRun, listEvents } from "@/lib/run-store";
import { RunIdSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = RunIdSchema.safeParse((await params).id);
  if (!id.success) return badRequest(id.error);
  if (!(await getRun(id.data))) return notFound();
  return NextResponse.json(await listEvents(id.data));
}
