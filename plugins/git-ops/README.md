# git-ops

A swappable **SCM + issue-tracker adapter** for the dev-cycle. The union projects
pipeline lifecycle events onto a project tracker and branch/commit/PR conventions
through **one entrypoint**:

```
git-ops on <event> --json '<payload>'
```

Unknown events are a **no-op** (forward-compatible). Every handler is an **idempotent
reconcile** — safe to re-run on stop-hook re-entry.

## Lifecycle events (the contract)

| Event | Payload | github-provider action |
|---|---|---|
| `feature.kickoff` | `{slug,title,target_date?}` | ensure parent issue + board Backlog; create/checkout branch |
| `spec.done` | `{slug,spec_path,summary_path?,start_date?}` | Status→In progress; set Start date; comment spec/summary |
| `plan.done` | `{slug,plan_path,reviews?}` | comment plan + reviewer verdicts |
| `tasks.done` | `{slug,tasks_path}` | sync checklist into parent body |
| `task.completed` | `{slug,task_id,task_desc}` | tick checklist item |
| `pr.opened` | `{slug,pr_number,branch}` | Status→In review (PR `Closes #parent`) |
| `review.done` | `{slug,verdict}` | comment verdict |
| `merged` | `{slug,pr_number}` | `reconcile`→Done (moves board AND closes) |
| `blocked` | `{slug,reason,step}` | add `blocked` label + comment; does NOT green the status |

### Preserved invariants
- `dc/<slug>` label + body-marker binding (`role=parent`, `task=<id>`).
- **Runtime ID discovery** — project/field/option IDs are queried live, never hardcoded.
- **Done auto-closes** — on this board Status→Done closes the issue, so never cycle to
  Done in a dry-run. `merged` explicitly reconciles Status (a PR `Closes #N` closes the
  issue but does not move the Project field, hence the explicit reconcile).

## Config

Resolved in order: (1) `.dev-cycle/config.json` at/above cwd; (2) env vars
(`DC_OWNER`/`DC_REPO`/`DC_PROJECT`/`DC_ASSIGNEE`, `DEV_CYCLE_DRYRUN`); (3) none → **pure
mode** (logs the intended projection, mutates nothing). See
`providers/github/config.schema.json` and `config.example.json`.

```json
{
  "provider": "github",
  "tracker": { "owner": "econ-v1", "repo": "node", "project": 9,
    "statuses": ["Backlog","Ready","In progress","In review","Done"], "done_autocloses": true },
  "scm": { "branch_prefix": "NNN-kebab", "commit_convention": "conventional", "pr_closes_parent": true }
}
```

## Commands

- `git-ops init` — scaffold `.dev-cycle/config.json`
- `git-ops doctor` — verify gh/jq/git + config + a dry-run reconcile
- `git-ops status <slug>` — list a feature's issues

Dry-run everything with `DEV_CYCLE_DRYRUN=1`.

## Authoring an alternate provider (gitlab / linear / jira)

Create `providers/<name>/tracker.sh` and `providers/<name>/scm.sh` responding to the
same subcommands the github provider does (`ensure`, `status`, `field`, `comment`,
`reconcile`, `tasks`, `check`, `label`, `show` for tracker; `branch`, `commit`, `pr`,
`merge` for scm). Set `"provider": "<name>"` in the config. `bin/git-ops` maps every
lifecycle event onto those subcommands, so a new provider needs no changes to the
dispatch layer — just implement the verbs.
