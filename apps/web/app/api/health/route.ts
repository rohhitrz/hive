import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Liveness check for the host (kept outside basic auth; reveals nothing). */
export function GET() {
  return NextResponse.json({ ok: true });
}
