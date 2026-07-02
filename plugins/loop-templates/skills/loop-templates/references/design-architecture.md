# design-architecture — T4 · Research → Design (Research∗ ‖ Tournament → Adversary)

**Use when:** design an architecture, choose among approaches, "how should we
structure this", pick a design that fits our constraints.

**Goal:** architecture fitting our data/constraints/goal; every decision cites its
grounding.

## Moves
- **stage1:** run `cited-research` (T1) → `‖` freeze a grounding-doc
  (`glossary, traps, constraints, decision_criteria`).
- **discovery:** generate ≥2 FUNDAMENTALLY different candidates. Later turns =
  the decision that broke fit / broke an assumption.
- **handoff:** each candidate → architect; every decision records the grounding-fact
  + the assumption it rests on.
- **verify:** `fit-critic` (vs OUR context, NOT best-practice) + `tradeoff-devil`
  [Tournament: pairwise vs decision_criteria, force each to state its trade-off] → design-gate.
- **persist:** `candidates, chosen, decision_log, assumption_ledger, fit_report, tradeoff_matrix`.
- **schedule:** RETRY(design) → fix the dependent branch only; RETRY(grounding broke)
  → query decision_log for dependents, redo ONLY those (localize, never nuke).

## Gate
Clear winner ∧ every decision cited ∧ high-risk assumptions validated ∧ fit PASS.

## Guardrails
`min_candidates 2` · `max_iter 3/stage` · `breaker 2` · `localize_not_restart`.

## Workflow shape
Phase 1 research → freeze grounding-doc. Phase 2 judge-panel/tournament:
`parallel(≥2 candidates → architect)` then pairwise scoring on decision_criteria by a
`fit-critic` + `tradeoff-devil` (different model). Synthesize from the winner;
on breakage re-run only dependent decisions (localize).
