import { defineConfig } from "drizzle-kit";

// Secrets live in the repo-root .env.
try {
  process.loadEnvFile("../../.env");
} catch {
  // rely on the real environment
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "postgres://hive:hive@localhost:5432/hive" },
});
