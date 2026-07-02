# cited-research — T1 · Research (Fanout → Adversary → Loop)

**Use when:** research a topic, fact-check, find what's actually true, gather
sources, "what do we know about X".

**Goal:** cited claims that survive adversarial review; output = claims +
confidence + known-unknowns.

## Moves
- **discovery:** decompose the question → sub-questions. On later turns, discovery =
  "the claim the red-team just broke".
- **handoff [Fanout]:** 1 sub-question → 1 researcher; each returns a claim WITH its
  source; no memory-only claims.
- **verify [Adversary]:** red-team assumes the claim is false, hunts counter-evidence,
  echoes/checks sources, watches for led-by-framing → gate.
- **persist:** `verified_claims, open_qs, dead_ends, red_team_log, sources(primary|echo)`.
- **schedule [Loop]:** RETRY → discovery seeded with `red_team_log`; PASS → emit.
  Stop = saturation (no new counter-evidence).

## Gate
Each key claim has ≥2 INDEPENDENT sources (an echo ≠ an independent source) ∧ no new
counter-evidence found ∧ low-confidence items are explicitly listed.

## Guardrails
`max_iter 3` · `breaker 2`.

## Workflow shape
`pipeline(subQuestions, researcher, adversaryRefute)` — researcher fans out per
sub-Q (schema: claim+source), each claim adversarially verified as soon as it lands
by a refuter using a different model. Loop-until-dry on new counter-evidence;
survivors with ≥2 independent sources pass the gate.
