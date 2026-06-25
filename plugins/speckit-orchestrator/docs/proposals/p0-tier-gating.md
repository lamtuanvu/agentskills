# Proposal: gate speckit-orchestrator test-and-fix on P0 success-criterion coverage

**Origin:** DDP-470 retro, 2026-06-25 — see [issue #4](https://github.com/lamtuanvu/agentskills/issues/4)
**Target:** `speckit-orchestrator` plugin (currently 2.2.1) — `commands/execute.md` step 8
**Status:** proposed

## The bug

DDP-470's pipeline reached `current_step: "complete"` with `step_status.test-and-fix: "completed"` and verdict `PASS` while the headline P0 success criterion from `idea.md` — *"Clicking a PDF citation jumps the viewer to the correct page within 600ms"* — was demonstrably broken on the live web stack (verified by Chrome-MCP canary 2026-06-25: chunk has `position.page=4`, PDF viewer opened at page 1).

The pipeline's own `test-and-fix_summary` recorded the leak:

```json
"verdict": "PASS",
"tiers_run": {
  "typescript": "clean (exit 0)",
  "library-service-pytest": "1089 passed / 0 failed",
  "agent-server-pytest-targeted": "17 passed / 0 failed",
  "vitest": "515 pass / 593 fail (pre-existing)"
},
"tiers_deferred": [
  "Playwright E2E (no chromium binaries installed)",
  "Agentic harness (ANTHROPIC_API_KEY unset)",
  "Full agent-server pytest (container OOM)",
  "Full Django test run (pre-existing PYTHONPATH issue)"
]
```

The deferred tiers are *exactly* the ones whose tasks were authored to verify the P0 success criteria (T020 — `test click row with position threads pageTarget`; T021 — `test highlight overlay mounts inside page wrapper`; the agentic harness called for in `idea.md` Validation Strategy §3).

## Root cause in execute.md

`commands/execute.md:222-242` of the orchestrator skill:

```
3. Run integration tests: ... pytest tests/integration/
4. Run E2E tests: ... npx playwright test. If no E2E framework is configured,
   note it as "not configured" and skip.
5. Run agentic E2E validation (only if agentic_validation_enabled): ...
   If the scenarios file does not exist, warn and skip.
```

Three failure modes:

1. **Skip-with-warning is treated as benign.** A deferred tier produces zero failures, so the "if all pass → completed" rule on line 254 fires unconditionally.
2. **Deferrals aren't tied back to success criteria.** The orchestrator never reads `idea.md`'s `## Success Criteria` section to ask "which tier verifies this?". So it can't know that skipping Playwright leaves a P0 criterion unverified.
3. **The QA reviewer in the round-2 review verifies by reading code, not by running it.** `qa.md` says ✅ for fields declared, imports added, migration shapes. Those are necessary, not sufficient. The user-facing behavioural assertion never runs.

## Proposed change — three edits to `execute.md`

### Edit 1 — add an explicit success-criterion → tier mapping step before the test run

Insert after step 1 ("Detect test runner") in §"Test-and-Fix Step":

```
1a. Map idea.md Success Criteria → test tiers (REQUIRED, blocks if unmapped):
    - Read docs/features/<feature>/idea.md.
    - For each entry under `## Success Criteria` and `### Must Have (P0)`:
      - Identify which tier validates it. Conventions:
        - "Clicking X jumps the viewer to Y", "highlight overlay mounts on Z",
          "active row state updates" → Playwright E2E (tests/e2e/web/*.spec.ts)
        - "Backfill batch completes", "search returns position.page == N",
          "embedding FKs preserved" → integration tests + E2E backend
        - "Harness DOM-pass-rate ≥ 95%", "Judge-pass-rate ≥ 80%",
          "agent cites correct span" → agentic harness
        - "Column added", "field present", "API serializer fills X" → unit/typecheck
      - Record the mapping in state under `p0_tier_map: {criterion: tier}`.
    - If any P0 criterion cannot be mapped → STOP, ask user which tier should
      cover it. Do NOT silently classify as "no test needed".
```

### Edit 2 — replace "skip silently" with three verdicts

Replace step 6 ("Evaluate combined results") wholesale with:

```
6. Evaluate combined results across THREE possible verdicts:

   **PASS** — every tier in p0_tier_map ran AND produced zero
   feature-attributable failures.
     → Set "test-and-fix": "completed", verdict: "PASS",
       advance current_step.

   **CONDITIONAL_PASS** — every tier that DID run is clean, BUT one or more
   tiers in p0_tier_map are in tiers_deferred (chromium absent, API key
   unset, container OOM, etc.).
     → Set "test-and-fix": "completed_conditional", verdict: "CONDITIONAL_PASS",
       current_step: "test-and-fix-human-gate", display:

       ══════════════════════════════════════════════════════════════
       ⚠️  CONDITIONAL_PASS — P0 verification gap
       ══════════════════════════════════════════════════════════════
       The following P0 success criteria from idea.md are UNVERIFIED:
         - <criterion 1> (would be covered by <deferred tier>)
         - <criterion 2> (would be covered by <deferred tier>)

       Reason deferred: <reason from tiers_deferred>

       Options:
         (a) Resolve the blocker and re-run test-and-fix
             (e.g. `npx playwright install chromium`, set ANTHROPIC_API_KEY)
         (b) Acknowledge the gap as accepted-uncovered risk and proceed.
             Pipeline status becomes complete-pending-verification.
         (c) Open follow-up ticket(s) for the deferred verification and proceed.

       Reply with (a), (b), or (c) to continue.
       ══════════════════════════════════════════════════════════════

       Then STOP. Do NOT advance current_step. The stop hook MUST treat this
       as a human-in-the-loop pause (same semantics as `clarify`).

   **FAIL** — any tier that ran produced feature-attributable failures.
     → Existing failure-fix loop applies (lines 258-283 of execute.md unchanged).

   Note: a deferred tier whose criterion is P1-only is fine — only deferred
   tiers that map to P0 criteria trigger CONDITIONAL_PASS.
```

### Edit 3 — update the test report template

The report at `specs/<feature>/reports/test-report.md` should grow a new
top-level section before "## Summary":

```
## P0 Success-Criterion Coverage

| Criterion (from idea.md) | Verifying tier | Tier status | Verified? |
|---|---|---|---|
| Clicking PDF citation jumps to position.page | Playwright E2E | deferred | ❌ |
| Highlight overlay mounts on cited line bbox | Playwright E2E | deferred | ❌ |
| Agentic DOM-pass-rate ≥ 95% | Agentic harness | deferred | ❌ |
| ... | ... | ... | ... |

**P0 coverage**: 0 of N criteria verified → verdict downgraded to
CONDITIONAL_PASS.
```

This makes the gap legible in the report itself, not buried in a state-file
field.

## Why this stops the next leak

- A pipeline that defers Playwright cannot reach `complete` silently anymore.
  The state file pauses at `test-and-fix-human-gate` and the stop hook is
  obligated to wait for user input (same wiring as the clarify step).
- The QA reviewer's code-read-only verification stays useful for catching
  cross-group integration gaps (that's what it's good at), but it no longer
  acts as a behavioural-correctness signal. Behavioural correctness now
  requires the mapped tier to have run.
- Follow-up tickets for accepted-uncovered risk become first-class citizens
  of the orchestrator state (current_step `complete-pending-verification`
  is queryable, greppable, dashboardable).

## Backward compatibility

- Pipelines without a `## Success Criteria` section in idea.md → orchestrator
  prompts user to enumerate the P0 criteria once, then proceeds normally.
  Old completed pipelines aren't re-graded.
- Pipelines where all tiers run cleanly → no behaviour change, verdict is
  PASS as today.
- The state schema additions (`p0_tier_map`, `verdict`) are additive; old
  state files load fine.

## Open question for the orchestrator maintainer

The current `cancel-pipeline` skill lets the user pause the pipeline so the
stop hook allows exit. We should consider whether `complete-pending-verification`
should be reachable as a terminal state OR whether the user must always
choose (a), (b), or (c). Recommendation: terminal state allowed, but only
when the user actively chose (b) — defaulting to (b) on no-reply is wrong
(that's exactly the leak we're closing).

## Worked example — DDP-470 re-grade under the new rule

A real pipeline run (DDP-470, "interactive citation preview" — an Electron + web-stack feature) leaked through `test-and-fix` to `complete` with `verdict: PASS` while its headline P0 was demonstrably broken. If this proposal had been live when that pipeline reached test-and-fix:

- p0_tier_map would include: "PDF page-jump" → Playwright E2E,
  "highlight overlay" → Playwright E2E, "agentic harness ≥95% DOM
  pass-rate" → agentic harness.
- tiers_deferred = {Playwright, agentic} both intersect p0_tier_map.
- verdict would be CONDITIONAL_PASS.
- pipeline would have paused at test-and-fix-human-gate, surfacing the
  three unverified P0 criteria by name.
- the live canary I ran today on 2026-06-25 (chunk page=4, viewer opened
  at page 1) would have been the resolution path for option (a) —
  resolve and re-run.

The pipeline status would correctly read "complete-pending-verification"
or be paused on a human gate — not "complete".
