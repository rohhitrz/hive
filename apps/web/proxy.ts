import { NextResponse, type NextRequest } from "next/server";
import { isAuthorized, parseBasicAuthConfig } from "@/lib/basic-auth";

/** Optional basic auth: when HIVE_BASIC_AUTH ("user:pass") is set, every page and API route requires it. */
export function proxy(request: NextRequest) {
  const config = parseBasicAuthConfig(process.env.HIVE_BASIC_AUTH);
  if (!config || isAuthorized(request.headers.get("authorization"), config)) return NextResponse.next();
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Hive", charset="UTF-8"' },
  });
}

export const config = {
  // Everything except static build assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
