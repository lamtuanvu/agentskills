# learn-to-use — T10 · Learn-to-Use (Fanout(primary src) → Execute(sandbox) → Adversary(staleness) → Loop)

**Use when:** learn to use an SDK/product/repo, get a minimal working example, "how do
I set up / call X", produce a verified how-to.

**Inputs:** `target(sdk|product|github) · goal` (what we need it to DO) · (optional)
`our_context`.

**Goal:** a RUNNABLE instruction, zero → goal achieved: `prereqs · install(pinned) ·
minimal working example · goal-specific recipe · gotchas/common errors · a "verify it
works" step`.

## Moves
- **discovery:** identify the MINIMAL capability path for the goal (not the full docs);
  later turns = "the step that failed on execution".
- **handoff [Fanout]:** read PRIMARY sources — official docs + the repo's ACTUAL
  code/tests/examples (blog tutorials = echo: tag + distrust). Draft steps WITH version
  pins + as-of date; minimal ORIGINAL example code (don't paste long tutorials); cite +
  honor license.
- **verify [Execute + Adversary]:** EXECUTE every step in a CLEAN sandbox —
  `written ≠ verified, executed = verified`. Any erroring step is a finding. Adversary:
  versions pinned? prereqs complete? deprecated API? hidden local state? (no sandbox →
  trace against actual source + tests, never memory).
- **persist:** `instruction_draft, version_pins(asof), step_exec_status, gotchas,
  errors_log, sources(official|code|blog)`.
- **schedule [Loop]:** failed step → discovery (fix that step); stop = the full minimal
  path runs clean end-to-end.

## Gate
Minimal path executes end-to-end on a CLEAN env @ pinned versions ∧ achieves the goal ∧
every step executed (not just written) ∧ gotchas + common errors listed ∧ sources
primary ∧ (if our_context) integration notes vs our stack.

## Guardrails
`max_iter 3` · `breaker 2` · recency: pin versions, flag docs older than `<window>`.

## Workflow shape
`parallel(primary sources → draft steps)` then EXECUTE each step in a clean sandbox
(Bash) — execution is the verifier. Adversary (different model) audits for staleness /
missing prereqs / deprecated APIs. Loop on any failing step until the whole minimal
path runs clean.
