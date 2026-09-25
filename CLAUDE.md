# Hive: project rules for Claude Code

Multi-agent research orchestrator. Engine in `packages/core`, Next.js UI in `apps/web`.
Specs: `docs/PRD.md` (what), `docs/ARCHITECTURE.md` (how), `docs/TASKS.md` (order of work).

## Commands
- `pnpm dev`: core `tsc --watch` + `next dev`
- `pnpm typecheck` / `pnpm test` / `pnpm lint`
- `docker compose up -d`: Postgres
- `pnpm --filter web db:generate` / `db:migrate`: Drizzle migrations
- `pnpm --filter @hive/core hive "goal"`: CLI run

## Working rules
- Do **one task from docs/TASKS.md at a time**. Finish with its acceptance checks passing, then stop and summarize.
- Before coding a task, state your plan in 3–6 bullets. If the spec is unclear or seems wrong, ask instead of guessing.
- Run `pnpm typecheck` and `pnpm test` before saying a task is done.
- Keep changes scoped to the task. Don't refactor unrelated code.
- Don't add dependencies beyond those listed in ARCHITECTURE.md without asking.
- If you change the event protocol, update ARCHITECTURE.md §3 in the same change.

## Architecture rules
- `packages/core` never imports Next.js, React, or DB code. It only emits `HiveEvent`s.
- `apps/web` never calls an LLM or search API directly. Only `lib/runner.ts` calls `runHive`.
- All run UI state comes from the event reducer (`lib/run-state/reducer.ts`). Components don't fetch run data on their own.
- The reducer is pure, ignores unknown event types, and never throws.
- Persist an event **before** emitting it to clients.
- Validate every API input with Zod.
- Secrets stay server-side. Nothing from `process.env` reaches client components.

## Code style
- TypeScript strict. No `any`; use `unknown` + narrowing.
- Core uses NodeNext ESM with `.js` import paths.
- UI: Tailwind + shadcn/ui, dark theme, dense "mission control" layout.
- Small files; one component per file.
- Tests next to the code they cover (`*.test.ts`) or in `test/`.
