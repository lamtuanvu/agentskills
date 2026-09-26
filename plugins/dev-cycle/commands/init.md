---
description: Onboard the current repo to dev-cycle — check governance, propose the git-ops block, detect the stack, write .dev-cycle/config.json
---

# /dev-cycle:init

Onboarding wizard. Get this repo ready to run features through the union. Do these in
order, confirming with the user at each decision (do not guess the tracker board number).

## 1. Preconditions
- Verify co-installs: `project-governance` and `loop-templates` plugins present.
- Verify project governance exists (constitution + context index, discovered via the
  agent instructions' context section or `.project/`). If missing, run
  `/project-governance:init` first — dev-cycle never drafts governance itself.
  Record the resolved paths in `governance` in the config below.
- Confirm this is a git repo (`git rev-parse`). If not, offer `git init`.

## 2. git-ops block (config-only for GitHub)
- Read the git remote: `gh repo view --json owner,name` (or `git remote -v`).
- **GitHub remote → built-in `github` provider, no code.** Confirm with the user:
  `tracker.owner`, `tracker.repo`, the **ProjectV2 board number** (list with
  `gh project list --owner <owner>` — the user MUST confirm), `scm.branch_prefix`
  (default `NNN-kebab`), `scm.commit_convention` (default `conventional`).
- **Non-GitHub → scaffold a provider stub** under the git-ops plugin's `providers/<name>/`
  with the ~9 event handlers as TODOs (see git-ops README "authoring an alternate
  provider").

## 3. Detect the stack
- Identify test runners (`cargo`, `vitest`, `jest`, `pytest`…), dev-server command, and
  whether there is a frontend (for the validation block). Note the frontend URL/port.

## 4. Write .dev-cycle/config.json
- Compose `tracker` + `scm` + `artifacts_dir` (default `docs/features`) + `governance`
  + `validation` + `loops_default`. Use
  `${CLAUDE_PLUGIN_ROOT}/schemas/config.example.json` as the template and
  `schemas/config.schema.json` to validate. Leave `validation.provider` empty for now
  (fill via `/dev-cycle:init-validation`) unless a provider already exists.
- `loops_default`: propose based on stakes — fast repo → `[]`; high-stakes →
  all generative loops. The kickoff prompt still wins at runtime.

## 5. Verify
- Run `${git-ops}/bin/git-ops doctor` (resolves config, dry-run reconcile).
- Then point the user at `/dev-cycle:init-validation` (scaffold the E2E provider) and
  `/dev-cycle:doctor` (full readiness check).
