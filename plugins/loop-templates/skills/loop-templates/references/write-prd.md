# write-prd — T3 · Research → PRD (Research∗ ‖ Gen+Filter → Adversary)

**Use when:** write a PRD/spec with testable acceptance criteria and milestones,
grounded in real research (not vibes).

**Goal:** a PRD with testable AC + milestones, grounded in frozen research.

## Moves
- **stage1:** run `cited-research` (T1) → `‖` freeze the surviving claims as grounding.
- **discovery:** from grounding + our_context → PRD scope.
- **handoff [Gen+Filter]:** generate 2–3 PRD framings → filter by rubric (AC testable?
  scope coherent? assumptions surfaced?); discard the rest.
- **verify [Adversary]:** critic checks each AC is verifiable ∧ scope is
  non-overlapping ∧ assumptions are explicit.
- **persist:** `prd_draft, ac_list(testable), milestones, assumptions, rejected_framings`.

## Gate
Every AC measurable ∧ scope coherent ∧ no hidden assumption ∧ grounding cited.

## Guardrails
`max_iter 3` · `2-3 framings`.

## Workflow shape
Phase 1: run the `cited-research` workflow, freeze output. Phase 2:
`parallel(3 framings)` → filter by rubric (barrier: pick best) → adversary critic
(different model) checks AC testability + scope + assumptions. Loop until gate PASS.
