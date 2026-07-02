# node-validation

Reference **dev-cycle validation provider** for the econ-v1 `node` repo. Implements the
validation contract (`dev-cycle/references/validation-contract.md`) by wrapping node's
existing `tests/e2e` primitives, and is the first real consumer of the general E2E
harness — proving the contract handles a hard stack (BIP39 auth, two nodes, funded
channels).

Entrypoint: `bin/node-validation <verb> …` (prints JSON on stdout). Resolve the repo via
`NODE_REPO` or by walking up from cwd for `Makefile` + `tests/e2e`.

## Contract → node mapping

| Verb | Wraps | Notes |
|---|---|---|
| `bring_up` | `make regtest-up` (persistent `bitcoind+alice+bob+channel`, LPS-**optional**) or `make dev-4nodes` (needs external LPS repo) | reads the harness `manifest.json` for the dynamically-allocated Bob API base; `--ui` also starts the Bob Vite FE |
| `seed` | `regtest-up` already funds one alice→bob channel + `start()` cross-seeds peer endpoints | extra seeding (friend handshake, bigger channel) is a documented TODO |
| `auth_session` | `AuthClient.onboard()` (BIP39 + OTS) via `helpers/agent-session.ts` | prints `{session, inject_target}`; `inject_target` is the **live FE origin** (:5173), not the harness SPA |
| `drive_scenario` | scripted → `yarn workspace @node/e2e-tests test:api\|test:ui` (Playwright); agentic → delegates to `e2e-agentic.js` | |
| `assert` | Playwright DOM/role + axe-core a11y (in `test:ui`); ai-judge via the agentic engine | |
| `reset` | `make dev-clean` + regtest teardown + clear `e2e-report/` (the audit's missing single `reset-e2e`) | |
| `teardown` | `make dev-down` + kill backgrounded cluster/FE pids | |
| `health` | `GET /api/auth/onboarding-status` (+ probes `/api/v2/runtimes`) | 200 or 401 = "up" |

## Ports (reconciled)

Bob **BE :3000 / FE :5173**, Alice BE :3001 / FE :5174, LPS :3010. The audit flagged that
several specs/docs default Bob to **:3002** (`E2E_BOB_BACKEND_URL`, `BOB_URL`) which is
stale vs `dev-4nodes`. Rather than editing many spec files, `bring_up` **exports the true
Bob origin** (`E2E_BOB_BACKEND_URL`/`BOB_URL`) — in regtest mode from the dynamic manifest,
in 4nodes mode `:3000` — so those env-overridable specs pick up the correct origin.

## Failure feed

On E2E failure the union feeds `e2e-report/ai-report.json` (written by node's
`ai-reporter.ts`) + the failing scenario + screenshots to `fix-bug.js`. The
`drive_scenario` pass/fail is also the measurement signal for `speckit-implement.js`.

## ⚠️ Needs live verification

These are wired against the current `tests/e2e` API but were **not executed live** (no
LPS/regtest/browser stack available in the authoring session):

1. `bring_up` regtest → `manifest.json` path (`tests/e2e/.regtest/manifest.json`) and the
   Bob FE proxy (`VITE_API_BASE_URL`) wiring for the agentic UI tier.
2. `auth_session` → `helpers/agent-session.ts` importing `AuthClient` from
   `tests/e2e/src/harness/auth.ts` and completing the BIP39+OTS onboarding.
3. `reset` composition on a real dirty state.
4. Confirm the exported `E2E_BOB_BACKEND_URL`/`BOB_URL` are honored by the friend-handshake
   / sweep specs.

Run `/dev-cycle:doctor` in the node repo (with this provider configured) to exercise
`bring_up` + `health` + a sample scenario once the stack is available.
