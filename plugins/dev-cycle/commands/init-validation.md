---
description: Scaffold a validation-provider skeleton for this project from stack detection (the E2E harness backend)
---

# /dev-cycle:init-validation

Generate a `<project>-validation` provider **skeleton** implementing the validation
contract (`${CLAUDE_PLUGIN_ROOT}/references/validation-contract.md`). You fill blanks —
you don't write from scratch.

## 1. Detect & pre-fill
From stack detection, pre-fill the verbs:
- `bring_up` → the dev-server / test-harness bring-up command; capture `health_url`,
  `frontend_url`, `base_url`.
- `drive_scenario` → Playwright (scripted) if present, else the agentic engine.
- `reset` → the project's clean target(s).

## 2. Auth strategy (from the general library)
Pick one and scaffold it: `storageState`, `jwt-inject`, `form-login`. Exotic auth
(crypto handshake, multi-node, funded state) → `custom-script` TODO where the bespoke
wrapper lives.

## 3. Emit the skeleton
Create a provider plugin dir (or a local `.dev-cycle/validation/` provider) with:
- an entrypoint responding to `bring_up|seed|auth_session|drive_scenario|assert|reset|teardown`,
- a sample `e2e/scenarios/smoke.yaml` (see `references/scenario-schema.md` and
  `${CLAUDE_PLUGIN_ROOT}/assets/smoke.example.yaml`),
- fill only the bespoke bits (seed, custom auth) — leave clear TODOs.

## 4. Wire config
Set `validation.provider` / `validation.driver` / `validation.scenarios_dir` in
`.dev-cycle/config.json`. No frontend → wire only API tiers (no browser driver).

## 5. Verify
`/dev-cycle:doctor` should now resolve the provider and drive the sample scenario green.
