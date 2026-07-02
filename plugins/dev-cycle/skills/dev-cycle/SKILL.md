---
name: dev-cycle
description: >
  Run a feature end-to-end through the team dev cycle: the SpecKit pipeline (spine) +
  loop-templates workflows (adversarial compute engines) + a swappable git-ops tracker
  projection + a browser-driven E2E validation harness. Use when the user says "start
  working on <feature>", "take this ticket through the cycle", "build and track <X>", or
  wants a tracking ticket created/moved as work progresses. General and distributable —
  it knows nothing about a specific project's GitHub/branches/stack; it hooks those in
  through the git-ops event contract and a validation provider, both selected via
  .dev-cycle/config.json.
---

# Dev cycle (the union)

Compose four things — **don't fuse them**:

- **Control plane — `speckit-orchestrator` (the spine).** Stateful, resumable,
  human-gated pipeline: specify → clarify → plan → plan-review → tasks → analyze →
  implement → test-and-fix → review-loop. Owns the pipeline cursor (state in
  `docs/features/<feature>/orchestrator-state.json`, matched by git branch) and fires
  the lifecycle events below.
- **Compute plane — loop-templates workflows (pure engines).** `write-prd`,
  `design-architecture`, `speckit-implement`, `plan-review`, `analyze-consistency`,
  `fix-bug`, `review-code`, etc. Invoked AT specific steps, run in the background,
  return structured artifacts. **They never touch the tracker.**
- **Projection — the tracker = shared truth via `git-ops`.** The union emits lifecycle
  events; git-ops projects them onto whatever tracker the project configured. This is a
  one-directional mirror of the pipeline. Never drive the pipeline FROM the tracker.
- **Validation — a browser-driven E2E harness.** The test-and-fix phase drives the real
  running app through a browser and judges it like a human, via a per-project validation
  provider implementing the validation contract.

**Golden rule:** the union mutates the tracker ONLY through `git-ops on <event>`. Every
event handler is an idempotent *reconcile* (safe to re-run on stop-hook re-entry). Never
hand-write `gh`/GraphQL/tracker API calls for lifecycle ops.

## Required co-installs

- **`speckit-orchestrator`** — the pipeline spine + `partition_tasks.py`.
- **`loop-templates`** — the Workflow engines (invoked by `scriptPath`).
- **`git-ops`** (optional) — the tracker/SCM adapter. Absent → tracker projection runs
  in **pure mode** (logs intent, mutates nothing).
- **a validation provider** (optional) — E2E harness backend. Absent → E2E tiers skip.

## Provider discovery & config

Resolve adapters in order: (1) `.dev-cycle/config.json` at repo root; (2) env vars
(`DC_OWNER`/`DC_REPO`/`DC_PROJECT`/`DC_ASSIGNEE`, `DEV_CYCLE_DRYRUN`); (3) installed
plugin defaults via `${CLAUDE_PLUGIN_ROOT}`; (4) none → run pure (log skipped
projection). `provider` selects the git-ops plugin; `validation.provider` selects the
validation-provider plugin. Either absent → that concern runs pure/skipped.

```json
{
  "provider": "github",
  "tracker": { "owner": "your-org", "repo": "your-repo", "project": 1,
    "statuses": ["Backlog","Ready","In progress","In review","Done"], "done_autocloses": true },
  "scm": { "branch_prefix": "NNN-kebab", "commit_convention": "conventional", "pr_closes_parent": true },
  "validation": { "provider": "your-validation-provider", "driver": "chrome", "scenarios_dir": "e2e/scenarios" },
  "loops_default": ["speckit-implement","review-code"]
}
```

## Kickoff opt-in (once per feature)

Only **generative** loops are opt-in (verification loops run by default — see below).
At kickoff, issue **one `AskUserQuestion`** (multi-select), pre-checking any boxes named
in `config.loops_default`:

> Which generative loop engines should run this feature? (each ~300–500k tokens)
> ☐ write-prd (spec) ☐ design-architecture (plan) ☐ speckit-implement (impl, parallel+gated)
> ☐ review-code (review) ☐ auto-run fix-bug if test-and-fix fails

- `fix-bug` is a **pre-authorization** (reactive — you don't know at kickoff whether
  tests fail).
- **Persist the selection ONCE** into `orchestrator-state.json` (alongside the pipeline
  cursor so it survives stop-hook re-entry/resume) and consume it at each boundary —
  **never re-prompt mid-run.**
- **clarify stays a human gate** — never automate it.

## Loop ↔ step mapping (owned by the union)

| Step | Engine | Kind | Trigger |
|---|---|---|---|
| specify | `write-prd.js` | generative | opt-in |
| plan | `design-architecture.js` | generative | opt-in |
| **plan-review** | **`plan-review.js`** | verification | **default-on** |
| tasks | inline completeness critic | verification | **default-on** (light) |
| **analyze** | **`analyze-consistency.js`** | verification | **default-on** |
| **implement** | **`speckit-implement.js`** | generative | default when implement loop opted-in |
| test-and-fix | `fix-bug.js` | reactive | on `needs_resolve` (pre-authorized at kickoff) |
| review-loop | `review-code.js` | verification | opt-in |

**Quality principle:** catching a defect upstream (plan-review/analyze) is 10–100×
cheaper than at implement/review, so **verification Workflows run by default**
(they read artifacts, write no code, are cheap) while **generative Workflows are
opt-in** (expensive, produce code/artifacts).

Invoke engines via **`scriptPath`** (not `name` — `Workflow({name})` runs a cached
snapshot):
`Workflow({ scriptPath: "${CLAUDE_PLUGIN_ROOT-loop-templates}/workflows/<name>.js", args })`
where the loop-templates plugin root is the install path of that plugin. A loop
returning `{status:"STUCK"|"BLOCKED"}` is a human-escalation, not a step failure —
surface it (see Autonomy).

## How the union drives the implement step

Default implement executor = **`speckit-implement.js`** (speckit's native agent-teams
implement is kept only as a fallback when Workflow is unavailable). At the `implement`
boundary:

1. `python ${speckit}/scripts/partition_tasks.py specs/<feature>/tasks.md --max-groups <N>`
   → group JSON `{parallelizable, groups[{id,tasks[],files[]}], ungrouped[]}`.
2. Write `implement: in_progress` + a `team_state`-style marker to
   `orchestrator-state.json`.
3. `Workflow({ scriptPath: "<loop-templates>/workflows/speckit-implement.js",
   args: { feature, spec_path, plan_path, tasks_path, groups, ungrouped, max_iter } })`,
   await it.
4. On `DONE`: fire `task.completed` to git-ops for **each** returned `completed_task_ids[]`
   entry (ticks the tracker checklist); write `implement: completed`; advance
   `current_step`. On `STUCK`: write `needs_resolve` and escalate (the stop hook
   surfaces it).

## Reactive loops (hooks on existing states)

- `test-and-fix → needs_resolve` → if `fix-bug` was pre-authorized, invoke `fix-bug.js`
  (adversarial root-cause + repro + regression) instead of immediately pausing. Feed it
  the failing E2E scenario + `ai-report.json` + screenshots as the repro.
- `review-loop` → if opted-in, invoke `review-code.js` against the branch diff.

## Verification engines (default-on)

- **`plan-review.js`** replaces speckit's agent-teams reviewer phase: perspective-diverse
  reviewer personas → dedup → refute-verify → severity-blocking → writes
  `specs/<feature>/reviews/plan-review.md`. No `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`
  flag.
- **`analyze-consistency.js`** replaces speckit's single-threaded analyze: pairwise
  spec↔plan / plan↔tasks / tasks↔spec → reconcile → writes `reviews/analyze.md`.
- **tasks completeness critic** — one inline adversarial "what's missing/uncovered?"
  agent appended to the tasks step (NOT a full engine — a loop here would be token
  waste). Catches a missing task before partitioning.

## E2E validation harness (test-and-fix)

The test-and-fix phase must drive the **real running app through a browser and judge it
like a human**. The general harness lives in this plugin; each project ships a
validation provider implementing the **validation contract** (see
`references/validation-contract.md`): `bring_up`, `seed`, `auth_session`,
`drive_scenario`, `assert`, `reset`, `teardown`.

**Tier ladder (union-owned, general):**
1. unit (`cargo test` / `vitest` / etc.) →
2. API E2E →
3. UI E2E scripted (Playwright) →
4. **agentic human-mimic** — `${CLAUDE_PLUGIN_ROOT}/workflows/e2e-agentic.js` via the
   provider's `bring_up` + `auth_session` + scenarios; drives real UI flows through a
   browser MCP and does **ai-judge** screenshot assertions.

On failure → `fix-bug.js` (if pre-authorized) with the provider's `ai-report`/failing
scenario/screenshots as the repro. The same `drive_scenario` result is the **measurement
signal** for `speckit-implement.js`'s gate. **No `validation.provider` set → E2E tiers
skip gracefully** (like git-ops pure mode). See `references/scenario-schema.md` for the
declarative scenario format and `references/driver-abstraction.md` for driver choice.

## Autonomy

Tracker writes are **fully autonomous**: fire events at each step boundary without
asking. Escalate to the human ONLY on: a loop returning `STUCK`/`BLOCKED`, a failing
gate, or a genuine product decision (e.g. an unresolved PRD "Open question"). On those,
fire `git-ops on blocked` (labels + comments, does NOT green the status) and stop — do
not advance the ticket. **clarify** always stops for the human.

## Lifecycle events (union → git-ops)

Fire with `git-ops on <event> --json '<payload>'` (see git-ops README for the full
contract). Unknown events no-op; handlers are idempotent.

| Event | When | Payload |
|---|---|---|
| `feature.kickoff` | start | `{slug,title,target_date?}` |
| `spec.done` | after specify/clarify | `{slug,spec_path,summary_path?}` |
| `plan.done` | after plan + plan-review | `{slug,plan_path,reviews?}` |
| `tasks.done` | after tasks | `{slug,tasks_path}` |
| `task.completed` | per implemented task | `{slug,task_id,task_desc}` |
| `pr.opened` | PR created | `{slug,pr_number,branch}` |
| `review.done` | after review | `{slug,verdict}` |
| `merged` | PR merged | `{slug,pr_number}` |
| `blocked` | escalation | `{slug,reason,step}` |

## How to run a feature

1. **Kickoff.** Derive a kebab `<slug>`. Issue the opt-in prompt, persist the selection.
   `git-ops on feature.kickoff --json '{"slug":…,"title":…,"target_date":…}'` (ensures
   the tracking ticket + branch).
2. **Spec.** `speckit.specify`/`clarify` (opt-in `write-prd` for grounding). Then
   `git-ops on spec.done`.
3. **Plan.** `speckit.plan` (opt-in `design-architecture`). Run `plan-review.js`
   (default-on) → `git-ops on plan.done` with the reviews.
4. **Tasks.** `speckit.tasks` + inline completeness critic → `git-ops on tasks.done`
   (syncs the checklist into the ticket).
5. **Analyze.** `analyze-consistency.js` (default-on). BLOCKED → `git-ops on blocked`.
6. **Implement.** Partition → `speckit-implement.js` → per `completed_task_ids`, fire
   `git-ops on task.completed`.
7. **Test-and-fix.** Run the E2E tier ladder; on failure, reactive `fix-bug.js`.
8. **PR + close.** Open the PR (`Closes #<parent>`) → `git-ops on pr.opened`
   (Status→In review). Run `review-code.js` (opt-in) → `git-ops on review.done`. On
   merge → `git-ops on merged` (reconciles Status→Done, which auto-closes).

## Gotchas (learned)

- **Workflow `args` arrive as a JSON string** — engines already `JSON.parse`; new ones
  must normalize at the top.
- **`Workflow({name})` = cached snapshot** — use `scriptPath` for edited/bundled engines.
- **Subagent cwd defaults to the MAIN checkout** — parallel implementers must pin
  cwd+branch (speckit-implement uses `isolation: 'worktree'` on file-disjoint groups).
- **`Closes` ≠ Status move** — the `merged` event reconciles Status to Done explicitly.
- **Never cycle to Done in a dry-run** on a done-autocloses board — it closes the issue;
  stop at "In review".
- **Don't run the whole pipeline as one background Workflow** — you need step boundaries
  for human gates + tracker sync; await each engine at its boundary, then advance.
