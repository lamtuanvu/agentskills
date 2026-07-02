# review-code — T11 · Code Review (post-feature) (Adversary(reflect) ‖gate‖ → Fanout(review lenses) → Adversary(synthesize) → Loop)

**Use when:** review a finished feature diff/PR, "is this change good", code review
before merge.

**Input:** the feature diff/PR · its intent/goal/AC · (optional) surrounding context.

**Goal:** a review verdict — does it do the RIGHT thing (intent) AND the thing RIGHT
(quality); findings by severity + must-fix.

## PHASE 1 — REFLECT (do the right thing / validation)
- **reflect:** meets intent/AC? solves the REAL problem not a symptom? approach sound?
  simpler path exists? scope right (no creep/gap)?
- **reflect-gate `‖`:** PASS only if approach validated ∧ meets intent. FAIL → stop +
  send back (don't line-review a wrong approach).

## PHASE 2 — REVIEW (do the thing right / verification) [Fanout lenses, only after reflect PASS]
- **lenses (1 reviewer each):** correctness/edge-cases · security · performance ·
  error-handling · tests-actually-test-behavior · readability/maintainability ·
  regressions/blast-radius. Assume issues exist; tag severity; cite location + a
  concrete fix.
- **synthesize → dedup → severity-ranked findings.**
- **persist:** `reflect_verdict, findings[{lens,severity,loc,fix}], must_fix,
  nice_to_have, test_assessment, adr`.
- **schedule [Loop]:** blocking findings → author/fix → re-review changed parts; stop =
  reflect PASS ∧ no blocking findings.

## Gate
Reflect PASS ∧ 0 blocking (correctness|security ≥HIGH) ∧ tests adequate for the change
∧ no unreviewed blast-radius.

## Rules
Reviewer ≠ author · no rubber-stamp (zero findings on a non-trivial change → review
deeper) · never downgrade severity to pass.

## Guardrails
`max_iter <ask>` · `breaker 2` · `severity_floor HIGH`.

## Workflow shape
Phase 1: reflect agent (different model than author) → barrier at reflect-gate; a
wrong-approach FAIL stops the review. Phase 2: `parallel(lenses → 1 reviewer each)`,
assume-issues, tag severity + location + fix → synthesize + dedup (barrier) →
severity-ranked findings. Loop on blocking findings until reflect PASS ∧ none blocking.
