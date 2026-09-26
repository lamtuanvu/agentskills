---
name: loop-templates
description: >
  Run a task as a self-verifying agentic loop (discovery → handoff → verify →
  persist → schedule, gated by a hard measurable check). Use when the user wants
  to research a topic with cited sources, build/implement a feature, fix a bug at
  root cause, review a PR/diff, write a PRD, design an architecture, benchmark and
  pick the best variant, onboard/map a codebase, compare tools/products, or learn
  to use an SDK/API — especially when they say "loop on this", "keep going until
  done", "run autonomously", or want adversarial verification. Routes the request
  to the matching loop pattern by INTENT; the user never needs a template number.
---

# Loop Templates

A pack of 11 agentic loop patterns. Each runs the same contract: **read the state
file every turn, do ONE gated step, verify with a DIFFERENT agent/model than the
one that produced the work, persist state to disk, then loop or stop.** Proceed
autonomously and auto-accept your own recommendation — but only *after* the gate
passes. Touch the human only on STUCK, circuit-breaker, or a prohibited action.

## How to use this skill

1. **Route by intent** — match the user's request to a pattern using the table
   below. Do NOT ask the user for a template number. If two patterns fit, pick the
   closer one and state which you chose in one line; only ask if genuinely
   ambiguous. The user may also name a pattern directly (`fix-bug`, `review-code`, …).
2. **Read the pattern file** — `references/<name>.md`. It defines goal, moves,
   gate, guardrails, and the Workflow shape.
3. **Create the state file** — copy `templates/state.md` to
   `.loop/<slug>-<short-task>/state.md` in the working repo. This is the source of
   truth. Fill goal, gate, guardrails, and start an empty `adr_log`. Also create
   `adr_log.md` next to it. (Skip for a single background run where you just want
   the workflow's returned report.)
4. **Execute** — each pattern ships as a **bundled Workflow script of the same name**
   at `${CLAUDE_PLUGIN_ROOT}/workflows/<slug>.js` (installed with this plugin, stable
   path in every repo, no dependence on `~/.claude/workflows/`). Prefer running it
   directly: `Workflow({ scriptPath: "${CLAUDE_PLUGIN_ROOT}/workflows/<slug>.js", args: {...} })`
   (or `/workflows` to watch it). The globally-saved `Workflow({ name: "<slug>" })`
   form still works if the same name is registered. The script implements the
   fanout/adversary/tournament/loop and RETURNS a structured result with a `status`
   field (`DONE` | `STUCK` | `BLOCKED` | `APPROVED` | `CHANGES_REQUESTED` |
   `CONSISTENT` | `INCONSISTENT`). If path resolution ever fails, author the script
   inline from the pattern's "Workflow shape" section instead. Each verify step MUST
   use a different agent/model than the generator (the scripts already do this).
5. **Each turn** (state-file / cross-turn mode) — re-read the state file, emit
   exactly ONE runnable next step, run it, update state + `adr_log`, evaluate the
   gate. Keep any single emitted prompt ≤ 4000 characters; larger artifacts go to
   files (never inline them — data loss risk).
6. **Stop conditions** — gate PASS + the pattern's stop condition (usually
   saturation: nothing new found). A saved workflow cannot pause for a human
   mid-run, so it returns `status: "STUCK"` with a `reason` instead; **you** surface
   that to the human via `AskUserQuestion` and, if they choose to continue, re-invoke
   the workflow with adjusted `args`. Never retry-forever — respect `max_iter`.

### Two execution modes

- **One-shot background run (default for report/analysis patterns):** just call
  `Workflow({ name, args })`, read the returned result, relay it. No state file
  needed. Best for `cited-research`, `compare-options`, `map-codebase`,
  `review-code`, `benchmark-select`, `design-architecture`, `write-prd`,
  `learn-to-use`.
- **Stateful cross-turn loop (for repo-mutating implementation patterns):** keep the
  `.loop/<task>/state.md` + `adr_log.md`, run the workflow (or its sub-steps) each
  turn, and gate progress between turns so you can checkpoint / escalate. Best for
  `fix-bug`, `build-feature`, `plan-and-build` (these mutate files via worktrees and
  benefit from a human checkpoint on STUCK).

## Routing table (intent → pattern)

| If the user wants to… | Pattern (`references/…`) | Was |
|---|---|---|
| Research a topic, fact-check, find claims that survive scrutiny with sources | **`cited-research`** | T1 |
| Implement a feature that already has ACs/milestones, make all tests pass | **`build-feature`** | T2 |
| Write a PRD / spec with testable acceptance criteria, grounded in research | **`write-prd`** | T3 |
| Design an architecture / choose an approach among candidates | **`design-architecture`** | T4 |
| Benchmark variants/configs and prove the best on a trusted benchmark | **`benchmark-select`** | T5 |
| Onboard to / map a codebase — structure, domains, entry points, risks | **`map-codebase`** | T6 |
| Fix a bug at root cause with repro + regression, no symptom patch | **`fix-bug`** | T7 |
| Build a feature from scratch (plan first, then implement to done) | **`plan-and-build`** | T8 |
| Compare tools/products/repos, competitive analysis vs our stack | **`compare-options`** | T9 |
| Learn to use an SDK/product/repo — get a verified runnable recipe | **`learn-to-use`** | T10 |
| Review a finished feature diff/PR — right thing + thing done right | **`review-code`** | T11 |

Disambiguation: **`build-feature`** assumes a plan/ACs already exist; **`plan-and-build`**
creates the plan first. **`cited-research`** answers a question; **`compare-options`**
scores named candidates on a rubric; **`learn-to-use`** produces a runnable how-to.

The routing name IS the saved-workflow name. Typical `args` per pattern:

| name | args |
|---|---|
| `cited-research` | `{ question, max_iter? }` |
| `build-feature` | `{ spec, max_iter? }` |
| `write-prd` | `{ goal, context? }` |
| `design-architecture` | `{ goal, context?, min_candidates? }` |
| `benchmark-select` | `{ goal, variants[], max_iter? }` |
| `map-codebase` | `{ path, max_iter? }` |
| `fix-bug` | `{ bug, max_iter? }` |
| `plan-and-build` | `{ task, max_iter? }` |
| `compare-options` | `{ goal, candidates[], context?, max_iter? }` |
| `learn-to-use` | `{ target, goal?, max_iter? }` |
| `review-code` | `{ intent, diff? }` |

Every pattern also accepts `{ task }` as a generic fallback for its primary input.

### dev-cycle engines (used by the `dev-cycle` plugin)

Three engines target a feature's spec → plan → tasks artifacts. They are invoked by
the `dev-cycle` union at specific step boundaries, but run standalone too. All accept
an optional `governance` string — the project-governance context packet (constitution,
context index and applicable rule paths/IDs) — which grounds every agent.

| name | role | args |
|---|---|---|
| `implement-tasks` | **generative** — implement file-disjoint task groups in parallel isolated worktrees; each group gated by a MEASUREMENT verify (ac-verifier RUNS the group tests, keys on exit code) + bug-hunter, min-2-round loop + circuit breaker; one test-writer per group (test-files only). | `{ feature, spec_path?, plan_path?, tasks_path?, governance?, groups[], ungrouped[], max_iter?, circuit_breaker? }` |
| `plan-review` | **verification (default-on)** — perspective-diverse reviewer personas (`project-governance:*-reviewer` agentTypes) → dedup → refute-verify CRITICAL/HIGH → severity-blocking; persists `docs/features/<feature>/reviews/plan-review.md`. | `{ feature, plan_path?, spec_path?, reviews_dir?, governance? }` |
| `analyze-consistency` | **verification (default-on)** — pairwise cross-artifact checks (spec↔plan, plan↔tasks, tasks↔spec) → reconcile; persists `docs/features/<feature>/reviews/analyze.md`. | `{ feature, spec_path?, plan_path?, tasks_path?, reviews_dir? }` |

`groups`/`ungrouped` for `implement-tasks` are the JSON produced by dev-cycle's
`scripts/partition_tasks.py <tasks.md> --max-groups N` (connected-components by
shared file — no two parallel groups touch the same file). All three accept the
`model_*` tier overrides. `implement-tasks` returns `{ status, completed_task_ids[],
completed_groups[], failed_groups[], bugs }`. `plan-review` needs the
`project-governance` plugin installed for its reviewer agentTypes.

## Shared conventions (apply to every pattern)

- **Moves**: `discovery` (find this turn's work) · `handoff` (do it, isolated) ·
  `verify` (independent agent says no) · `persist` (write state to disk) ·
  `schedule` (loop / stop).
- **Verify must differ** from the generator in instruction and/or model. A verifier
  is prompted to REFUTE, not to agree.
- **Gate = hard + measurable.** "done" = gate PASS, never the generator's opinion.
- **State file is the source of truth** — the agent forgets between turns; the file
  doesn't. Re-read it each turn.
- **Guardrails** (defaults, override per task): `max_iterations`, `circuit_breaker: N`
  (N same-reason failures → STUCK → human). Cap candidates/iterations; escalate,
  don't retry forever.
- **Autonomy**: run autonomously and auto-accept your recommendation — but ONLY
  after it clears the gate/adversary (auto-accept ≠ skip the gate). Record every
  accepted decision as an **ADR** in `adr_log` (`context · options · decision ·
  rationale · consequences · assumptions`).
- **Symbols**: `∗` = expand to that pattern's full template · `‖` = freeze gate
  (output frozen before the next stage consumes it).
- **Prompt cap**: any emitted next-step prompt ≤ 4000 chars; large artifacts go to
  files.

## Model policy (smart / speed / economy)

Every workflow uses a 3-tier model policy, chosen per stage:

- **`fast` (default `haiku`)** — trivial mechanical stages: classify, decompose,
  route, low-stakes review lens.
- **`work` (default `sonnet`)** — the bulk: research, exploration, drafting,
  implementation, synthesis, benchmarking.
- **`judge` (default `opus`)** — the correctness-critical stages that must NOT be
  cheaped out: adversary/red-team, gates, critics, tournaments, ac-verifier,
  reflect-gate, root-cause gate. These also run at `effort: 'high'`.

Override per run via args: `{ model_fast, model_work, model_judge }` (accepts
`haiku` | `sonnet` | `opus` | `fable`). Example — cheapest useful pass:
`Workflow({ name: "map-codebase", args: { path: "modules/", model_work: "haiku", model_judge: "sonnet" } })`.
Example — max rigor: set all three to `opus`. `plan-and-build` threads these knobs
down into the `build-feature` sub-runs.

## Workflow tool mapping

The harness Workflow tool implements the pattern verbs directly:

- **Fanout** → `parallel()` / `pipeline()` (prefer `pipeline` — verify each item as
  soon as its work completes).
- **Adversary** → adversarial-verify: N skeptic agents (diverse lenses), a different
  `agentType`/`model` than the generator, prompted to refute; kill on majority-refute.
- **Tournament** → judge-panel: score candidates pairwise on the decision criteria,
  synthesize from the winner.
- **Loop** → loop-until-dry (stop after K rounds find nothing new) or
  loop-until-count.
- **gate** → a verify agent returns a structured PASS/FAIL verdict; advance only on
  PASS.
- **persist** → write the pattern's `persist:` keys into the state file each turn.
