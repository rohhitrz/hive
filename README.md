# 🐝 Hive: multi-agent research orchestrator

Give it a goal. A lead agent plans the research, designs specialist sub-agents at runtime,
runs them in parallel on a shared board, fact-checks every claim with a critic, fills gaps,
and writes a cited report.

## Run (CLI)

```bash
pnpm install && pnpm build
cp .env.example .env   # add OPENAI_API_KEY and TAVILY_API_KEY
pnpm --filter @hive/core hive "Should I launch a matcha brand in Germany?"
```

Models: OpenAI `gpt-6-luna` by default (override with `HIVE_LEAD_MODEL` / `HIVE_WORKER_MODEL`).

## Flow

```
goal → planner → agent factory → sub-agents (parallel) ⇄ blackboard
                                        ↓
                          critic (disputes + gaps) → next round for gaps
                                        ↓
                              synthesizer → cited report
```

## Current layout (packages/core/src/)

| File | Job |
|---|---|
| `orchestrator.ts` | Main loop: plan → spawn → run → critique → repeat → synthesize |
| `planner.ts` | Splits the goal into parallel sub-questions |
| `factory.ts` | Generates each agent's prompt and step budget at runtime |
| `agent.ts` | Sub-agent tool loop with timeout |
| `tools.ts` | web_search, read_page (untrusted-fenced), post_finding, read_board |
| `blackboard.ts` | Shared typed message board (in-memory → Redis in W2) |
| `critic.ts` | Checks evidence vs claim, posts disputes, finds gaps |
| `synthesizer.ts` | Report from undisputed findings only |
| `budget.ts` | Cost tracking, $ cap, agent cap |
| `types.ts` | Zod schemas + typed messages + UI events |

## Target repo structure (by week 3)

```
hive/
├── packages/core/        # everything in src/ today
├── apps/web/             # Next.js: agent graph (React Flow), agent builder, SSE stream
├── apps/worker/          # Inngest functions: durable runs
├── evals/
│   ├── datasets/         # benchmark questions + golden answers
│   ├── citation-check.ts # % claims supported by cited source
│   └── single-vs-multi.ts# quality / cost / time comparison
└── infra/                # docker-compose: Postgres + pgvector, Redis
```

## Roadmap

- [x] W1: planner, factory, parallel agents, board, critic loop, budget, CLI
- [ ] W1: pass a few real runs; hand-check citations
- [ ] W2: Redis pub/sub board, Postgres + pgvector (claim dedupe), Inngest durability, Langfuse traces
- [ ] W2: agents answer each other's `question` messages
- [ ] W3: Next.js live agent graph, agent builder + templates, budget slider, debate mode
- [ ] W3: evals (citation faithfulness, single vs multi-agent), README charts, demo video

## Portfolio lineup

| # | Project | Known for | Status |
|---|---|---|---|
| 1 | Voice agent | Real-time latency | Planned |
| 2 | Terminal coding agent | Agent loop + safe tool execution | Planned |
| 3 | NotebookLM clone | Retrieval quality | In progress |
| 4 | **Hive** | Multi-agent orchestration + evals | **Building** |
| 5 | DocIntel | Fine-tuning, self-hosted serving, scale | After 1–4 |
