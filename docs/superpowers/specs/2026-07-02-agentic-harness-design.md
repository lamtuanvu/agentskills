# Design: `agentic-harness` — auto-build a comprehensive agentic validation harness

**Date:** 2026-07-02
**Status:** Approved (brainstorm)
**Repo:** claude-code-marketplace (public — keep everything generic; no project-specific names)

## Problem

The `dev-cycle` plugin ships a validation *contract* and an agentic browser engine
(`e2e-agentic.js`), plus a `/dev-cycle:init-validation` command that scaffolds a
provider **skeleton with TODOs** the user fills by hand. We want a skill that
**automatically creates a comprehensive, working harness** giving an agent full control
of the stack for **fully agentic validation** (mimicking human actions) of a product's
features — with far less hand-filling, and self-tested.

## Decisions (locked in brainstorm)

1. **Supersede `init-validation`.** The new skill auto-generates a working, comprehensive
   harness (all verbs real, not stubbed) and self-tests it. Reuses the existing contract
   + `e2e-agentic` engine. `/dev-cycle:init-validation` is rewired to invoke it.
2. **Control surfaces (all in scope):** lifecycle + health; data + auth + reset; agentic
   UI drive + ai-judge; **observability + fault injection** (extends the base contract).
3. **Autonomy:** auto-generate + self-verify, **gate at the edges** — confirm the detected
   stack/plan before generating; stop before any destructive/outbound action (data-wiping
   `reset`, `inject_fault`). Autonomous in the middle. (Honors the standing
   human-in-the-loop rule.)
4. **Architecture: Hybrid C+B** — a generic manifest-driven runner is the artifact (C); a
   dynamic Workflow does the heavy detect/draft compute (B); the skill owns the gates.
5. **Name:** `agentic-harness`.

## Architecture

Three cooperating pieces across the existing plugins:

### A. Generic harness runner — `dev-cycle/bin/harness`
One universal, config-driven executable implementing the **extended contract**:
`bring_up · health · seed · auth_session · drive_scenario · assert · observe ·
inject_fault · reset · teardown`. Each verb executes commands declared in the manifest,
or a named `custom-script` hook. `drive_scenario --tier agentic` delegates to
`e2e-agentic.js`; `--tier api|ui` runs the manifest's scripted test commands. Prints JSON
on stdout, logs to stderr. This IS the config-driven validation provider — selected via
`validation.provider: "generic"` — so the only per-project artifact is the manifest
(+ optional hooks). No bespoke provider code is generated.

### B. `build-harness.js` Workflow — `loop-templates/workflows/`
Pure compute, no gating. Shape:
- **Detect** (parallel): services & run commands; frontend framework + port; DB; auth
  mechanism; health endpoint; test runners; reset/clean targets; observability sources.
- **Synthesize** a `stack_profile`.
- **Draft** the `harness.json` manifest + a `smoke` scenario.
- **Critic** (adversarial): missing verbs, fragile/ambiguous commands, and which ops are
  **destructive or outbound** (flagged for the skill to gate).
- **Returns:** `{ stack_profile, manifest, smoke_scenario, risks, destructive_ops[] }`.

Reason it does not gate: Workflows can't pause for `AskUserQuestion`; the skill gates.

### C. `agentic-harness` skill — `dev-cycle/skills/agentic-harness/SKILL.md`
The conductor. Flow:
1. Invoke `build-harness` (detect + draft).
2. **GATE (edge):** present `stack_profile` + proposed manifest + flagged
   `destructive_ops` → `AskUserQuestion` approval **before writing anything**.
3. Write `.dev-cycle/harness.json` + the smoke scenario + hook stubs under
   `.dev-cycle/hooks/`.
4. **Self-verify loop (autonomous middle):** run
   `bring_up → health → auth_session → drive smoke (runner + e2e-agentic) → observe`.
   On failure, read captured evidence, patch the manifest/hook, retry — bounded +
   circuit-breaker. **Non-destructive verbs only.**
5. **GATE (edge):** before exercising `reset` (data-wiping) or `inject_fault`, stop for
   approval; then verify those too.
6. **Finalize:** set `validation.provider: "generic"` + `validation.manifest` in
   `.dev-cycle/config.json`; print a readiness checklist; human sign-off.

## The manifest — `.dev-cycle/harness.json`

Declarative description the runner executes. Schema shipped at
`dev-cycle/schemas/harness.schema.json`. Fields (illustrative):

```json
{
  "services": [
    { "name": "backend", "up": "make dev", "down": "make dev-down", "health": "http://127.0.0.1:8080/health" }
  ],
  "frontend_url": "http://127.0.0.1:5173",
  "auth": { "strategy": "form-login | jwt-inject | storageState | custom-script", "hook": "auth" },
  "seed": { "cmd": "npm run seed" },
  "reset": { "targets": ["./.data"], "cmd": null, "destructive": true },
  "observe": { "logs": ["logs/*.log"], "console": true, "network": true, "metrics": ["http://127.0.0.1:8080/metrics"] },
  "faults": [ { "name": "kill-backend", "inject": "…", "restore": "…" } ],
  "scenarios_dir": "e2e/scenarios",
  "driver": "chrome | preview | playwright"
}
```

The bespoke ~10% (exotic auth, custom seed) lives in named hooks under `.dev-cycle/hooks/`
referenced by `strategy: "custom-script"` / `hook: "<name>"`.

## Contract extension

`dev-cycle/references/validation-contract.md` gains two **optional** verbs:
- `observe` — capture logs/console/network/metrics into an evidence dir; returns paths.
- `inject_fault --name <n>` / `--restore` — apply/undo a declared fault (kill service,
  drop network, skew time) to validate resilience.

Base providers may ignore these; the generic runner implements them from the manifest.

## Isolation / boundaries

- **Runner** knows only the manifest + the contract; no project knowledge. Testable by
  handing it a manifest.
- **Workflow** is stateless compute: stack in → draft out. Testable with a fixture repo.
- **Skill** owns orchestration + gates + the self-verify loop; depends on the runner and
  the Workflow through their documented I/O only.

## Error handling

- Detection ambiguity (e.g., multiple dev commands) → surfaced in the plan gate for the
  user to pick, never guessed silently.
- Self-verify failure → bounded retry with evidence fed back; circuit-breaker on a
  repeated same-reason failure → stop and report (do not loop forever).
- Missing browser driver / no frontend → agentic UI tier degrades to API-only; recorded,
  not silently skipped.
- Destructive/outbound verbs never run before their edge gate.

## Testing (of this feature)

1. Dogfood on a throwaway trivial app (static HTTP server) → confirm
   detect → manifest → self-verify goes green end to end.
2. Syntax-check the runner (`bash -n`) and `build-harness.js` (harness-wrapped module).
3. Validate a generated manifest against `harness.schema.json`.
4. Confirm `/dev-cycle:init-validation` invokes the skill and `/dev-cycle:doctor`
   validates the generated harness.
5. Confirm both edge-gates fire and the self-verify middle runs unattended.

## Affected components

- `dev-cycle`: new `bin/harness`, `schemas/harness.schema.json`,
  `skills/agentic-harness/SKILL.md`, contract extension, rewired
  `commands/init-validation.md`. Version bump.
- `loop-templates`: new `workflows/build-harness.js`. Version bump.
- `marketplace.json`: version bumps only (no new plugins).

## Out of scope

- Providers for non-web native surfaces beyond the driver abstraction's existing note.
- Auto-authoring full feature scenario suites (only a smoke scenario is generated; feature
  scenarios are authored per feature during the dev-cycle run).
- Replacing project-specific providers that already exist (they keep working via the
  contract; the generic runner is the default when none is present).
