import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

// Survive dev hot reloads without opening a new pool each time.
const g = globalThis as typeof globalThis & { __hiveDb?: Db };

export function getDb(): Db {
  if (!g.__hiveDb) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    g.__hiveDb = drizzle(postgres(url, { max: 10 }), { schema });
  }
  return g.__hiveDb;
}
