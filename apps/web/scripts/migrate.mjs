// Applies pending Drizzle migrations at startup (production has no drizzle-kit step).
// Uses drizzle-orm's runtime migrator, so it needs no dev dependencies.
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

try {
  process.loadEnvFile("../../.env");
} catch {
  // no root .env (e.g. on the host): rely on the real environment
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[migrate] DATABASE_URL is not set");
  process.exit(1);
}

const client = postgres(url, { max: 1, onnotice: () => {} });
try {
  await migrate(drizzle(client), { migrationsFolder: new URL("../drizzle", import.meta.url).pathname });
  console.log("[migrate] database is up to date");
} catch (err) {
  console.error("[migrate] failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await client.end();
}
