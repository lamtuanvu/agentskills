# Loop state — <slug> · <short task name>

> Source of truth. Re-read this file at the start of every turn. Update it at the
> end of every turn. The agent forgets; this file does not.

## Meta
- pattern: <slug> (was T<n>)
- created: <date>
- status: RUNNING | STUCK | DONE
- iteration: 0

## Goal
<the pattern's goal, specialized to this task>

## Gate (hard + measurable — "done" = this passes)
- [ ] <measurable condition 1>
- [ ] <measurable condition 2>

## Guardrails
- max_iterations: <n>
- circuit_breaker: <N>   # N same-reason failures → STUCK → human
- other: <severity_floor / cap candidates / recency window …>

## Persist (pattern-specific keys — fill each turn)
<copy the `persist:` keys from references/<slug>.md and keep them current>

## Turn log
| iter | discovery | handoff result | verify verdict | gate | next |
|---|---|---|---|---|---|

## Open items / known-unknowns
-

## STUCK reason (only if status = STUCK)
-
