# fix-bug — T7 · Bug Fix (Gen-hypotheses → Adversary(falsify) ‖root-cause gate‖ → Adversary(verify) → Loop)

**Use when:** fix a bug, find the root cause, debug a failure/crash, "it's broken /
intermittent / regressed".

**Goal:** bug closed at ROOT CAUSE; repro + regression green; no symptom patch, no
new high/critical.

## Moves
- **discovery:** reproduce + collect evidence (data, code, log); generate ≥2 root-cause
  hypotheses (anti-anchor — don't fixate on the first).
- **handoff(diagnose) [Gen+Filter]:** falsify each hypothesis against evidence; keep
  the one that survives.
- **verify1 [root-cause GATE]:** an independent reviewer tries to DISPROVE the cause.
  PASS only when evidence from ≥2 of {data,code,log} converges ∧ a repro test FAILS for
  the PREDICTED reason. **>>> No plan/fix may be written until this gate PASSES.**
- **handoff(fix):** write repro (red first; e2e if possible) → plan → execute the fix
  against the proven cause.
- **verify2 [Adversary]:** repro → green ∧ full regression → green ∧ `bug-hunter`
  confirms the fix hits root cause (not symptom) ∧ introduces no new sev≥HIGH.
- **persist:** `hypotheses(survived|ruled-out+why), evidence, repro_status,
  regression_status, fix_attempts, report`.
- **schedule [Loop]:** cause-gate FAIL → discovery with the ruled-out list; verify2 FAIL
  → back to fix. PASS → report (root cause, fix, evidence, tests).

## Gate
Root-cause proven ∧ all repro green ∧ regression green ∧ no symptom-only fix ∧ 0 new sev≥HIGH.

## Rules
Never weaken/delete a repro to pass · never patch the symptom · evaluator ≠ debugger/fixer.

## Guardrails
`max_iter <ask>` · `breaker 3` (same bug, 3 failed fixes → STUCK + escalate) · `severity_floor HIGH`.

## Workflow shape
Phase A: reproduce + `parallel(≥2 hypotheses → falsify)`. Barrier at the root-cause
gate — an independent verifier (different model) must fail to disprove the cause AND a
repro test must fail for the predicted reason before any fix. Phase B: repro-first fix
→ verify2 = parallel(regression, bug-hunter). Loop back on either gate failing.
