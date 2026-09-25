import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export function badRequest(error: ZodError) {
  return NextResponse.json({ error: "invalid_input", issues: error.flatten() }, { status: 400 });
}

export function notFound() {
  return NextResponse.json({ error: "not_found" }, { status: 404 });
}
