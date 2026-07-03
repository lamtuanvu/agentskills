---
description: Show the current dev-cycle state for a feature (pipeline cursor + tracker projection)
argument-hint: "<slug>"
---

# /dev-cycle:status

For the feature in `$ARGUMENTS` (or infer from the current git branch):

1. Read the SpecKit cursor from `docs/features/<feature>/orchestrator-state.json` (or the
   speckit state path) — current step, opted-in loops, `needs_resolve`/blocked flags.
2. Show the tracker projection: `${git-ops}/bin/git-ops status <slug>`.
3. Summarize: what step we're on, what's opted-in, what's blocking (if anything), and the
   next action. Do not mutate anything.
