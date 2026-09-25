# Hive UI v1: Architecture

## 1. Repo layout (pnpm monorepo)

```
hive/
├── CLAUDE.md
├── docker-compose.yml          # Postgres 16
├── .env.example
├── pnpm-workspace.yaml
├── packages/
│   └── core/                   # the engine (today's src/), no web/Next imports
│       ├── src/
│       │   ├── index.ts        # public exports
│       │   ├── orchestrator.ts planner.ts factory.ts agent.ts critic.ts
│       │   ├── synthesizer.ts blackboard.ts budget.ts tools.ts types.ts config.ts
│       │   └── cli.ts
│       └── test/
├── apps/
│   └── web/                    # Next.js App Router
│       ├── app/
│       │   ├── page.tsx                    # New run
│       │   ├── runs/page.tsx               # History
│       │   ├── runs/[id]/page.tsx          # Run view
│       │   └── api/runs/
│       │       ├── route.ts                # POST create run, GET list
│       │       └── [id]/
│       │           ├── route.ts            # GET run row
│       │           ├── events/route.ts     # GET SSE stream (live + catch-up)
│       │           ├── events.json/route.ts# GET all events (replay)
│       │           └── cancel/route.ts     # POST cancel
│       ├── lib/
│       │   ├── db/schema.ts db/client.ts
│       │   ├── runner.ts                   # run registry + execution
│       │   └── run-state/reducer.ts        # pure event → UI state
│       ├── components/  (graph/, feed/, inspector/, report/, status-bar/)
│       └── middleware.ts                   # optional basic auth
└── docs/  PRD.md ARCHITECTURE.md TASKS.md
```

**Core packaging:** `packages/core` builds with `tsc` to `dist/` (it uses NodeNext `.js` import
paths). `apps/web` depends on `"@hive/core": "workspace:*"` and imports the built output.
In dev, run `tsc --watch` for core alongside `next dev` (a root `pnpm dev` runs both).

## 2. Data flow

```
Browser ──POST /api/runs──▶ runner.start()
                              │ creates runs row (status=running)
                              │ runHive(goal, { onEvent, signal })   (not awaited)
                              ▼
                  onEvent(e) → assign seq → INSERT run_events → emit on in-process bus
                                                                      │
Browser ◀──SSE /api/runs/:id/events── stored events (seq > lastSeq) ─┘ then live bus events
```

- Runs execute **inside the Next.js Node server process**. This requires a long-running server
  (`next dev` / `next start` locally, Railway/Fly later). Do not deploy runs to serverless functions.
- The run registry and event bus live on `globalThis` so they survive dev hot reloads.
- Week 2 replaces `runner.start()` with an Inngest function. The event table and SSE endpoint stay the same.

## 3. Core event protocol

Core emits `HiveEvent` objects. The web layer wraps each one in an envelope.

```ts
type Phase = "planning" | "researching" | "critiquing" | "synthesizing";

type HiveEvent =
  | { type: "phase"; phase: Phase; round: number }
  | { type: "plan"; questions: SubQuestion[] }
  | { type: "agent_spawned"; agent: AgentSpec; round: number }
  | { type: "agent_step"; agentId: string; step: number;
      toolCalls: { name: string; input: string; result: string }[];  // truncated summaries
      text?: string; costUsd: number }
  | { type: "agent_done"; agentId: string; ok: boolean; summary?: string; error?: string; costUsd: number }
  | { type: "board"; entry: BoardEntry }
  | { type: "review"; round: number; review: Review }
  | { type: "budget"; spentUsd: number; agentsSpawned: number }
  | { type: "report"; markdown: string; citations: Citation[] }
  | { type: "run_end"; status: "done" | "failed" | "cancelled"; error?: string };

type Citation = { n: number; findingId: string; claim: string; url: string };

// Web envelope (what's stored and streamed)
type RunEvent = { runId: string; seq: number; at: string /* ISO */; event: HiveEvent };
```

Rules:
- `seq` starts at 1 and increases by 1 per run, with no gaps.
- `input` / `result` summaries are truncated to 300 chars in core.
- Rounds are 1-based.
- The UI ignores unknown `type`s.

### Required core changes (vs. the week-1 skeleton)
1. `agent.ts`: use `onStepFinish` to emit `agent_step` and charge the budget **per step**; return summary and cost.
2. `orchestrator.ts`: emit `phase`, include `round` on `agent_spawned` and `review`, emit `agent_done` with summary/error/cost, `report`, `run_end`.
3. `synthesizer.ts`: return `{ markdown, citations }` so `[n]` maps to a finding id.
4. Cancellation: `runHive` accepts `signal: AbortSignal`, checks it between phases, and passes it to every model call
   (combined with the per-agent timeout via `AbortSignal.any`). On abort: skip remaining rounds, synthesize from
   existing findings if any exist, then emit `run_end` with status `cancelled`.
5. `index.ts` exports `runHive` and all types.

## 4. Database (Postgres + Drizzle)

```ts
runs
  id            uuid pk default gen_random_uuid()
  goal          text not null
  mode          text not null default 'research'
  status        text not null   -- running | done | failed | cancelled | interrupted
  budget_usd    numeric(8,4) not null
  max_agents    int not null
  max_rounds    int not null
  spent_usd     numeric(10,6) not null default 0
  agent_count   int not null default 0
  report_md     text
  citations     jsonb
  error         text
  created_at    timestamptz not null default now()
  finished_at   timestamptz

run_events
  run_id   uuid references runs(id) on delete cascade
  seq      int
  type     text not null
  payload  jsonb not null     -- the HiveEvent
  at       timestamptz not null default now()
  primary key (run_id, seq)
```

- The `runs` row is updated on `budget` (spent, agent_count), `report` (report_md, citations), and `run_end` (status, error, finished_at).
- On server boot, and when an SSE client opens a run whose status is `running` but which isn't in the registry,
  set status to `interrupted`.

## 5. API

| Method | Path | Body / query | Returns |
|---|---|---|---|
| POST | `/api/runs` | `{ goal, budgetUsd, maxAgents, maxRounds }` (Zod-validated) | `{ id }` |
| GET | `/api/runs` | `?limit=20` | runs list (newest first) |
| GET | `/api/runs/:id` | | run row |
| GET | `/api/runs/:id/events` | `Last-Event-ID` header or `?after=seq` | SSE stream |
| GET | `/api/runs/:id/events.json` | | `RunEvent[]` |
| POST | `/api/runs/:id/cancel` | | `{ ok: true }` |

**SSE details**
- Each message: `id: <seq>` and `data: <RunEvent JSON>`.
- On connect: send stored events with `seq > after`, then subscribe to the live bus. Buffer live events that arrive during
  catch-up and de-duplicate by `seq` so nothing is lost or repeated.
- Send a comment line (`: ping`) every 15 seconds to keep the connection open.
- If the run is already finished: send the stored events, then close.

## 6. UI state

A single **pure reducer** turns events into UI state. Live, reconnect, and replay all feed the same reducer.

```ts
type RunState = {
  phase: Phase | "done" | "failed" | "cancelled" | "interrupted";
  round: number;
  spentUsd: number; agentsSpawned: number;
  agents: Record<string, {
    spec: AgentSpec; round: number;
    status: "researching" | "done" | "failed";
    steps: AgentStep[]; findingIds: string[]; costUsd: number;
    summary?: string; error?: string;
  }>;
  board: BoardEntry[];
  disputes: Record<string /*findingId*/, string /*reason*/>;
  reviews: Record<number /*round*/, Review>;
  report?: { markdown: string; citations: Citation[] };
  lastSeq: number;
};
```

- `useRunStream(runId)`: opens an `EventSource`, feeds the reducer, and reconnects with `lastSeq`.
- `useRunReplay(runId, speed)`: fetches `events.json` and feeds the reducer using the original time gaps ÷ speed
  (instant = all at once).

### Graph rules
- Node `lead`: always present.
- Round 1 agents: edges from `lead`.
- Node `critic-r{n}`: appears when phase `critiquing` round n starts; edges from every round-n agent into it.
- Round n+1 agents: edges from `critic-r{n}` (they were spawned to fill its gaps).
- Node `synth`: appears at phase `synthesizing`; edge from the last critic.
- Dispute edges: dashed red, from `critic-r{n}` to the agent that posted the disputed finding.
- Layout: dagre, top-to-bottom; re-run layout only when nodes are added.

## 7. Configuration

```
OPENAI_API_KEY=         TAVILY_API_KEY=     JINA_API_KEY=        # JINA optional
DATABASE_URL=postgres://hive:hive@localhost:5432/hive
HIVE_LEAD_MODEL=        HIVE_WORKER_MODEL=                        # optional overrides (default gpt-6-luna)
HIVE_BASIC_AUTH=        # optional "user:pass"; enables auth middleware
```

Models come from OpenAI via `@ai-sdk/openai` (`packages/core/src/config.ts`). Both tiers default to
`gpt-6-luna` ($0.10 / $0.50 per 1M input/output tokens). Update `PRICES` if you override the models.

## 8. Testing

- **Core:** Vitest + the AI SDK's mock language model (`ai/test`) to run the orchestrator with no API keys.
  Assert event order, `seq`-free core events, budget charged per step, cancellation behavior, failed-agent handling.
- **Web:** Vitest unit tests for the reducer (fixture event logs → expected state), and for SSE catch-up + de-duplication.
- **Fixture:** save one real run's events as `apps/web/test/fixtures/run.json`, used by reducer tests and UI development.
