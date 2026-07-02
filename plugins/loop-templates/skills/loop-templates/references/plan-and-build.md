# plan-and-build — T8 · Plan → Implement (standalone) (Fanout(scan) → Classify(size) ‖plan gate‖ → Classify → Adversary → Loop, min 2)

**Use when:** build a feature from scratch — plan it first, then implement to done.
(Plan/ACs already exist? Use `build-feature`.)

**Goal:** a right-sized plan (milestones × testable AC) implemented to done — every
AC PASS ∧ 0 high/critical ∧ all milestones DONE.

## PLAN STAGE
- **discovery [Fanout]:** scan the codebase area(s) the task touches; collect affected
  modules, constraints, risks.
- **handoff(plan) [Classify size]:** assess task size from scan + context →
  `small → 1 milestone, N AC`; `large → M milestones (each independently shippable),
  each N AC`. Every AC measurable · milestone deps explicit + ordered · AC-per-milestone
  bounded (no mega-milestone).
- **verify(plan) [Adversary]:** plan-critic — every AC testable ∧ each milestone
  independently verifiable w/ a clear done-condition ∧ sizing fits (not over/under-split)
  ∧ no missing AC ∧ deps ordered.
- **persist:** `plan{milestones×ac}, sizing_rationale, deps, affected_modules, risks`.
  `‖` freeze as the impl contract.
- **rule:** NO implementation before the plan-gate PASSES.

## IMPLEMENT STAGE (walk the plan; min 2 iters per milestone)
- **move0 [Classify]:** pick exec skill (`ECC | superpower | …`) by task + context.
- **discovery:** pick highest OPEN item — `bug≥HIGH > AC=FAIL > milestone-not-started`.
- **handoff:** 1 item → implementer (chosen skill), isolated worktree.
- **verify [Adversary]:** `ac-verifier` (evidence; ONLY role that may set AC=PASS) +
  `bug-hunter` (assume bugs; runs even if all AC pass; tags severity).
- **persist:** `ac_status, open_bugs{sev,repro}, milestones, fixed_log`.
- **cadence:** ≥2 iters — plan→impl→review→update-progress, then plan-to-close-gaps→impl→review.
- **schedule [Loop]:** gate dormant until iter≥2; RETRY → discovery (high/crit first);
  PASS milestone → next. If impl proves an AC wrong/missing → localized re-plan of THAT
  milestone only (never replan the whole plan).

## Gate
Per milestone — all AC PASS ∧ 0 sev≥HIGH ∧ DONE; overall — no goal left uncovered.

## Rules
Implementer can't self-PASS AC · never edit a test to pass · never downgrade severity ·
new AC → explicit re-plan (no silent scope growth).

## Guardrails
`max_iter(plan) 2` · `min_iter(impl) 2` · `max_iter(impl) <ask>` · `breaker 3` ·
`severity_floor HIGH` · `localize_not_restart`.

## Workflow shape
Phase 1 (plan): fanout scan → size classify → barrier at plan-gate (adversary
plan-critic, different model) → freeze the plan. Phase 2 (impl): per milestone, the
`build-feature` loop (min 2 rounds), verify = parallel(ac-verifier, bug-hunter).
Localized re-plan of a single milestone on AC-wrong, never a full restart.
