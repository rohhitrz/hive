import { sql } from "drizzle-orm";
import { integer, jsonb, numeric, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { Citation, HiveEvent } from "@hive/core";

export type RunStatus = "running" | "done" | "failed" | "cancelled" | "interrupted";

export const runs = pgTable("runs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  goal: text("goal").notNull(),
  mode: text("mode").notNull().default("research"),
  status: text("status").$type<RunStatus>().notNull(),
  budgetUsd: numeric("budget_usd", { precision: 8, scale: 4, mode: "number" }).notNull(),
  maxAgents: integer("max_agents").notNull(),
  maxRounds: integer("max_rounds").notNull(),
  spentUsd: numeric("spent_usd", { precision: 10, scale: 6, mode: "number" }).notNull().default(0),
  agentCount: integer("agent_count").notNull().default(0),
  reportMd: text("report_md"),
  citations: jsonb("citations").$type<Citation[]>(),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

export const runEvents = pgTable(
  "run_events",
  {
    runId: uuid("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    type: text("type").notNull(),
    payload: jsonb("payload").$type<HiveEvent>().notNull(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.runId, t.seq] })],
);

export type Run = typeof runs.$inferSelect;
export type NewRun = typeof runs.$inferInsert;
export type RunEventRow = typeof runEvents.$inferSelect;
