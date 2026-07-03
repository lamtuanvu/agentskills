# build-feature — T2 · Implementation (Classify → Adversary → Loop, min 2)

**Use when:** implement a feature that ALREADY has acceptance criteria / milestones,
make all ACs pass, close out bugs. (No plan yet? Use `plan-and-build`.)

**Goal:** every AC PASS ∧ 0 high/critical bugs ∧ milestones DONE.

## Moves
- **move0 [Classify]:** pick the exec skill (`ECC | superpower | …`) by task + context;
  a dev task MUST run the cadence below.
- **discovery:** pick the highest OPEN item — `bug≥HIGH > AC=FAIL > milestone-not-started`.
- **handoff:** 1 item → implementer (chosen skill), isolated worktree.
- **verify [Adversary]:** `ac-verifier` (evidence-based; the ONLY role that may set
  AC=PASS) + `bug-hunter` (assume bugs; runs even if all AC pass; tags severity).
- **persist:** `ac_status, open_bugs{sev,repro}, milestones, fixed_log`.
- **cadence:** ≥2 iters — plan→impl→review→update-progress, then plan-to-close-gaps→impl→review.
- **schedule [Loop]:** gate dormant until iter≥2; RETRY → discovery (high/crit first);
  PASS → PR + ticket.

## Gate
All AC PASS ∧ 0 sev≥HIGH ∧ milestones DONE.

## Rules
Implementer can't self-PASS an AC · never edit a test to make it pass · never
downgrade severity.

## Guardrails
`min_iter 2` · `max_iter <ask>` · `breaker 3` · `severity_floor HIGH`.

## Workflow shape
Loop (min 2 rounds): each round `pipeline(openItems, implementer{worktree}, verify)`
where verify = parallel(`ac-verifier`, `bug-hunter`) with a model/agent different
from the implementer. Gate evaluated from iter 2 onward.
