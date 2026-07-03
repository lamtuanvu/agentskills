---
description: Scaffold a validation-provider skeleton for this project from stack detection (the E2E harness backend)
---

# /dev-cycle:init-validation

Build a comprehensive, self-tested agentic validation harness for this repo.

**Invoke the `agentic-harness` skill and follow it exactly.** It detects the stack,
writes `.dev-cycle/harness.json` for the generic runner (`${CLAUDE_PLUGIN_ROOT}/bin/harness`),
self-verifies the non-destructive verbs, gates destructive ones, and wires
`validation.provider: "generic"` into `.dev-cycle/config.json`.

If a project already ships a bespoke validation provider, keep it (set
`validation.provider` to that provider instead); the generic runner is the default when
none exists.
