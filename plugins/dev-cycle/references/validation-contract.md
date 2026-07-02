# Validation contract

The dev-cycle union calls a **validation provider** through this contract to bring up
the real app and drive it. A provider is a plugin selected by
`.dev-cycle/config.json → validation.provider`. **No provider → the union skips the
E2E tiers gracefully** (like git-ops pure mode). The general, browser-driving engine
(`workflows/e2e-agentic.js`) and the scenario schema are project-agnostic and live in
this plugin; the provider supplies only the project-specific bring-up/seed/auth/reset.

## Verbs

A provider exposes an entrypoint (`bin/<provider>` or documented commands) responding to:

| Verb | Purpose | Returns |
|---|---|---|
| `bring_up` | Start the full stack (services, DB, dependencies) needed for E2E. Idempotent — reuse a running stack. | `{ base_url, frontend_url, health_url, ready: bool }` |
| `seed` | Load fixtures / create the world state a scenario needs (users, data, peers, funded channels…). | `{ seeded: bool, refs? }` |
| `auth_session` | Produce a pre-authenticated session and make it injectable into the live frontend origin (cookie/localStorage/JWT). | `{ session, inject_target }` |
| `drive_scenario` | Run one scenario. Scripted tiers delegate to the provider (e.g. Playwright); the **agentic** tier calls `e2e-agentic.js` instead. | `{ pass, evidence }` |
| `assert` | Non-visual assertions (DOM/role, a11y/axe, API shape). | `{ pass, failures[] }` |
| `reset` | Restore a clean state between runs (DB clean + service reset). | `{ ok: bool }` |
| `teardown` | Stop the stack. | `{ ok: bool }` |

## Tier ladder (union-owned)

1. **unit** — the project's unit runner (`cargo test` / `vitest` / …).
2. **API E2E** — provider `drive_scenario` (API-level) / `assert`.
3. **UI E2E scripted** — provider `drive_scenario` via Playwright.
4. **agentic human-mimic** — `e2e-agentic.js` with `driver` + `base_url` (from
   `bring_up`) + `session` (from `auth_session`) + scenarios. ai-judge screenshot
   assertions.

On failure → feed the provider's failure feed (e.g. an `ai-report.json`) + the failing
scenario + screenshots to `fix-bug.js` (if pre-authorized). The `drive_scenario`
pass/fail is ALSO the **measurement signal** consumed by `speckit-implement.js`'s gate.

## Discovery

The union reads `validation.provider` from `.dev-cycle/config.json`, resolves the
provider plugin via `${CLAUDE_PLUGIN_ROOT}`, and calls the verbs. `validation.driver`
(chrome | preview | playwright) picks the browser driver for the agentic tier;
`validation.scenarios_dir` is where declarative scenarios live.

## Authoring a provider

Implement the verbs for your stack. Most map to existing test infra: `bring_up` wraps
your dev-server / test-harness bring-up; `seed` your fixtures; `auth_session` your login
(pick a strategy from the library — `storageState` / `jwt-inject` / `form-login`, or a
`custom-script` for exotic auth); `drive_scenario` delegates to Playwright (scripted) or
`e2e-agentic.js` (agentic); `reset` composes your clean targets. Providers with exotic
auth or multi-service topologies wrap that bespoke bring-up/seed/auth behind the same
seven verbs, so the general engine stays stack-agnostic.
