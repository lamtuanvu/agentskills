# benchmark-select — T5 · Implementation → Benchmark (Implement∗ → Fanout → Tournament → Adversary(harness))

**Use when:** decide which implementation/config is best by measuring it, benchmark
variants, prove the winner on a trusted benchmark.

**Goal:** a chosen implementation/config proven best on a TRUSTED benchmark.

## Moves
- **stage1:** run `build-feature` (T2) to a passing baseline.
- **discovery:** define the metric(s) + benchmark scenarios from the goal.
- **handoff [Fanout]:** run N variants/configs in parallel; collect metrics.
- **verify [Tournament]:** rank variants by metric → winner; [Adversary] attacks the
  HARNESS, not the result (fair setup? measurement noise? overfit-to-bench? confound?).
- **persist:** `variants, metrics_table, harness_notes, winner, threats_to_validity`.

## Gate
Winner beats baseline on the metric ∧ harness validated ∧ result reproducible.

## Guardrails
`cap variants` · `max_iter <ask>` · `breaker 2`.

## Workflow shape
Phase 1: build-feature → baseline. Phase 2: `parallel(variants)` collect metrics →
tournament ranking → adversary agent (different model) audits the harness for
fairness/noise/overfit/confounds. Gate requires reproducibility.
