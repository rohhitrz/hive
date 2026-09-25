# Hive UI v1: Product Requirements

## 1. Summary

Hive is a multi-agent research orchestrator. A lead agent plans research, generates specialist
sub-agents at runtime, runs them in parallel on a shared board, has a critic fact-check every
claim, fills gaps in further rounds, and writes a cited report.

The core engine already exists as a TypeScript library + CLI. **v1 adds a web UI** that lets a user
start a run, watch the agents work live, inspect any agent, read the cited report, and replay past runs.

## 2. Goals

- Make the multi-agent process **visible**: who was spawned, what each agent is doing, what it found,
  what the critic disputed, and what it cost.
- Make every run **replayable** from saved events (demo backup + history).
- Keep the UI a pure view of an **event stream**, so moving execution to Inngest later changes nothing in the UI.

## 3. Non-goals (v1)

- Agent builder / saved templates (v1.1)
- Debate mode (v1.1)
- User accounts, public rate limits, bring-your-own-key (when deployed publicly)
- Durable execution via Inngest, Redis board, pgvector (week 2 backend work)
- Mobile agent graph (mobile shows feed + report only)
- Evals dashboard (week 3)

## 4. Users

- **Primary:** an interviewer or hiring manager watching a demo or opening a replay link.
- **Secondary:** the builder (Rohit) running real research goals and debugging agent behavior.

## 5. Screens

### 5.1 New run (`/`)
- Goal textarea (required, 10–1000 chars)
- Depth presets that set budget, max agents, and max rounds:
  - **Quick:** $0.15, 4 agents, 1 round
  - **Standard:** $0.50, 8 agents, 2 rounds (default)
  - **Deep:** $1.50, 14 agents, 3 rounds
- "Advanced" toggle exposing the three numbers directly (budget $0.10–$2.00)
- Mode selector showing only "Research" (field exists for later modes)
- Start button → creates the run and navigates to `/runs/[id]`
- Below the form: the 5 most recent runs (goal, status, cost, date) linking to their run page

### 5.2 Run view (`/runs/[id]`), both live and replay
Layout (desktop): **status bar** on top, **agent graph** in the center, **feed panel** on the right,
**inspector** as a slide-over drawer from the right.

**Status bar**
- Goal (truncated, full text on hover)
- Phase: Planning / Researching (round N) / Critiquing (round N) / Synthesizing / Done / Failed / Cancelled / Interrupted
- Cost meter: `$spent / $budget` with a progress bar that turns amber above 80%
- Agents spawned: `n / max`
- Elapsed time
- Cancel button (live runs only)
- For replays: a "Replay" badge + speed control (1×, 4×, instant)

**Agent graph**: see ARCHITECTURE.md §6 for node and edge rules.
- Node states: spawning, researching (pulsing), done, failed
- Each agent node shows its role, number of findings posted, and cost
- Clicking a node opens the inspector

**Feed panel** (tabs)
- **Board:** every board entry in order (findings, questions, disputes), newest at the bottom, auto-scroll
  unless the user scrolled up. A finding shows claim, source domain, confidence, and posting agent.
- **Disputes:** only disputed findings, each with the critic's reason.
- **Report:** enabled once the run is done (see 5.3).

**Inspector drawer** (for the selected agent)
- Role, objective, generated system prompt (collapsible), step budget
- Step timeline: each tool call with its name, input summary, and result summary, streaming live
- Findings posted by this agent, with dispute status
- Final summary text, or error message if failed
- Cost for this agent

### 5.3 Report view (Report tab)
- Markdown report rendered with inline citations `[n]`
- Hovering a citation shows claim + source URL; clicking opens the source in a new tab
- "Disputed claims excluded from the report" section at the bottom (collapsible)
- Copy-as-markdown button

### 5.4 History (`/runs`)
- Table: goal, status, agents, cost, duration, created date
- Row click → run view (replay mode if the run is finished)

## 6. Functional requirements

| ID | Requirement |
|---|---|
| F1 | Starting a run returns within 1 second; the run continues in the background |
| F2 | Events reach the browser within 1 second of being emitted |
| F3 | Every event is persisted before being sent to clients |
| F4 | Reloading `/runs/[id]` mid-run shows the full state so far, then continues live |
| F5 | Finished runs replay from stored events using the same UI |
| F6 | Cancel stops the run within 10 seconds, keeps partial results, and still writes a report if any findings exist |
| F7 | A failed sub-agent shows as failed; the run continues |
| F8 | A run left "running" after a server restart is shown as Interrupted |
| F9 | Cost meter updates after every agent step, not just at the end of each agent |
| F10 | API keys never reach the browser |

## 7. Non-functional requirements

- **Performance:** graph stays smooth (no visible jank) with 20 agent nodes and 500 events
- **Reliability:** no UI crash from any single malformed or unexpected event; unknown event types are ignored
- **Security:** if `HIVE_BASIC_AUTH` is set, every page and API route requires it
- **Local setup:** `docker compose up -d` (Postgres) + `.env` + `pnpm dev` runs everything

## 8. Success criteria (definition of done)

1. Enter a goal → agents appear live in the graph → open any agent and see its steps → read the cited report
2. Refresh mid-run → state is fully restored and keeps updating
3. Any past run replays at 1×, 4×, or instantly
4. Killing one agent (e.g., forcing a tool error) marks it failed without breaking the run or the UI
5. Cancel works and the run ends as Cancelled with partial results
6. Typecheck and tests pass
