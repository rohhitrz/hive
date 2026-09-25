# Hive UI v1: Tasks

Do these in order. Each task ends with its acceptance checks passing plus `pnpm typecheck && pnpm test`.

---

## T0: Monorepo migration
- Create pnpm workspace; move current `src/`, `package.json`, `tsconfig.json` into `packages/core` (name `@hive/core`).
- Add `src/index.ts` exporting `runHive` and all types. Build to `dist/` with declarations.
- Scaffold `apps/web` (Next.js App Router, TS, Tailwind, shadcn/ui) depending on `@hive/core: workspace:*`.
- Root scripts: `dev`, `build`, `typecheck`, `test`, `lint`.
- Add Vitest to both packages.

**Accept:** `pnpm install && pnpm build` succeeds; the CLI still works from `packages/core`; `apps/web` imports a type from `@hive/core` and typechecks.

## T1: Core event upgrades
Implement ARCHITECTURE.md §3 "Required core changes" 1–5.

**Accept (Vitest with mock model, no API keys):**
- Events arrive in the order: phase(planning) → plan → phase(researching) → agent_spawned… → agent_step… → agent_done… → phase(critiquing) → review → … → phase(synthesizing) → report → run_end(done).
- The budget is charged per step: a `budget` event follows each `agent_step`.
- A sub-agent whose tool throws yields `agent_done { ok: false }`; the run still ends `done`.
- Aborting mid-research ends with `run_end { status: "cancelled" }` and a `report` if findings exist.
- Every `[n]` in the report maps to a citation with a real finding id.

## T2: Database
- `docker-compose.yml` (Postgres 16, user/pass/db `hive`), `.env.example`.
- Drizzle schema per ARCHITECTURE.md §4, client, migration scripts.

**Accept:** `docker compose up -d && pnpm --filter web db:migrate` creates both tables.

## T3: Runner + create/list API
- `lib/runner.ts`: globalThis registry `{ runId → { controller, bus, nextSeq } }`; `start()`, `cancel()`, `subscribe()`.
- `onEvent`: assign seq → insert into `run_events` → update `runs` row when needed → emit on the bus.
- Mark orphaned `running` runs as `interrupted` on first registry use.
- Routes: `POST /api/runs`, `GET /api/runs`, `GET /api/runs/:id`, `POST /api/runs/:id/cancel`.

**Accept:** a curl POST returns an id in under 1 second; `run_events` fills up; the `runs` row ends `done` with a report; cancel ends it `cancelled`.

## T4: SSE endpoint + replay JSON
- `GET /api/runs/:id/events` per ARCHITECTURE.md §5 (catch-up, buffering, de-dup, ping, close when finished).
- `GET /api/runs/:id/events.json`.

**Accept:** `curl -N` shows live events; reconnecting with `Last-Event-ID: 10` resumes at seq 11 with no gaps or repeats (covered by a test); a finished run streams everything and closes.

## T5: Reducer + hooks
- `lib/run-state/reducer.ts` per ARCHITECTURE.md §6.
- `useRunStream(runId)`, `useRunReplay(runId, speed)`.
- Save one real run's events as `apps/web/test/fixtures/run.json`.

**Accept:** reducer tests pass on the fixture (agent count, statuses, disputes, report); unknown event types are ignored; replaying the fixture twice gives identical state.

## T6: New run page (`/`)
- Goal form, depth presets, advanced fields, Zod validation, recent runs list (PRD 5.1).

**Accept:** submitting creates a run and navigates to `/runs/[id]`; invalid input shows inline errors.

## T7: Run view shell + status bar + feed
- Layout from PRD 5.2; status bar; feed tabs (Board, Disputes, Report placeholder); smart auto-scroll.

**Accept:** during a live run, phase, cost, agent count and board entries update in real time; refresh mid-run restores state.

## T8: Agent graph
- React Flow + dagre per ARCHITECTURE.md §6 graph rules; node states and pulse; dispute edges.

**Accept:** fixture renders the correct nodes and edges; 20 nodes and 500 events stay smooth; layout only reruns when nodes are added.

## T9: Inspector drawer
- PRD 5.2 inspector contents; steps stream live for the selected agent.

**Accept:** clicking any node opens its drawer; a running agent's steps appear as they happen; failed agents show their error.

## T10: Report view
- Markdown render, citation hover cards + links, excluded-disputes section, copy-as-markdown.

**Accept:** every citation hover shows the right claim and URL; disputed findings are listed, not cited.

## T11: History + replay
- `/runs` table; finished runs open in replay mode with a speed control (1×, 4×, instant).

**Accept:** replay produces the same final state as the live run; speed control works.

## T12: Hardening
- Cancel button wired; Interrupted and Failed states styled; error boundary around graph and feed.
- Optional basic auth middleware (`HIVE_BASIC_AUTH`).

**Accept:** all PRD §8 success criteria pass manually; with `HIVE_BASIC_AUTH` set, pages and APIs return 401 without credentials.

## T13: README + demo polish
- README: GIF, architecture diagram, "run it in 3 commands", screenshots.
- Record a demo run and store its replay link.

**Accept:** a fresh clone runs by following only the README.
