import { timingSafeEqual } from "node:crypto";

/** Parses HIVE_BASIC_AUTH ("user:pass"). Undefined when auth is off or the value is malformed. */
export function parseBasicAuthConfig(value: string | undefined): { user: string; pass: string } | undefined {
  if (!value) return undefined;
  const i = value.indexOf(":");
  if (i <= 0 || i === value.length - 1) return undefined;
  return { user: value.slice(0, i), pass: value.slice(i + 1) };
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    // Still do a comparison so a wrong length takes about as long as a wrong value.
    timingSafeEqual(bb, bb);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

/** True if the Authorization header carries the expected Basic credentials. */
export function isAuthorized(header: string | null, expected: { user: string; pass: string }): boolean {
  if (!header?.startsWith("Basic ")) return false;
  let decoded: string;
  try {
    decoded = Buffer.from(header.slice(6).trim(), "base64").toString("utf8");
  } catch {
    return false;
  }
  const i = decoded.indexOf(":");
  if (i < 0) return false;
  const userOk = safeEqual(decoded.slice(0, i), expected.user);
  const passOk = safeEqual(decoded.slice(i + 1), expected.pass);
  return userOk && passOk;
}
