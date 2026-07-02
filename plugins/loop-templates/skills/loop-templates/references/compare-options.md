# compare-options — T9 · Market / Competitive Research (Classify(rubric) → Fanout(per candidate) → Adversary(de-bias) → Tournament(compare) → Loop)

**Use when:** compare tools/products/libraries/repos, competitive analysis, "which
should we pick", evaluate options against our stack.

**Inputs:** `goal/task · candidates[company|product|github] ·` (optional)
`our_context{codebase|docs|pipeline}`.

**Goal:** per candidate — what they do re: the goal + pros + cons, all sourced; a
NORMALIZED comparison across candidates; (if our_context) candidate-vs-our-stack delta
+ a recommendation.

## Moves
- **discovery [Classify]:** derive the COMPARISON RUBRIC from the goal FIRST (the axes
  every candidate is scored on), fixed before research → apples-to-apples, not
  cherry-picked per candidate.
- **handoff [Fanout]:** 1 candidate → 1 researcher (isolated; avoid halo /
  cross-contamination). Fill the rubric with EVIDENCE (paraphrased + cited, never
  pasted); tag each claim `official | vendor-marketing | third-party | unknown` + as-of date.
- **verify [Adversary de-bias]:** red-team each card — is a "pro" just marketing? is a
  "con" competitor FUD? is it STALE (product moved on)? `vendor-claim ≠ verified
  capability`; `popularity ≠ quality`. Reject any contested claim resting only on the
  vendor's own page.
- **synthesize [Tournament]:** pairwise-compare candidates per rubric axis →
  strengths/gaps matrix. If our_context given: score OUR stack on the SAME rubric →
  delta (what we'd gain/lose vs each) + gaps.
- **persist:** `rubric, candidate_cards[{claim,source,tag,asof}], comparison_matrix,
  our_stack_delta?, open_unknowns, adr`.
- **schedule [Loop]:** RETRY → re-research weak/contested cells; stop = saturation
  (no new material differentiator).

## Gate
Every candidate covered on every rubric axis w/ sources ∧ claims tagged ∧ contested
claims independently verified (not vendor-only) ∧ comparison normalized ∧ (if context)
our-delta explicit ∧ recommendation has an ADR.

## Guardrails
`max_iter 3` · `breaker 2` · recency: search current, flag anything older than `<window>`.

## Workflow shape
Fix the rubric first (barrier). `pipeline(candidates, researcher{isolated}, de-bias
adversary)` — each card filled + red-teamed by a different model. Tournament pairwise
comparison on rubric axes; if our_context, score our stack on the same rubric. Loop on
contested cells until saturation.
