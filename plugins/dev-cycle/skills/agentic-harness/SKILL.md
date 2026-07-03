---
name: agentic-harness
description: >
  Automatically build a comprehensive, self-tested agentic validation harness that lets
  an agent fully control a project's stack (lifecycle, data, auth, agentic UI, observability,
  fault injection) and validate features by mimicking human actions. Use when the user says
  "build a validation harness", "set up agentic validation", "let the agent drive/validate
  the app", or runs /dev-cycle:init-validation. Supersedes the hand-filled provider skeleton:
  it detects the stack, writes .dev-cycle/harness.json, and proves it green.
---

# Agentic harness builder

Build a working harness for the generic runner (`${CLAUDE_PLUGIN_ROOT}/bin/harness`) so an
agent can fully control the stack and run fully-agentic, human-mimicking validation. The
artifact is a declarative `.dev-cycle/harness.json` the runner executes — no bespoke
provider code.

## Autonomy boundary (do not violate)

- **Autonomous in the middle:** detection, drafting, and the non-destructive self-verify
  loop run without asking.
- **GATE at the edges (always stop for the human):**
  1. after detection, before writing anything — confirm the stack + plan;
  2. before running any destructive/outbound verb — a `reset` with `destructive:true`, or
     any `inject_fault`.
- Never pass `--confirm` to the runner without a preceding human approval for that action.

## Procedure

1. **Detect + draft.** Run the compute Workflow:
   `Workflow({ scriptPath: "<loop-templates>/workflows/build-harness.js", args: { repo_path: "<repo>", hint } })`.
   It returns `{ stack_profile, manifest, smoke_scenario, risks, destructive_ops }`.

2. **GATE — plan approval.** Present the detected stack, the proposed `harness.json`, and the
   flagged `destructive_ops`/`risks` via `AskUserQuestion`. If detection was ambiguous
   (multiple candidate commands, unknown auth), ask the user to choose — never guess.

3. **Write artifacts.** Write `.dev-cycle/harness.json` (validate against
   `${CLAUDE_PLUGIN_ROOT}/schemas/harness.schema.json`), the smoke scenario into
   `scenarios_dir`, and stub any `custom-script` hooks under `.dev-cycle/hooks/`.

4. **Self-verify loop (non-destructive, autonomous, bounded).** Run, in order:
   `bin/harness bring_up` → `health` → `seed` → `auth_session` →
   `drive_scenario --tier agentic` (take its delegate args and run
   `<dev-cycle>/workflows/e2e-agentic.js`) → `observe`. If any step fails: read the
   evidence (`observe` output, logs, ai-judge failures), PATCH the manifest/hook, and
   retry. Bound to a few rounds with a circuit breaker (same failure twice → stop and
   report). Do NOT run `reset --confirm` or `inject_fault` here.

5. **GATE — destructive verbs.** If the user approved exercising them, run
   `reset --confirm` and each `inject_fault --name … --confirm` (+ `--restore`), verifying
   the stack recovers. Otherwise skip and note them as unverified.

6. **Finalize.** Set `validation.provider: "generic"` and
   `validation.manifest: ".dev-cycle/harness.json"` in `.dev-cycle/config.json`. Run
   `teardown`. Print a readiness checklist (which verbs verified, which gated/unverified,
   the smoke result). Get human sign-off.

## Notes

- Only a **smoke** scenario is generated. Per-feature scenarios are authored during a
  dev-cycle run, not here.
- No frontend detected → the agentic UI tier degrades to API/scripted tiers; record it,
  don't silently skip.
- Keep everything generic — the manifest holds all project specifics; the runner and this
  skill stay project-agnostic.
