import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import { proxy } from "../proxy";
import { isAuthorized, parseBasicAuthConfig } from "./basic-auth";

const basic = (s: string) => `Basic ${Buffer.from(s).toString("base64")}`;

describe("basic auth", () => {
  it("parses user:pass (passwords may contain colons)", () => {
    expect(parseBasicAuthConfig("admin:s3:cret")).toEqual({ user: "admin", pass: "s3:cret" });
    expect(parseBasicAuthConfig("")).toBeUndefined();
    expect(parseBasicAuthConfig("nocolon")).toBeUndefined();
    expect(parseBasicAuthConfig(":pass")).toBeUndefined();
  });

  it("checks credentials", () => {
    const cfg = { user: "admin", pass: "s3:cret" };
    expect(isAuthorized(basic("admin:s3:cret"), cfg)).toBe(true);
    expect(isAuthorized(basic("admin:wrong"), cfg)).toBe(false);
    expect(isAuthorized(basic("admi:s3:cret"), cfg)).toBe(false);
    expect(isAuthorized("Bearer x", cfg)).toBe(false);
    expect(isAuthorized(null, cfg)).toBe(false);
  });
});

describe("proxy", () => {
  const original = process.env.HIVE_BASIC_AUTH;
  afterEach(() => {
    process.env.HIVE_BASIC_AUTH = original;
  });
  const req = (path: string, auth?: string) =>
    new NextRequest(`http://localhost${path}`, { headers: auth ? { authorization: auth } : {} });

  it("lets everything through when HIVE_BASIC_AUTH is unset", () => {
    delete process.env.HIVE_BASIC_AUTH;
    expect(proxy(req("/api/runs")).status).toBe(200);
  });

  it("returns 401 with a challenge for pages and APIs without credentials", () => {
    process.env.HIVE_BASIC_AUTH = "admin:pw";
    for (const path of ["/", "/runs", "/api/runs", "/api/runs/x/events"]) {
      const res = proxy(req(path));
      expect(res.status).toBe(401);
      expect(res.headers.get("www-authenticate")).toContain("Basic");
    }
    expect(proxy(req("/api/runs", basic("admin:pw"))).status).toBe(200);
  });
});
