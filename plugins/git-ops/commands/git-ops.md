---
description: Scaffold or inspect the git-ops SCM + tracker adapter (.dev-cycle/config.json)
---

# /git-ops

Manage the git-ops adapter for the current repo. git-ops is the swappable SCM +
issue-tracker layer the dev-cycle union calls at each pipeline boundary via
`git-ops on <event> --json '<payload>'`.

The entrypoint is `${CLAUDE_PLUGIN_ROOT}/bin/git-ops`.

## What to do

Read the argument after `/git-ops`:

- **`init`** (default when no arg) — scaffold `.dev-cycle/config.json`:
  1. Run `${CLAUDE_PLUGIN_ROOT}/bin/git-ops init` (writes a template config), OR write it
     directly by copying `${CLAUDE_PLUGIN_ROOT}/providers/github/config.example.json`.
  2. Detect the GitHub remote (`gh repo view --json owner,name`) and fill
     `tracker.owner` / `tracker.repo`.
  3. Ask the user for the **ProjectV2 board number** (`gh project list --owner <owner>`),
     the branch prefix (default `NNN-kebab`), and the commit convention (default
     `conventional`). Do NOT guess the project number — it must be confirmed.
  4. Validate against `${CLAUDE_PLUGIN_ROOT}/providers/github/config.schema.json`.

- **`doctor`** — run `${CLAUDE_PLUGIN_ROOT}/bin/git-ops doctor`: checks gh/jq/git,
  that the config resolves, and that a **dry-run reconcile** works (mutates nothing).

- **`status <slug>`** — run `${CLAUDE_PLUGIN_ROOT}/bin/git-ops status <slug>` to list a
  feature's issues.

- **event names** — show the 9 lifecycle events (see the plugin README) and remind the
  user the union fires them; you rarely call `on <event>` by hand except to test.

## Guardrails

- The GitHub provider is **config-only** — no code to write for a GitHub project.
- To test safely, prefix any `on <event>` call with `DEV_CYCLE_DRYRUN=1`.
- Never hand-write `gh`/GraphQL for lifecycle ops — always go through `git-ops`.
